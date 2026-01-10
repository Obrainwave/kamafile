# Quick Start: Configure LLM API Key

Your `docker-compose.yml` is already configured! Just set the environment variable and restart.

## 🚀 Quick Setup (Choose One Method)

### Method 1: PowerShell Script (Easiest)

**Windows:**
```powershell
cd backend
.\setup_llm_key.ps1
```

Follow the prompts to enter your API key.

### Method 2: Manual Environment Variables

**Windows PowerShell:**
```powershell
# For DeepSeek (Recommended)
$env:DEEPSEEK_API_KEY="sk-your-api-key-here"
$env:DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
$env:LLM_MODEL="deepseek-chat"
docker-compose restart backend
```

**Linux/Mac:**
```bash
# For DeepSeek (Recommended)
export DEEPSEEK_API_KEY="sk-your-api-key-here"
export DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
export LLM_MODEL="deepseek-chat"
docker-compose restart backend
```

### Method 3: Edit docker-compose.yml Directly

Edit `backend/docker-compose.yml` line 87 and replace the empty default:

```yaml
- DEEPSEEK_API_KEY=sk-your-actual-api-key-here
```

Then restart:
```bash
docker-compose restart backend
```

## 📋 Get Your API Key

### DeepSeek (Recommended - Cheaper)
1. Visit: https://platform.deepseek.com/api_keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

### OpenAI (Alternative)
1. Visit: https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

## ✅ Verify Configuration

After setting the key and restarting:

```bash
# Check if loaded
docker exec kamafile_backend python -c "import os; print('SET' if os.getenv('DEEPSEEK_API_KEY') else 'NOT SET')"

# Test RAG system
docker exec kamafile_backend python /app/test_rag_query.py
```

You should see actual answers instead of "LLM service is not configured".

## 💰 Cost Comparison

- **DeepSeek:** ~$0.0001 per query (Recommended)
- **OpenAI GPT-4:** ~$0.011 per query (10x more expensive)

## 📚 Full Documentation

- Detailed guide: `backend/LLM_API_KEY_SETUP.md`
- Test results: `backend/RAG_TEST_RESULTS.md`
