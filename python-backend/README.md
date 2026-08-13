# StoriesCollector Python Backend Middleware

FastAPI background processing middleware for multi-hour llama.cpp LLM generation tasks.

## Prerequisites & Virtual Environment Setup

Since `python3` points to an older Python version, explicitly create a virtual environment using `python3.8`:

1. Navigate to the `python-backend` directory:
   ```bash
   cd python-backend
   ```

2. Create a virtual environment using `python3.8`:
   ```bash
   python3.8 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # On Linux/macOS:
   source venv/bin/activate

   # On Windows:
   venv\Scripts\activate
   ```

4. Install the reviewed, hashed dependency lock inside the virtual environment:
   ```bash
   pip install --upgrade pip
   pip install --require-hashes -r requirements.lock
   ```

To deliberately update dependencies, edit the exact versions in
`requirements.txt` and regenerate `requirements.lock` with pip-tools.

## Environment Variables

Create a `.env` file inside `python-backend/`:

```env
DATABASE_URL=postgresql://postgres.sgvscrprlmtpdhscznbo:MY_PASSWORD@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
LLAMA_CPP_URL=http://127.0.0.1:8080
LLAMA_CPP_API_KEY=your-llama-cpp-api-key
ASYNC_SECRET=your-shared-secret-here
```

## Running the Server

Make sure your `venv` is activated (`source venv/bin/activate`), then start Uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
