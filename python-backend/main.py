import os
import uuid
from datetime import datetime, timezone
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

import httpx
import psycopg2
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=1)

def update_db(enrichment_id: str, updates: dict) -> None:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        return
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            set_clauses = [f'"{k}" = %s' for k in updates.keys()]
            values = list(updates.values())
            values.append(enrichment_id)
            query = f'UPDATE generated_content SET {", ".join(set_clauses)} WHERE id = %s'
            cur.execute(query, values)
        conn.close()
    except Exception:
        pass

class GenerateRequest(BaseModel):
    enrichmentId: Optional[str] = Field(default=None, alias="enrichment_id")
    enrichment_id: Optional[str] = None
    storyId: str
    providerName: str = "llama-cpp-local"
    modelName: str = "llama-3-8b-instruct"
    prompt: str
    version: Optional[int] = None
    retryCount: int = 1

    model_config = {
        "populate_by_name": True
    }

def run_heavy_llm(enrichment_id: str, request_data: dict) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    update_db(enrichment_id, {
        "status": "processing",
        "updatedAt": now_iso
    })

    try:
        raw_url = os.getenv("LLAMA_CPP_URL", "http://127.0.0.1:8080").rstrip("/")
        if raw_url.endswith("/v1/chat/completions") or raw_url.endswith("/chat/completions"):
            target_url = raw_url
        else:
            target_url = f"{raw_url}/v1/chat/completions"

        headers = {"Content-Type": "application/json"}
        api_key = os.getenv("LLAMA_CPP_API_KEY", "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        body = {
            "model": request_data.get("modelName", "llama-3-8b-instruct"),
            "messages": [
                {"role": "user", "content": request_data.get("prompt", "")}
            ],
            "max_tokens": 2048,
            "temperature": 0.7
        }

        with httpx.Client(timeout=86400.0) as http_client:
            response = http_client.post(target_url, json=body, headers=headers)
            response.raise_for_status()
            res_data = response.json()

        generated_text = ""
        if isinstance(res_data, dict):
            choices = res_data.get("choices", [])
            if choices and isinstance(choices, list):
                msg = choices[0].get("message", {})
                generated_text = msg.get("content", "")
            elif "content" in res_data:
                generated_text = res_data.get("content", "")
            elif "text" in res_data:
                generated_text = res_data.get("text", "")

        if not generated_text:
            generated_text = str(res_data)

        completion_iso = datetime.now(timezone.utc).isoformat()
        update_db(enrichment_id, {
            "status": "completed",
            "generatedText": generated_text,
            "errorMessage": None,
            "updatedAt": completion_iso
        })

    except Exception as exc:
        failed_iso = datetime.now(timezone.utc).isoformat()
        update_db(enrichment_id, {
            "status": "failed",
            "errorMessage": str(exc),
            "updatedAt": failed_iso
        })

def verify_backend_secret(authorization: Optional[str] = Header(None)):
    secret = os.getenv("PYTHON_BACKEND_SECRET", "").strip()
    if not secret:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization[len("Bearer "):]
    if token != secret:
        raise HTTPException(status_code=403, detail="Invalid bearer token")

@app.post("/api/generate", dependencies=[Depends(verify_backend_secret)])
@app.post("/generate", dependencies=[Depends(verify_backend_secret)])
async def generate_enrichment(payload: GenerateRequest):
    enrichment_id = payload.enrichmentId or payload.enrichment_id or str(uuid.uuid4())
    req_data = payload.model_dump()
    req_data["enrichment_id"] = enrichment_id
    executor.submit(run_heavy_llm, enrichment_id, req_data)
    return JSONResponse(status_code=200, content={"enrichment_id": enrichment_id, "status": "pending"})
