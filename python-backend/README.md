# StoriesCollector Python Backend Middleware

FastAPI background processing middleware for multi-hour llama.cpp LLM generation tasks.

## Prerequisites & Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file inside `python-backend/`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
LLAMA_CPP_URL=http://127.0.0.1:8080
```

## Running the Server

Start Uvicorn with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
