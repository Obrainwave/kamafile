# Qdrant Web UI Guide

## Overview

Qdrant provides a built-in web interface for viewing and managing vector data. This is extremely useful for:
- Debugging RAG document indexing
- Verifying vector embeddings
- Testing semantic search
- Monitoring collection statistics
- Viewing document chunks and metadata

## Accessing the Web UI

### Local Development

1. **Start Docker services**:
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **Open browser**: Navigate to `http://localhost:6333/dashboard`

3. **You should see**: Qdrant Dashboard homepage

### Production

- Replace `localhost` with your server IP or domain
- Ensure port 6333 is exposed and accessible
- Consider adding authentication if needed

## Using the Web UI

### 1. View Collections

1. Click **"Collections"** in the left sidebar
2. You should see `tax_legal_documents` collection
3. Click on the collection name to view details

### Collection Information

- **Name**: `tax_legal_documents`
- **Vector Size**: 384 (for all-MiniLM-L6-v2 model)
- **Distance Metric**: Cosine
- **Points Count**: Number of document chunks indexed

### 2. Browse Vectors

1. In the collection view, click **"Points"** tab
2. You'll see a list of all vectors (document chunks)
3. Each point shows:
   - **ID**: Unique identifier (format: `{document_id}_{chunk_id}`)
   - **Vector**: The embedding (384 dimensions)
   - **Payload**: Metadata including:
     - `law_name`: Name of the law
     - `section_number`: Legal section number
     - `section_title`: Section title
     - `year`: Year of the law
     - `document_id`: Source document ID
     - `chunk_id`: Unique chunk identifier
     - `text`: Preview of chunk text (first 1000 chars)
     - `full_text`: Complete chunk text

### 3. Search Vectors

1. Click **"Search"** tab in the collection view
2. Enter a query (e.g., "VAT rate")
3. The system will:
   - Generate embedding for your query
   - Find similar vectors
   - Display results with similarity scores

**Note**: For semantic search, you need to provide a vector. The UI allows you to:
- Search by vector (paste embedding array)
- Search by ID
- Filter by metadata

### 4. Filter by Metadata

1. In the **"Points"** view, use the filter panel
2. Filter by:
   - `law_name`: e.g., "VAT Act"
   - `document_id`: Specific document
   - `section_number`: e.g., "4"
   - `year`: e.g., 2023

### 5. View Collection Statistics

1. In collection view, see **"Statistics"** section
2. Information includes:
   - Total vectors
   - Collection size
   - Index status
   - Configuration

## Common Tasks

### Verify Document Indexing

1. Upload a document via admin dashboard
2. Wait for processing to complete
3. Open Qdrant Web UI
4. Check `tax_legal_documents` collection
5. Filter by `document_id` to see all chunks for that document
6. Verify chunks have correct metadata

### Debug Search Issues

1. Go to **"Search"** tab
2. Try searching for terms from your documents
3. Check if relevant chunks are returned
4. Verify similarity scores (should be > 0.3 for relevant results)
5. Check metadata to ensure proper filtering

### Monitor Collection Growth

1. View collection statistics
2. Track vector count over time
3. Monitor collection size
4. Check for any indexing errors

### Inspect Chunk Quality

1. Browse points in collection
2. Click on individual points to view:
   - Full text content
   - Metadata accuracy
   - Vector representation
3. Verify chunks are properly formatted
4. Check that legal sections aren't split

## API Endpoint

You can also get collection info programmatically:

```bash
GET /api/admin/rag/vector-store/info
```

Returns:
```json
{
  "qdrant_host": "qdrant",
  "qdrant_port": 6333,
  "web_ui_url": "http://localhost:6333/dashboard",
  "collection_info": {
    "name": "tax_legal_documents",
    "vectors_count": 150,
    "config": {
      "vector_size": 384,
      "distance": "Cosine"
    }
  }
}
```

## Troubleshooting

### Web UI Not Loading

1. Check if Qdrant container is running:
   ```bash
   docker-compose ps
   ```

2. Check Qdrant logs:
   ```bash
   docker-compose logs qdrant
   ```

3. Verify port 6333 is accessible:
   ```bash
   curl http://localhost:6333/health
   ```

### No Collections Visible

1. Ensure documents have been processed
2. Check backend logs for indexing errors
3. Verify Qdrant connection in backend logs
4. Try creating a test document

### Search Not Working

1. Verify embeddings are being generated
2. Check vector size matches collection config (384)
3. Ensure query embeddings are correct format
4. Check similarity threshold settings

## Best Practices

1. **Regular Monitoring**: Check collection stats regularly
2. **Verify Indexing**: Always verify new documents are indexed
3. **Test Searches**: Use Web UI to test search quality
4. **Metadata Accuracy**: Verify metadata is correct for all chunks
5. **Backup**: Qdrant data is persisted in Docker volume

## Security Notes

- **Development**: Web UI is accessible without authentication
- **Production**: Consider:
  - Restricting access to admin IPs
  - Adding reverse proxy with authentication
  - Using QDRANT_API_KEY for API access
  - Firewall rules to limit access

## Additional Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant Web UI Guide](https://qdrant.tech/documentation/guides/web_ui/)
- [Qdrant Python Client](https://qdrant.tech/documentation/guides/python-client/)
