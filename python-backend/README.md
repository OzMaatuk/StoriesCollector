# StoriesCollector Python Backend Middleware

FastAPI background processing middleware for multi-hour llama.cpp LLM generation tasks.

## Prerequisites & Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file inside `python-backend/`:

```env
DATABASE_URL=postgresql://postgres.sgvscrprlmtpdhscznbo:MY_PASSWORD@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
LLAMA_CPP_URL=http://127.0.0.1:8080
```

## Running the Server

Start Uvicorn with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
