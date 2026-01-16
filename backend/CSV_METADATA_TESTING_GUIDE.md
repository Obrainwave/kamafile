# CSV Metadata Implementation - Testing Guide

## ✅ Backend Status: RUNNING

The backend has been successfully updated with CSV metadata injection functionality!

---

## 📋 What's Been Implemented

### Phase 1-3 Complete:

1. ✅ Database schema with `document_metadata_catalog` table
2. ✅ CSV upload and parsing service
3. ✅ API endpoints for catalog management
4. ✅ Metadata lookup during document upload
5. ✅ CSV metadata injection into every chunk

---

## 🧪 Testing Steps

### Prerequisites

- Backend running on `http://localhost:8001`
- Authentication token (admin user)
- Sample CSV file (`knowledge_sources_15.01.2025.csv`)

### Step 1: Verify Backend is Running

```bash
# Check Docker containers
docker ps | findstr kamafile

# Check backend logs
docker logs kamafile_backend --tail=20
```

**Expected**: Backend should be running without errors

---

### Step 2: Upload CSV Metadata Catalog

**Option A: Using curl (PowerShell)**

```powershell
$token = "YOUR_AUTH_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
}

# Upload CSV in replace mode
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/rag/metadata-catalog/upload" `
    -Method Post `
    -Headers $headers `
    -Form @{
        file = Get-Item "knowledge_sources_15.01.2025.csv"
        mode = "replace"
        batch_size = "100"
    }

$response | ConvertTo-Json
```

**Option B: Using Python**

```python
import requests

token = "YOUR_AUTH_TOKEN_HERE"
headers = {"Authorization": f"Bearer {token}"}

with open("knowledge_sources_15.01.2025.csv", "rb") as f:
    files = {"file": f}
    data = {"mode": "replace", "batch_size": "100"}
    response = requests.post(
        "http://localhost:8001/api/admin/rag/metadata-catalog/upload",
        headers=headers,
        files=files,
        data=data
    )

print(response.json())
```

**Expected Response**:

```json
{
  "total_rows": 5,
  "inserted": 5,
  "updated": 0,
  "errors": []
}
```

---

### Step 3: Check Catalog Stats

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/rag/metadata-catalog/stats" `
    -Method Get `
    -Headers $headers

$response | ConvertTo-Json
```

**Expected Response**:

```json
{
  "total_entries": 5,
  "matched_documents": 0,
  "pending_documents": 0
}
```

---

### Step 4: View Catalog Entries

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/rag/metadata-catalog?limit=10" `
    -Method Get `
    -Headers $headers

$response | ConvertTo-Json
```

**Expected Response**:

```json
[
  {
    "id": "uuid-here",
    "doc_id": "NTA-2025",
    "file_name": "NIGERIA_TAX_ACT_2025.PDF",
    "source_title": "Nigeria Tax Act, 2025",
    "jurisdiction_level": "Federal",
    "status": "Enacted/Active",
    "doc_category": "Legislation",
    "effective_date": "1st January 2026?",
    "created_at": "2026-01-15T16:30:00Z"
  },
  ...
]
```

---

### Step 5: Upload a Matching Document

Now upload a PDF that matches one of the CSV entries:

**Example**: Upload `NIGERIA_TAX_ACT_2025.PDF`

```powershell
# Upload via admin UI or API
$file = Get-Item "NIGERIA_TAX_ACT_2025.PDF"
$uploadData = @{
    file = $file
    title = "Nigeria Tax Act, 2025"
}

$response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/rag/upload" `
    -Method Post `
    -Headers $headers `
    -Form $uploadData

$response | ConvertTo-Json
```

---

### Step 6: Check Document Processing Logs

```bash
docker logs kamafile_backend --tail=100 | findstr "CSV metadata"
```

**Expected Log Messages**:

```
Found CSV metadata for NIGERIA_TAX_ACT_2025.PDF: doc_id=NTA-2025
```

Or if no match:

```
No CSV metadata found for SOME_OTHER_FILE.PDF
```

---

### Step 7: Verify Metadata in Database

```sql
-- Connect to PostgreSQL
docker exec -it kamafile_postgres psql -U kamafile -d kamafile

-- Check catalog entries
SELECT doc_id, file_name, jurisdiction_level, status
FROM document_metadata_catalog;

-- Check document metadata status
SELECT id, title, file_name, metadata_status, metadata_catalog_id
FROM rag_documents
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:

- Documents with matching filenames: `metadata_status = 'matched'`
- Documents without matches: `metadata_status = 'pending'`

---

### Step 8: Verify Metadata in Qdrant

1. Open Qdrant Web UI: http://localhost:6333/dashboard
2. Navigate to `tax_legal_documents` collection
3. Click on any point to view its payload
4. Check for CSV metadata fields:

**Expected Payload Structure**:

```json
{
  "document_id": "uuid-here",
  "text": "Section 1 - ...",
  "chunk_id": "uuid-here",
  "section_type": "Section",
  "section_number": "1",
  "section_title": "...",

  // CSV Metadata - Indexed Fields (top level)
  "doc_id": "NTA-2025",
  "jurisdiction_level": "Federal",
  "tax_type": "Income Tax",
  "taxpayer_type": "Individual, Corporate",
  "status": "Enacted/Active",
  "doc_category": "Legislation",
  "authority_level": "Primary",
  "effective_date": "1st January 2026?",

  // CSV Metadata - Full Blob
  "csv_metadata_full": {
    "id": "uuid-here",
    "doc_id": "NTA-2025",
    "file_name": "NIGERIA_TAX_ACT_2025.PDF",
    "source_title": "Nigeria Tax Act, 2025",
    "issuing_body": "National Assembly of Nigeria",
    "country": "Nigeria",
    "jurisdiction_level": "Federal",
    "knowledge_domain": "Tax Law",
    "tax_type": "Income Tax",
    "taxpayer_type": "Individual, Corporate",
    "doc_category": "Legislation",
    "effective_date": "1st January 2026?",
    "expiry_date": null,
    "publication_date": "26th June 2025?",
    "version": "1.0",
    "supersedes_doc_id": null,
    "lifecycle_stage": "Active",
    "authority_level": "Primary",
    "intended_usage": "Compliance, Reference",
    "topic_tags": "Income Tax, Corporate Tax, Personal Tax",
    "status": "Enacted/Active",
    "language": "English",
    "notes": "Consolidated version..."
  }
}
```

---

### Step 9: Test Pending Documents Endpoint

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/rag/metadata-catalog/pending-documents" `
    -Method Get `
    -Headers $headers

$response | ConvertTo-Json
```

**Expected**: List of documents with `metadata_status = 'pending'`

---

## 🎯 Success Criteria

### ✅ CSV Upload

- [ ] CSV uploads successfully
- [ ] Catalog stats show correct count
- [ ] Catalog entries are viewable

### ✅ Document Upload with Matching Metadata

- [ ] Document uploads successfully
- [ ] Logs show "Found CSV metadata for {filename}"
- [ ] Document has `metadata_status = 'matched'`
- [ ] Document has `metadata_catalog_id` set

### ✅ Document Upload without Matching Metadata

- [ ] Document uploads successfully
- [ ] Logs show "No CSV metadata found for {filename}"
- [ ] Document has `metadata_status = 'pending'`
- [ ] Document appears in pending documents list

### ✅ Metadata in Chunks

- [ ] Qdrant chunks have indexed fields at top level
- [ ] Qdrant chunks have `csv_metadata_full` blob
- [ ] All 23 CSV columns present in full blob

---

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check logs for errors
docker logs kamafile_backend

# Restart backend
docker restart kamafile_backend

# Check if port 8001 is accessible
curl http://localhost:8001/docs
```

### CSV Upload Fails

- Check file size (max 50MB)
- Verify CSV has required columns: `doc_id`, `file_name`, `source_title`
- Check authentication token is valid

### Metadata Not Injecting

- Check logs for "Found CSV metadata" or "No CSV metadata found"
- Verify filename normalization matches
- Check database: `SELECT * FROM document_metadata_catalog;`

### Qdrant Not Showing Metadata

- Wait for document processing to complete
- Check document `processing_status = 'completed'`
- Refresh Qdrant Web UI
- Check collection: `tax_legal_documents`

---

## 📊 Current API Endpoints

```
POST   /api/admin/rag/metadata-catalog/upload
GET    /api/admin/rag/metadata-catalog/stats
GET    /api/admin/rag/metadata-catalog
GET    /api/admin/rag/metadata-catalog/pending-documents
```

---

## 🔧 Useful Commands

```bash
# View backend logs
docker logs kamafile_backend --tail=100 -f

# Restart backend
docker restart kamafile_backend

# Check database
docker exec -it kamafile_postgres psql -U kamafile -d kamafile

# Check Qdrant
# Open browser: http://localhost:6333/dashboard

# Run test script
python test_csv_metadata_api.py
```

---

## 📝 Next Steps

1. **Test CSV Upload**: Upload your `knowledge_sources_15.01.2025.csv`
2. **Test Document Upload**: Upload a matching PDF
3. **Verify Metadata**: Check Qdrant Web UI
4. **Frontend Integration**: Add UI for CSV management (Phase 5)

---

**Status**: ✅ Backend implementation complete and ready for testing!
**Last Updated**: 2026-01-15 17:30 UTC
