# PowerShell script to set up LLM API key for RAG system
# Run this script: .\setup_llm_key.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LLM API Key Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Choose your LLM provider:" -ForegroundColor Yellow
Write-Host "1. DeepSeek (Recommended - Cost-effective)"
Write-Host "2. OpenAI (Alternative)"
$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Get your DeepSeek API key from: https://platform.deepseek.com/api_keys" -ForegroundColor Yellow
    $apiKey = Read-Host "Enter your DeepSeek API key"
    
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "Error: API key cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Setting environment variables..." -ForegroundColor Green
    $env:DEEPSEEK_API_KEY = $apiKey
    $env:DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
    $env:LLM_MODEL = "deepseek-chat"
    
    Write-Host "✅ Environment variables set!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To make these permanent, add them to your PowerShell profile or docker-compose.yml" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Restarting backend container..." -ForegroundColor Green
    docker-compose restart backend
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Get your OpenAI API key from: https://platform.openai.com/api-keys" -ForegroundColor Yellow
    $apiKey = Read-Host "Enter your OpenAI API key"
    
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "Error: API key cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Setting environment variables..." -ForegroundColor Green
    $env:OPENAI_API_KEY = $apiKey
    $env:OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
    $env:LLM_MODEL = "gpt-4"
    
    Write-Host "✅ Environment variables set!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: You'll need to uncomment OpenAI lines in docker-compose.yml" -ForegroundColor Yellow
    Write-Host "and comment out DeepSeek lines for OpenAI to work." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Restarting backend container..." -ForegroundColor Green
    docker-compose restart backend
    
} else {
    Write-Host "Invalid choice. Please enter 1 or 2." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test the configuration:" -ForegroundColor Yellow
Write-Host "  docker exec kamafile_backend python /app/test_rag_query.py" -ForegroundColor White
Write-Host ""
Write-Host "Or test via API:" -ForegroundColor Yellow
Write-Host '  curl -X POST "http://localhost:8001/api/rag/ask" -H "Content-Type: application/json" -d "{\"question\": \"What is VAT?\"}"' -ForegroundColor White
Write-Host ""
