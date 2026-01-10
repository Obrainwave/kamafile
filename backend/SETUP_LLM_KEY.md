# Quick Setup: LLM API Key Configuration

The RAG system needs an LLM API key to generate answers. Follow these steps:

## Step 1: Get Your API Key

### Option A: DeepSeek (Recommended - Cheaper)
1. Go to: https://platform.deepseek.com
2. Sign up or log in
3. Go to: https://platform.deepseek.com/api_keys
4. Create a new API key
5. Copy your API key (starts with `sk-`)

### Option B: OpenAI (Alternative)
1. Go to: https://platform.openai.com
2. Sign up or log in  
3. Go to: https://platform.openai.com/api-keys
4. Create a new API key
5. Copy your API key (starts with `sk-`)

## Step 2: Configure the API Key

You have **3 options** - choose one:

### Method 1: Environment Variables (Recommended for Development)

**Windows PowerShell:**
```powershell
$env:DEEPSEEK_API_KEY="your_api_key_here"
$env:DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
$env:LLM_MODEL="deepseek-chat"
docker-compose restart backend
```

**Linux/Mac:**
```bash
export DEEPSEEK_API_KEY="your_api_key_here"
export DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
export LLM_MODEL="deepseek-chat"
docker-compose restart backend
```

### Method 2: Directly Edit docker-compose.yml

Edit `backend/docker-compose.yml` and replace the placeholder:

**For DeepSeek:**
```yaml
environment:
  # ... existing variables ...
  - DEEPSEEK_API_KEY=sk-your-actual-api-key-here
  - DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
  - LLM_MODEL=deepseek-chat
```

**For OpenAI:**
```yaml
environment:
  # ... existing variables ...
  - OPENAI_API_KEY=sk-your-actual-api-key-here
  - OPENAI_API_URL=https://api.openai.com/v1/chat/completions
  - LLM_MODEL=gpt-4
  # Comment out DeepSeek lines:
  # - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
```

Then restart:
```bash
docker-compose restart backend
```

### Method 3: Create .env File (Best for Production)

1. Create `backend/.env` file:
```env
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_MODEL=deepseek-chat
```

2. Update `docker-compose.yml` to use .env:
```yaml
backend:
  # ... existing config ...
  env_file:
    - .env
```

3. Restart:
```bash
docker-compose restart backend
```

## Step 3: Verify Configuration

### Test 1: Check if API key is loaded
```bash
docker exec kamafile_backend python -c "import os; key = os.getenv('DEEPSEEK_API_KEY'); print('✅ SET' if key else '❌ NOT SET')"
```

### Test 2: Test RAG query
```bash
docker exec kamafile_backend python /app/test_rag_query.py
```

### Test 3: Test via API
```bash
curl -X POST "http://localhost:8001/api/rag/ask" ^
  -H "Content-Type: application/json" ^
  -d "{\"question\": \"What is VAT?\"}"
```

**Expected Result:** You should see an actual answer with citations, not "LLM service is not configured".

## Quick Reference

### Current docker-compose.yml Configuration
The `docker-compose.yml` is already set up to read from environment variables:
- `DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}` (empty by default)
- `DEEPSEEK_API_URL=${DEEPSEEK_API_URL:-https://api.deepseek.com/v1/chat/completions}`
- `LLM_MODEL=${LLM_MODEL:-deepseek-chat}`

Just set the `DEEPSEEK_API_KEY` environment variable and restart!

## Troubleshooting

**Issue: Still seeing "LLM service is not configured"**
- ✅ Check API key is set: `docker exec kamafile_backend env | grep DEEPSEEK`
- ✅ Restart backend: `docker-compose restart backend`
- ✅ Check logs: `docker logs kamafile_backend | grep LLM`

**Issue: API errors (401, 403)**
- Check your API key is valid and has credits
- Verify API key format (should start with `sk-`)
- Check your account has billing enabled

**Issue: Connection timeout**
- Check your network allows outbound HTTPS connections
- Verify the API URL is correct
- Check firewall settings

## Cost Comparison

### DeepSeek (Recommended)
- ~$0.0001 per query
- $0.14 per 1M input tokens
- $0.28 per 1M output tokens
- **Best value for money**

### OpenAI GPT-4
- ~$0.011 per query  
- $10 per 1M input tokens
- $30 per 1M output tokens
- **10x more expensive**

## Next Steps

Once configured:
1. ✅ Test with sample questions in the chatbot
2. ✅ Verify answers include proper citations
3. ✅ Check that no-hallucination is working
4. ✅ Monitor API usage and costs

## Need Help?

- See full guide: `backend/LLM_API_KEY_SETUP.md`
- Run test suite: `docker exec kamafile_backend python /app/test_rag_query.py`
- Check logs: `docker logs kamafile_backend --tail 50`
