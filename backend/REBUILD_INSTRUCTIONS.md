# Rebuilding Docker Container for RAG Dependencies

## Issue
The new RAG implementation requires additional Python packages that aren't installed in the current Docker container.

## Solution: Rebuild the Container

### Option 1: Rebuild using Docker Compose (Recommended)

```bash
cd backend
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Option 2: Rebuild and Restart in One Command

```bash
cd backend
docker-compose up --build -d
```

### Option 3: If Using Docker Directly

```bash
cd backend
docker build --no-cache -t kamafile_backend .
docker run -d --name kamafile_backend -p 8001:8001 kamafile_backend
```

## New Dependencies Added

The following packages were added to `requirements.txt`:

- `aiofiles==24.1.0` - Async file operations
- `aiohttp==3.11.10` - Async HTTP client
- `chromadb==0.5.20` - Vector database
- `sentence-transformers==3.3.1` - Embedding generation
- `openai==1.54.5` - OpenAI API client (for LLM)
- `pyyaml==6.0.2` - YAML parsing
- `markdown==3.7` - Markdown processing

## System Dependencies

The Dockerfile was updated to include:
- `g++` - C++ compiler (for some Python packages)
- `tesseract-ocr` - OCR engine for image processing
- `libtesseract-dev` - Tesseract development libraries

## Build Time

**Note**: The first build may take 10-15 minutes because:
- `sentence-transformers` downloads ML models (~500MB)
- `chromadb` and dependencies are large
- System packages need to be installed

Subsequent builds will be faster due to Docker layer caching.

## Verify Installation

After rebuilding, check the logs:

```bash
docker-compose logs backend
```

You should see the server starting without import errors.

## Troubleshooting

### If build fails due to memory:
- Increase Docker memory limit (Settings → Resources → Memory)
- Try building on a machine with more RAM

### If pytesseract errors occur:
- The tesseract-ocr package should be installed automatically
- If not, the OCR feature will gracefully degrade (documents will still process)

### If sentence-transformers is slow:
- First run downloads the model (~500MB)
- Subsequent runs use cached model
- Consider using a smaller model: Set `EMBEDDING_MODEL=all-MiniLM-L6-v2` in .env

## Quick Test

After rebuilding, test the RAG endpoint:

```bash
curl -X POST http://localhost:8001/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is VAT?"}'
```

You should get a response (may be empty if no documents are indexed yet).
