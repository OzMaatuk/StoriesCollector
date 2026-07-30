# main.py
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from concurrent.futures import ThreadPoolExecutor

import httpx
import psycopg2
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

load_dotenv()

# --- Logging setup -----------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("enrichment-service")
logger.info("Starting up with log level %s", LOG_LEVEL)

app = FastAPI()

# --- Middleware ----------------------------------------------------------
# ALLOWED_HOSTS: the hostname(s) your Cloudflare tunnel routes to this service
# (e.g. "enrichment.yourdomain.com"). Requests with any other Host header are
# rejected with a 400 before they even reach your routes. This is the actual
# "only accept traffic from my tunnel" control — set it via env var.
allowed_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
if allowed_hosts:
    logger.info("TrustedHostMiddleware enabled for hosts: %s", allowed_hosts)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
else:
    logger.warning(
        "ALLOWED_HOSTS is not set - TrustedHostMiddleware is disabled and any "
        "Host header will be accepted. Set ALLOWED_HOSTS to your tunnel hostname."
    )

# CORS only matters for browser-originated requests. If only your backend
# (server-to-server) calls this API through the tunnel, you can leave
# ALLOWED_ORIGINS unset and CORS middleware won't be added at all.
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if allowed_origins:
    logger.info("CORSMiddleware enabled for origins: %s", allowed_origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["POST", "GET"],
        allow_headers=["Authorization", "Content-Type"],
    )
else:
    logger.info("ALLOWED_ORIGINS not set - CORS middleware not added (no browser origins allowed)")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Debug-level request/response logging."""
    start = time.monotonic()
    logger.debug("--> %s %s from %s", request.method, request.url.path, request.client.host if request.client else "unknown")
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    logger.debug("<-- %s %s %s (%.1fms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


# Single worker keeps things simple/safe on a Jetson Nano (one LLM call at a time).
executor = ThreadPoolExecutor(max_workers=int(os.getenv("MAX_WORKERS", "1")))

# --- Retry configuration (mirrors previous TypeScript cold-start retry logic) ---
MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "60"))  # 60 * 5s = 5 minutes of cold-start wait
RETRY_DELAY_SECONDS = int(os.getenv("LLM_RETRY_DELAY_SECONDS", "5"))
RETRYABLE_STATUSES = {502, 503, 504, 524}

# The LLM call itself can legitimately take hours on constrained hardware.
LLM_REQUEST_TIMEOUT_SECONDS = float(os.getenv("LLM_REQUEST_TIMEOUT_SECONDS", str(24 * 60 * 60)))


class GenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    enrichment_id: Optional[str] = Field(default=None, alias="enrichmentId")
    story_id: str = Field(alias="storyId")
    provider_name: str = Field(
        default_factory=lambda: os.getenv("PROVIDER_NAME", "llama-cpp-local"),
        alias="providerName",
    )
    model_name: str = Field(
        default_factory=lambda: os.getenv("MODEL_NAME", "llama-3-8b-instruct"),
        alias="modelName",
    )
    prompt: str
    version: Optional[int] = None
    retry_count: int = Field(default=1, alias="retryCount")
    system_prompt: Optional[str] = Field(default=None, alias="systemPrompt")

    def to_llm_request(self) -> Dict[str, Any]:
        """Convert to LLM API request format."""
        messages = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        messages.append({"role": "user", "content": self.prompt})

        return {
            "model": self.model_name,
            "messages": messages,
            # "stop": ["</think>"],
            "max_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.9,
            "repeat_penalty": 1.12,
        }


class DatabaseService:
    """Handles database operations for enrichment records."""

    def __init__(self) -> None:
        self.db_url = os.getenv("DATABASE_URL", "").strip()
        if not self.db_url:
            logger.warning("DATABASE_URL not set - status updates will be skipped")

    def update_record(self, enrichment_id: str, updates: Dict[str, Any]) -> None:
        """Update a record in the generated_content table."""
        if not self.db_url or not updates:
            return

        conn = None
        try:
            logger.debug("Updating record %s with fields: %s", enrichment_id, list(updates.keys()))
            conn = psycopg2.connect(self.db_url)
            conn.autocommit = True
            with conn.cursor() as cur:
                set_clauses = [f'"{k}" = %s' for k in updates.keys()]
                values = list(updates.values())
                values.append(enrichment_id)
                query = f'UPDATE generated_content SET {", ".join(set_clauses)} WHERE id = %s'
                cur.execute(query, values)
            logger.info("Record %s updated -> status=%s", enrichment_id, updates.get("status"))
        except Exception:
            logger.exception("Database update failed for %s", enrichment_id)
        finally:
            if conn is not None:
                conn.close()


class LLMError(Exception):
    """Raised when the LLM backend returns a non-retryable error."""


class LLMClient:
    """Client for interacting with LLM API endpoints, with cold-start retry support."""

    def __init__(self) -> None:
        self.base_url = os.getenv("LLAMA_CPP_URL", "http://127.0.0.1:8080").rstrip("/")
        self.api_key = os.getenv("LLAMA_CPP_API_KEY", "").strip()
        self.timeout = LLM_REQUEST_TIMEOUT_SECONDS

    def _build_url(self) -> str:
        """Construct the full API endpoint URL."""
        if self.base_url.endswith("/v1/chat/completions") or self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/v1/chat/completions"

    def _build_headers(self) -> Dict[str, str]:
        """Build request headers including authentication if provided."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _extract_content(self, response_data: Any) -> str:
        """Extract generated content from LLM response."""
        if not isinstance(response_data, dict):
            return str(response_data)

        choices = response_data.get("choices", [])
        if choices and isinstance(choices, list):
            msg = choices[0].get("message", {})
            content = msg.get("content", "")
            if content:
                return content

        for key in ("content", "text", "response", "result"):
            value = response_data.get(key)
            if value:
                return str(value)

        return str(response_data)

    def generate_completion(self, request: GenerateRequest) -> str:
        """Generate a completion using the LLM API, retrying while the backend is cold-starting."""
        url = self._build_url()
        headers = self._build_headers()
        body = request.to_llm_request()

        logger.debug("Sending LLM request to %s (model=%s)", url, request.model_name)

        retry_count = 0
        while True:
            try:
                with httpx.Client(timeout=self.timeout) as http_client:
                    response = http_client.post(url, json=body, headers=headers)
                    response.raise_for_status()
                    logger.info("LLM request succeeded (model=%s)", request.model_name)
                    return self._extract_content(response.json())

            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status in RETRYABLE_STATUSES and retry_count < MAX_RETRIES:
                    retry_count += 1
                    logger.info(
                        "LLM not ready (%s), retrying (%s/%s)...",
                        status, retry_count, MAX_RETRIES,
                    )
                    time.sleep(RETRY_DELAY_SECONDS)
                    continue
                logger.error("LLM completion failed with status %s", status)
                raise LLMError(f"LLM Error {status}: {exc}") from exc

            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                if retry_count < MAX_RETRIES:
                    retry_count += 1
                    logger.info(
                        "LLM not ready (timeout/connection), retrying (%s/%s)...",
                        retry_count, MAX_RETRIES,
                    )
                    time.sleep(RETRY_DELAY_SECONDS)
                    continue
                logger.error("LLM completion failed: %s", exc)
                raise LLMError(f"LLM Error: {exc}") from exc


class EnrichmentService:
    """Service for managing enrichment generation."""

    def __init__(self) -> None:
        self.db_service = DatabaseService()
        self.llm_client = LLMClient()

    def _update_status(self, enrichment_id: str, status: str, **kwargs: Any) -> None:
        """Update enrichment status with timestamp."""
        updates = {
            "status": status,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            **kwargs,
        }
        self.db_service.update_record(enrichment_id, updates)

    def generate_enrichment(self, enrichment_id: str, request: GenerateRequest) -> None:
        """Generate enrichment content and update database."""
        logger.info("Enrichment %s started (storyId=%s)", enrichment_id, request.story_id)
        self._update_status(enrichment_id, "processing")

        try:
            generated_text = self.llm_client.generate_completion(request)
            logger.info("Enrichment %s completed (%d chars generated)", enrichment_id, len(generated_text))
            self._update_status(
                enrichment_id,
                "completed",
                generatedText=generated_text,
                errorMessage=None,
            )
        except Exception as exc:
            logger.exception("Enrichment %s failed", enrichment_id)
            self._update_status(
                enrichment_id,
                "failed",
                errorMessage=str(exc),
            )


# Initialize services
enrichment_service = EnrichmentService()


def verify_backend_secret(authorization: Optional[str] = Header(None)) -> None:
    """Verify the backend secret for API authentication."""
    secret = os.getenv("PYTHON_BACKEND_SECRET", "").strip()
    if not secret:
        logger.debug("PYTHON_BACKEND_SECRET not set - skipping auth check")
        return

    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("Rejected request: missing bearer token")
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization[len("Bearer "):]
    if token != secret:
        logger.warning("Rejected request: invalid bearer token")
        raise HTTPException(status_code=403, detail="Invalid bearer token")

    logger.debug("Bearer token verified")


@app.post("/api/generate", dependencies=[Depends(verify_backend_secret)])
@app.post("/generate", dependencies=[Depends(verify_backend_secret)])
async def generate_enrichment(payload: GenerateRequest) -> JSONResponse:
    """Generate enrichment asynchronously."""
    enrichment_id = payload.enrichment_id or str(uuid.uuid4())
    logger.info("Received generate request enrichment_id=%s storyId=%s", enrichment_id, payload.story_id)

    executor.submit(enrichment_service.generate_enrichment, enrichment_id, payload)

    return JSONResponse(
        status_code=200,
        content={"enrichment_id": enrichment_id, "status": "pending"},
    )


@app.get("/health")
async def health_check() -> JSONResponse:
    """Simple health check endpoint."""
    logger.debug("Health check hit")
    return JSONResponse(status_code=200, content={"status": "ok"})


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        log_level=LOG_LEVEL.lower(),
    )