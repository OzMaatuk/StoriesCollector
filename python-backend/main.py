import os
import uuid
from datetime import datetime, timezone
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import create_client, Client

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

def get_supabase_client() -> Optional[Client]:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and key:
        return create_client(url, key)
    return None

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
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    if client:
        try:
            client.table("generated_content").update({
                "status": "processing",
                "updatedAt": now_iso
            }).eq("id", enrichment_id).execute()
        except Exception:
            pass

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
        if client:
            client.table("generated_content").update({
                "status": "completed",
                "generatedText": generated_text,
                "errorMessage": None,
                "updatedAt": completion_iso
            }).eq("id", enrichment_id).execute()

    except Exception as exc:
        failed_iso = datetime.now(timezone.utc).isoformat()
        if client:
            try:
                client.table("generated_content").update({
                    "status": "failed",
                    "errorMessage": str(exc),
                    "updatedAt": failed_iso
                }).eq("id", enrichment_id).execute()
            except Exception:
                pass

@app.post("/api/generate")
@app.post("/generate")
async def generate_enrichment(payload: GenerateRequest):
    enrichment_id = payload.enrichmentId or payload.enrichment_id or str(uuid.uuid4())
    req_data = payload.model_dump()
    req_data["enrichment_id"] = enrichment_id
    executor.submit(run_heavy_llm, enrichment_id, req_data)
    return JSONResponse(status_code=200, content={"enrichment_id": enrichment_id, "status": "pending"})
