# LLM API Key Configuration Guide

This guide will help you configure the LLM API key so the RAG system can generate answers.

## Quick Start

### Option 1: Using Environment Variables (Recommended)

1. **Get your API key:**
   - **DeepSeek (Recommended):** Sign up at https://platform.deepseek.com and get your API key from https://platform.deepseek.com/api_keys
   - **OpenAI (Alternative):** Sign up at https://platform.openai.com and get your API key from https://platform.openai.com/api-keys

2. **Set environment variables:**

   **For DeepSeek:**
   ```bash
   export DEEPSEEK_API_KEY="your_deepseek_api_key_here"
   export DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
   export LLM_MODEL="deepseek-chat"
   ```

   **For OpenAI:**
   ```bash
   export OPENAI_API_KEY="your_openai_api_key_here"
   export OPENAI_API_URL="https://api.openai.com/v1/chat/completions"
   export LLM_MODEL="gpt-4"
   ```

3. **Restart the backend container:**
   ```bash
   docker-compose restart backend
   ```

### Option 2: Using .env File (Better for Development)

1. **Create a `.env` file in the `backend/` directory:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file and add your API key:**

   For DeepSeek:
   ```env
   DEEPSEEK_API_KEY=sk-your-actual-api-key-here
   DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   LLM_MODEL=deepseek-chat
   ```

   For OpenAI:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   OPENAI_API_URL=https://api.openai.com/v1/chat/completions
   LLM_MODEL=gpt-4
   ```

3. **Update `docker-compose.yml` to use the .env file:**
   
   Add this to the backend service:
   ```yaml
   env_file:
     - .env
   ```

   Or add individual variables:
   ```yaml
   environment:
     - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
     # ... other variables
   ```

4. **Restart the backend:**
   ```bash
   docker-compose restart backend
   ```

### Option 3: Directly in docker-compose.yml (Quick but less secure)

Edit `backend/docker-compose.yml` and add your API key directly:

```yaml
environment:
  # ... existing variables ...
  - DEEPSEEK_API_KEY=sk-your-actual-api-key-here
  - DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
  - LLM_MODEL=deepseek-chat
```

Then restart:
```bash
docker-compose restart backend
```

## Verify Configuration

### Test 1: Check if API key is loaded
```bash
docker exec kamafile_backend python -c "import os; print('DEEPSEEK_API_KEY:', 'SET' if os.getenv('DEEPSEEK_API_KEY') else 'NOT SET')"
```

### Test 2: Test RAG query
```bash
docker exec kamafile_backend python /app/test_rag_query.py
```

### Test 3: Test API endpoint
```bash
curl -X POST "http://localhost:8001/api/rag/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is VAT?"}'
```

You should see an actual answer with citations instead of "LLM service is not configured".

## Which LLM to Choose?

### DeepSeek (Recommended)
- ✅ **Cost-effective:** Much cheaper than OpenAI
- ✅ **Good quality:** Excellent for technical/legal content
- ✅ **Fast:** Good response times
- ✅ **Chinese company:** Privacy considerations
- 📝 **Get API key:** https://platform.deepseek.com/api_keys

### OpenAI
- ✅ **Proven quality:** Industry standard
- ✅ **Reliable:** Excellent uptime
- ❌ **Expensive:** Higher cost per request
- 📝 **Get API key:** https://platform.openai.com/api-keys

## Troubleshooting

### Issue: "No LLM API key configured"
**Solution:** Make sure the environment variable is set and the backend container is restarted.

```bash
# Check if variable is set
docker exec kamafile_backend env | grep DEEPSEEK_API_KEY

# If not set, restart with the variable
docker-compose down
docker-compose up -d
```

### Issue: "HTTP error calling LLM API"
**Solution:** Check your API key is valid and you have credits/quota.

```bash
# Test API key manually
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: "Connection timeout"
**Solution:** Check your network/firewall allows outbound connections to the LLM API.

## Security Best Practices

1. **Never commit `.env` files to git** - Already in `.gitignore`
2. **Use environment variables in production** - Don't hardcode in docker-compose.yml
3. **Rotate API keys regularly** - Change them every 90 days
4. **Monitor API usage** - Set up billing alerts
5. **Use separate keys for dev/staging/prod** - Different environments

## Cost Estimation

### DeepSeek Pricing (as of 2025):
- Input: ~$0.14 per 1M tokens
- Output: ~$0.28 per 1M tokens
- Average query: ~500 tokens input, ~200 tokens output
- **Cost per query: ~$0.0001 (very affordable)**

### OpenAI GPT-4 Pricing:
- Input: ~$10 per 1M tokens
- Output: ~$30 per 1M tokens
- Average query: ~500 tokens input, ~200 tokens output
- **Cost per query: ~$0.011 (10x more expensive)**

## Next Steps

Once configured:
1. ✅ Test with sample queries
2. ✅ Monitor answer quality
3. ✅ Check citations are correct
4. ✅ Verify no-hallucination is working
5. ✅ Set up query logging for audit
