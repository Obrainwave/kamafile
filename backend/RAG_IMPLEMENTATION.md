# Production-Grade RAG Implementation Guide

## Overview

This document describes the production-grade RAG (Retrieval-Augmented Generation) system implemented for the Nigerian Tax Assistant. The system enforces strict no-hallucination policies and legal accuracy.

## Architecture

### Core Components

1. **Vector Store** (`services/vector_store.py`)
   - Uses ChromaDB for persistent vector storage
   - Stores document chunks with metadata
   - Supports metadata filtering for retrieval

2. **Embedding Service** (`services/embedding_service.py`)
   - Uses sentence-transformers (all-MiniLM-L6-v2 by default)
   - Generates embeddings locally (no API calls)
   - Supports batch processing

3. **Document Processor** (`services/document_processor.py`)
   - Converts raw text to structured Markdown with YAML front-matter
   - Implements legal section-based chunking (one section per chunk)
   - Never splits legal sections across chunks

4. **RAG Query Service** (`services/rag_query_service.py`)
   - Intent classification (VAT, PAYE, CIT, etc.)
   - Semantic search with metadata filtering
   - Strict answer generation with citations

5. **LLM Service** (`services/llm_service.py`)
   - DeepSeek or OpenAI API integration
   - Temperature = 0 (deterministic)
   - Strict no-hallucination prompts

## Document Processing Pipeline

### Step 1: Text Extraction
- PDFs → PyPDF2
- Word → python-docx
- Images → OCR (Pillow + pytesseract)
- URLs → aiohttp + BeautifulSoup
- Excel → pandas

### Step 2: Markdown Conversion
All documents are converted to structured Markdown with YAML front-matter:

```yaml
---
law_name: VAT Act
year: 2023
authority: Federal Inland Revenue Service
jurisdiction: Nigeria
document_type: legal_act
version: 1.0
processed_at: 2024-01-01T00:00:00
---

## Section 1 – Title of Section
Content of section...
```

### Step 3: Legal Section Chunking
- Each chunk = one complete legal section
- Pattern: `## Section X – Title`
- Never splits sections
- Includes section metadata in chunk

### Step 4: Embedding & Storage
- Generate embeddings for all chunks
- Store in ChromaDB with metadata
- Each chunk is independently retrievable

## Query Processing

### Flow

1. **User Query** → `/api/rag/ask`
2. **Intent Classification** → VAT, PAYE, CIT, etc.
3. **Query Embedding** → Generate vector
4. **Retrieval** → Top 5 chunks (min score 0.3)
5. **Answer Generation** → LLM with strict prompt
6. **Response** → Answer + Citations

### Intent Classification

The system classifies queries into tax domains:
- VAT (Value Added Tax)
- PAYE (Pay As You Earn)
- CIT (Company Income Tax)
- WHT (Withholding Tax)
- Penalties
- Filing
- Registration
- Exemptions
- Deductions
- General

### Retrieval Strategy

- Top 5 most relevant chunks
- Minimum similarity score: 0.3
- Metadata filtering (future: by law type)
- No mixing of unrelated laws

## LLM Prompt Engineering

### System Prompt Rules

1. **Answer ONLY from provided context**
2. **Never use own knowledge**
3. **If not found, explicitly state it**
4. **Must cite sources** (Law name, Section, Year)
5. **Neutral, factual tone**
6. **No creative interpretations**
7. **No calculations unless formula provided**

### Temperature Settings

- **Temperature: 0** (deterministic, no creativity)
- **Top-p: 0.1** (very focused sampling)
- **Max tokens: 1000**

## API Endpoints

### Public Endpoint

**POST `/api/rag/ask`**
- Requires authentication (optional for public access)
- Request: `{ "question": "What is VAT rate?", "user_context": {...} }`
- Response: Answer with citations and confidence

### Admin Endpoints

**POST `/api/admin/rag/upload`**
- Upload files for RAG
- Automatically processes and indexes

**POST `/api/admin/rag/url`**
- Add URLs for RAG
- Fetches and processes content

**GET `/api/admin/rag`**
- List all RAG documents

**DELETE `/api/admin/rag/{id}`**
- Delete document and remove from vector store

## Usage Example

### Adding a Document

1. Admin uploads PDF via `/api/admin/rag/upload`
2. System extracts text
3. Converts to Markdown with YAML front-matter
4. Chunks by legal sections
5. Generates embeddings
6. Stores in vector database

### Querying

```python
POST /api/rag/ask
{
  "question": "What is the VAT rate for goods in Nigeria?",
  "user_context": {
    "user_type": "individual",
    "state": "Lagos"
  }
}

Response:
{
  "answer": "According to the VAT Act (2023), Section 4 – Rate of Tax, the standard VAT rate is 7.5%...",
  "citations": [
    {
      "law_name": "VAT Act",
      "section_number": "4",
      "section_title": "Rate of Tax",
      "year": 2023,
      "score": 0.95
    }
  ],
  "confidence": "high",
  "intent": "vat",
  "retrieved_chunks": 3
}
```

## Configuration

### Environment Variables

```bash
# LLM API (DeepSeek or OpenAI)
DEEPSEEK_API_KEY=your_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
# OR
OPENAI_API_KEY=your_key
OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# Embedding Model (optional, defaults to all-MiniLM-L6-v2)
EMBEDDING_MODEL=all-MiniLM-L6-v2

# LLM Model (optional)
LLM_MODEL=deepseek-chat

# Qdrant Configuration (optional, defaults shown)
QDRANT_HOST=qdrant  # Use 'localhost' for local development
QDRANT_PORT=6333
QDRANT_API_KEY=  # Optional, for authentication
```

## Data Storage

### Vector Database (Qdrant)
- **Service**: Qdrant (containerized)
- **Collection**: `tax_legal_documents`
- **Similarity**: Cosine
- **Web UI**: `http://localhost:6333/dashboard`
- **REST API**: `http://localhost:6333`
- **gRPC**: `http://localhost:6334`

### Accessing Qdrant Web UI

1. **Start services**: `docker-compose up -d`
2. **Open browser**: Navigate to `http://localhost:6333/dashboard`
3. **View collections**: Click on "Collections" in the sidebar
4. **Browse vectors**: Select `tax_legal_documents` collection
5. **Search vectors**: Use the search interface to query vectors
6. **View metadata**: Click on any vector to see its payload/metadata

### Qdrant Features

- **Web Dashboard**: Visual interface for viewing and managing vectors
- **Collection Management**: Create, delete, and configure collections
- **Vector Search**: Test semantic search directly in the UI
- **Metadata Filtering**: Filter vectors by metadata fields
- **Statistics**: View collection statistics (vector count, size, etc.)

### Document Storage
- Location: `uploads/rag_documents/`
- Format: Original files + processed Markdown

## Best Practices

### Adding New Documents

1. **Review OCR output** - Always review and correct OCR text
2. **Verify structure** - Ensure legal sections are properly formatted
3. **Check metadata** - Law name, year, authority must be accurate
4. **Test retrieval** - Query the document after adding

### Maintaining Accuracy

1. **Version control** - Never overwrite legal content
2. **Review answers** - Monitor low-confidence responses
3. **Update documents** - Re-process when laws change
4. **Audit logs** - All queries are logged

## Limitations & Future Enhancements

### Current Limitations

1. Law metadata extraction is basic (from title)
2. No automatic versioning of updated laws
3. Intent classification is keyword-based
4. No multi-language support yet

### Future Enhancements

1. **Advanced metadata extraction** - NLP to extract law details
2. **Version management** - Track law changes over time
3. **ML-based intent classification** - More accurate classification
4. **Multi-language** - Support for Pidgin and local languages
5. **Confidence thresholds** - Route low-confidence to experts
6. **Calculation engine** - Separate deterministic tax calculator

## Mental Model

**This system is: search → verify → explain**

- **Search**: Find relevant legal sections
- **Verify**: Check if information exists in knowledge base
- **Explain**: Narrate what the law states

**This system is NOT: think → guess → answer**

- The LLM never invents information
- The law is the authority
- The model is only a narrator

## Support

For issues or questions:
1. Check logs: `backend/logs/`
2. Review vector store: `data/chroma_db/`
3. Test embeddings: Check similarity scores
4. Verify LLM responses: Review prompt compliance
