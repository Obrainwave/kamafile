# CSV Metadata Injection - Implementation Specification

## Overview

This feature allows admins to upload a CSV catalog containing rich metadata for RAG documents. During document chunking, metadata from the CSV is automatically injected into each chunk for enhanced retrieval and filtering.

## Design Decisions (Finalized)

### 1. CSV Management

- **Strategy**: Single global CSV file (or multiple batches)
- **Upload Modes**:
  - `replace`: Delete all existing entries, insert new (default)
  - `merge`: Keep existing, add new, update duplicates by `doc_id`
- **Batch Processing**: Automatic server-side chunking for large files
  - Process in batches of 100 rows
  - Commit after each batch to avoid memory issues
  - Support files up to 50MB
- **Manual Batching**: Admin can split large CSVs and upload separately in `merge` mode
- **Storage**: Database table `document_metadata_catalog`

### 2. Filename Matching

- **Primary**: Normalized case-insensitive matching
  - Convert both filenames to lowercase
  - Remove spaces, underscores, hyphens
  - Compare: `"NIGERIA_TAX_ACT_2025.PDF"` → `"nigeriataxact2025pdf"`
- **Fallback**: If no match found, flag document for manual review
- **Admin Review**: Documents without metadata get `status: 'metadata_pending'`

### 3. Missing Metadata Handling

- **Behavior**: Allow upload with warning
- **Logging**: Log warning when no CSV metadata found
- **Flagging**: Set `metadata_status: 'pending'` in RAGDocument table
- **Admin UI**: Show list of documents pending metadata assignment

### 4. CSV Updates & Re-processing

- **Immediate**: Update `document_metadata_catalog` table immediately
- **Re-processing**: Offer bulk re-processing button in admin UI
- **Workflow**:
  1. Admin uploads new CSV
  2. System compares with existing catalog
  3. Shows diff: "5 documents have updated metadata"
  4. Admin clicks "Re-process All" or selects specific documents
  5. System re-chunks and re-indexes selected documents

### 5. Metadata Storage in Vector DB

- **Strategy**: Hybrid approach
- **Indexed Fields** (for filtering in Qdrant):
  - `doc_id`
  - `jurisdiction_level`
  - `tax_type`
  - `taxpayer_type`
  - `status`
  - `doc_category`
  - `authority_level`
  - `effective_date`
- **JSON Blob** (full metadata):
  - `csv_metadata_full`: Contains all 23 CSV columns

### 6. Data Type Handling

- **Dates**: Keep as freeform text (no parsing)
  - Examples: "26th June 2025?", "1st January 2026?"
  - Rationale: Preserves uncertainty markers (?) and flexibility
- **Enums**: Allow any value (no validation)
  - Fields like `status`, `jurisdiction_level` accept any string
  - Rationale: Flexibility for future values

### 7. Backward Compatibility

- **Existing Documents**: Will be deleted and re-uploaded
- **Fresh Start**: Clean slate with CSV metadata from day one

---

## CSV Structure

### Required Columns

1. `doc_id` - Unique identifier (e.g., "NTA-2025")
2. `file_name` - Filename for matching (e.g., "NIGERIA_TAX_ACT_2025.PDF")
3. `source_title` - Human-readable title

### Optional Columns (23 total)

- `Source_file_type`
- `issuing_body`
- `country`
- `jurisdiction_level`
- `knowledge_domain`
- `tax_type`
- `taxpayer_type`
- `lifecycle_stage`
- `authority_level`
- `intended_usage`
- `doc_category`
- `topic_tags`
- `effective_date`
- `expiry_date`
- `publication_date`
- `version`
- `supersedes_doc_id`
- `status`
- `language`
- `notes`

---

## Database Schema

### New Table: `document_metadata_catalog`

```sql
CREATE TABLE document_metadata_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identification
    doc_id VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(500) UNIQUE NOT NULL,
    file_name_normalized VARCHAR(500) NOT NULL,  -- For matching
    source_title VARCHAR(500),
    source_file_type VARCHAR(100),

    -- Classification
    issuing_body VARCHAR(500),
    country VARCHAR(100),
    jurisdiction_level VARCHAR(100),
    knowledge_domain VARCHAR(200),
    tax_type VARCHAR(500),
    taxpayer_type VARCHAR(500),
    doc_category VARCHAR(200),

    -- Temporal (all as text)
    effective_date VARCHAR(200),
    expiry_date VARCHAR(200),
    publication_date VARCHAR(200),
    version VARCHAR(200),

    -- Relationships
    supersedes_doc_id VARCHAR(500),

    -- Context
    lifecycle_stage VARCHAR(200),
    authority_level VARCHAR(200),
    intended_usage VARCHAR(1000),
    topic_tags VARCHAR(1000),
    status VARCHAR(100),
    language VARCHAR(50),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    CREATE INDEX idx_file_name_normalized ON document_metadata_catalog(file_name_normalized);
    CREATE INDEX idx_doc_id ON document_metadata_catalog(doc_id);
    CREATE INDEX idx_jurisdiction_level ON document_metadata_catalog(jurisdiction_level);
    CREATE INDEX idx_status ON document_metadata_catalog(status);
);
```

### Update Existing Table: `rag_documents`

```sql
ALTER TABLE rag_documents ADD COLUMN metadata_catalog_id UUID REFERENCES document_metadata_catalog(id);
ALTER TABLE rag_documents ADD COLUMN metadata_status VARCHAR(50) DEFAULT 'matched';
-- Values: 'matched', 'pending', 'manual'

CREATE INDEX idx_metadata_status ON rag_documents(metadata_status);
```

---

## Implementation Phases

### Phase 1: Database & Models

**Files to modify**:

- `backend/models.py` - Add `DocumentMetadataCatalog` model
- Create Alembic migration for new table

**Deliverables**:

- ✅ New model class
- ✅ Migration script
- ✅ Updated `RAGDocument` model with foreign key

---

### Phase 2: CSV Upload & Parsing

**Files to create/modify**:

- `backend/services/csv_metadata_service.py` - New service
- `backend/routers/admin/rag.py` - New endpoint

**Functions**:

```python
# services/csv_metadata_service.py

def normalize_filename(filename: str) -> str:
    """Normalize filename for matching"""
    # Remove extension, lowercase, remove special chars
    pass

def parse_csv_catalog(csv_content: bytes) -> List[Dict[str, Any]]:
    """Parse CSV and validate structure"""
    pass

async def upload_metadata_catalog(
    csv_content: bytes,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Upload CSV catalog to database
    Returns: {
        'total_rows': 10,
        'inserted': 8,
        'updated': 2,
        'errors': []
    }
    """
    pass

async def lookup_metadata_by_filename(
    filename: str,
    db: AsyncSession
) -> Optional[Dict[str, Any]]:
    """Look up metadata by normalized filename"""
    pass

async def get_documents_with_updated_metadata(
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """
    Compare current catalog with vector DB
    Returns list of documents that need re-processing
    """
    pass
```

**API Endpoints**:

```python
# routers/admin/rag.py

@router.post("/metadata-catalog/upload")
async def upload_metadata_catalog(
    file: UploadFile = File(...),
    mode: str = Form("replace"),  # "replace" or "merge"
    batch_size: int = Form(100),  # Rows per batch
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """
    Upload CSV metadata catalog

    Modes:
    - "replace": Delete all existing entries, insert new (default)
    - "merge": Keep existing, add new, update duplicates by doc_id

    Processing:
    - Automatically chunks large CSVs into batches
    - Commits after each batch to avoid memory issues
    - Max file size: 50MB
    """
    pass

@router.get("/metadata-catalog")
async def get_metadata_catalog(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get all metadata catalog entries"""
    pass

@router.get("/metadata-catalog/pending-documents")
async def get_pending_documents(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get documents without metadata match"""
    pass

@router.post("/metadata-catalog/reprocess")
async def reprocess_documents_with_updated_metadata(
    document_ids: List[UUID],
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Re-process documents with updated metadata"""
    pass
```

**Deliverables**:

- ✅ CSV parsing service
- ✅ Upload endpoint
- ✅ Catalog management endpoints

---

### Phase 3: Metadata Injection During Chunking

**Files to modify**:

- `backend/services/document_processor.py`
- `backend/services/rag_service.py`
- `backend/routers/admin/rag.py`

**Changes**:

```python
# document_processor.py

def chunk_by_legal_sections(
    markdown_content: str,
    metadata: Dict[str, Any],
    csv_metadata: Optional[Dict[str, Any]] = None  # NEW
) -> List[Dict[str, Any]]:
    """
    Chunk with CSV metadata injection
    """
    # ... existing chunking logic ...

    # Build chunk metadata
    chunk_metadata = {
        **metadata,  # Base metadata
        'section_type': current_section,
        'section_number': current_section_number,
        'section_title': current_section_title,
        'chunk_type': 'legal_section'
    }

    # NEW: Inject CSV metadata
    if csv_metadata:
        # Add indexed fields at top level
        indexed_fields = [
            'doc_id', 'jurisdiction_level', 'tax_type',
            'taxpayer_type', 'status', 'doc_category',
            'authority_level', 'effective_date'
        ]
        for field in indexed_fields:
            if field in csv_metadata:
                chunk_metadata[field] = csv_metadata[field]

        # Add full metadata as JSON blob
        chunk_metadata['csv_metadata_full'] = csv_metadata

    chunks.append({
        'chunk_id': str(uuid.uuid4()),
        'text': section_text,
        'metadata': chunk_metadata
    })
```

```python
# rag_service.py

async def process_and_index_document(
    text_content: str,
    document_id: str,
    law_name: str,
    year: Optional[int] = None,
    authority: Optional[str] = None,
    jurisdiction: str = "Nigeria",
    csv_metadata: Optional[Dict[str, Any]] = None  # NEW
) -> Dict[str, Any]:
    """
    Process with CSV metadata
    """
    # ... existing code ...

    # Step 1: Convert to Markdown and chunk
    markdown_content, chunks = process_document_for_rag(
        text_content=text_content,
        law_name=law_name,
        year=year,
        authority=authority,
        jurisdiction=jurisdiction,
        csv_metadata=csv_metadata  # NEW: Pass through
    )

    # ... rest of processing ...
```

```python
# routers/admin/rag.py

async def process_document_async(
    document_id: UUID,
    file_path: str,
    file_type: str
):
    """
    Process document with CSV metadata lookup
    """
    # ... existing extraction code ...

    # NEW: Look up CSV metadata
    async with get_db_session() as db:
        from services.csv_metadata_service import lookup_metadata_by_filename

        # Get original filename from database
        result = await db.execute(
            select(RAGDocument).where(RAGDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if document and document.file_name:
            csv_metadata = await lookup_metadata_by_filename(
                document.file_name,
                db
            )

            if csv_metadata:
                # Update document with catalog reference
                document.metadata_catalog_id = csv_metadata['id']
                document.metadata_status = 'matched'
                logger.info(f"Found CSV metadata for {document.file_name}: {csv_metadata['doc_id']}")
            else:
                # No match found
                document.metadata_status = 'pending'
                logger.warning(f"No CSV metadata found for {document.file_name}")
                csv_metadata = None

            await db.commit()
        else:
            csv_metadata = None

    # Process with metadata
    result = await process_and_index_document(
        text_content=extracted_content['content_text'],
        document_id=str(document_id),
        law_name=document.title,
        csv_metadata=csv_metadata  # NEW: Pass metadata
    )
```

**Deliverables**:

- ✅ Updated chunking function
- ✅ Metadata lookup in processing pipeline
- ✅ Automatic matching and flagging

---

### Phase 4: Vector Store Updates

**Files to modify**:

- `backend/services/vector_store.py`

**Changes**:

```python
# Ensure Qdrant payload includes indexed fields

def add_chunks(
    self,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
    document_id: str
):
    """
    Add chunks with indexed CSV metadata fields
    """
    points = []
    for chunk, embedding in zip(chunks, embeddings):
        metadata = chunk['metadata']

        # Build payload with indexed fields at top level
        payload = {
            'document_id': document_id,
            'text': chunk['text'],
            'chunk_id': chunk['chunk_id'],

            # Standard metadata
            'section_type': metadata.get('section_type'),
            'section_number': metadata.get('section_number'),
            'section_title': metadata.get('section_title'),

            # CSV indexed fields (for filtering)
            'doc_id': metadata.get('doc_id'),
            'jurisdiction_level': metadata.get('jurisdiction_level'),
            'tax_type': metadata.get('tax_type'),
            'taxpayer_type': metadata.get('taxpayer_type'),
            'status': metadata.get('status'),
            'doc_category': metadata.get('doc_category'),
            'authority_level': metadata.get('authority_level'),
            'effective_date': metadata.get('effective_date'),

            # Full CSV metadata as nested object
            'csv_metadata_full': metadata.get('csv_metadata_full', {})
        }

        points.append({
            'id': chunk['chunk_id'],
            'vector': embedding,
            'payload': payload
        })

    # Upsert to Qdrant
    self.client.upsert(
        collection_name=self.collection_name,
        points=points
    )
```

**Deliverables**:

- ✅ Updated vector store to handle CSV metadata
- ✅ Indexed fields for efficient filtering

---

### Phase 5: Enhanced Query & Filtering

**Files to modify**:

- `backend/services/rag_query_service.py`

**New Functions**:

```python
def build_metadata_filter(filters: Dict[str, Any]) -> Dict:
    """
    Build Qdrant filter from metadata criteria

    Example:
    filters = {
        'jurisdiction_level': 'Federal',
        'status': 'Enacted/Active',
        'tax_type': {'contains': 'Income Tax'}
    }
    """
    must_conditions = []

    for field, value in filters.items():
        if isinstance(value, dict):
            # Complex filter (contains, range, etc.)
            if 'contains' in value:
                must_conditions.append({
                    'key': field,
                    'match': {'text': value['contains']}
                })
        else:
            # Exact match
            must_conditions.append({
                'key': field,
                'match': {'value': value}
            })

    return {'must': must_conditions} if must_conditions else None

async def query_with_metadata_filters(
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Query with metadata filtering
    """
    # Generate embedding
    embedding = embedding_service.embed_text(query)

    # Build filter
    qdrant_filter = build_metadata_filter(filters) if filters else None

    # Search
    results = vector_store.search(
        query_vector=embedding,
        filter=qdrant_filter,
        limit=limit
    )

    return results
```

**Deliverables**:

- ✅ Metadata filtering in queries
- ✅ Enhanced retrieval capabilities

---

## Testing Plan

### Unit Tests

1. **CSV Parsing**:

   - Valid CSV with all columns
   - CSV with missing optional columns
   - CSV with duplicate doc_ids
   - CSV with invalid encoding

2. **Filename Matching**:

   - Exact match
   - Case-insensitive match
   - Match with different separators
   - No match found

3. **Metadata Injection**:
   - Chunk with CSV metadata
   - Chunk without CSV metadata
   - All 23 columns present
   - Partial columns present

### Integration Tests

1. **End-to-End Flow**:

   - Upload CSV catalog
   - Upload PDF document
   - Verify metadata in chunks
   - Query with metadata filters

2. **Re-processing**:
   - Upload CSV v1
   - Upload document
   - Upload CSV v2 (updated metadata)
   - Re-process document
   - Verify updated metadata in vector DB

### Manual Testing

1. Upload sample CSV from `knowledge_sources_15.01.2025.csv`
2. Upload matching PDFs
3. Verify metadata in admin UI
4. Test queries with filters
5. Test re-processing workflow

---

## Admin UI Requirements

### Integration with Existing RAG Management Page

**File**: `frontend/src/pages/admin/RAG.tsx`

All CSV metadata features will be integrated into the existing RAG management page. No new pages will be created.

### UI Enhancements

#### 1. **CSV Metadata Catalog Section** (New Card Component)

Add a new card above the Vector Database Statistics card:

```tsx
{
  /* CSV Metadata Catalog - NEW SECTION */
}
<Card className="mb-6 p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <FileText className="w-5 h-5 text-primary" />
      <h2 className="text-lg font-semibold">Metadata Catalog</h2>
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setMetadataCatalogViewOpen(true)}
        className="flex items-center gap-2"
      >
        <Database className="w-4 h-4" />
        View Catalog ({catalogEntriesCount} entries)
      </Button>
      <Button
        variant="primary"
        onClick={() => setCsvUploadDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload CSV Catalog
      </Button>
    </div>
  </div>

  {/* Catalog Stats */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Total Entries</div>
      <div className="text-2xl font-bold text-gray-900">
        {catalogEntriesCount}
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Matched Documents</div>
      <div className="text-2xl font-bold text-green-600">
        {matchedDocsCount}
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Pending Review</div>
      <div className="text-2xl font-bold text-orange-600">
        {pendingDocsCount}
      </div>
    </div>
  </div>

  {/* Pending Documents Alert */}
  {pendingDocsCount > 0 && (
    <Alert severity="warning" className="mt-4">
      {pendingDocsCount} document(s) uploaded without metadata.
      <button
        onClick={() => setPendingReviewDialogOpen(true)}
        className="ml-2 underline font-medium"
      >
        Review now
      </button>
    </Alert>
  )}
</Card>;
```

#### 2. **Enhanced Document Table** (Modify Existing Table)

Add new columns to show metadata status:

```tsx
{
  /* Add new column header */
}
<th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Metadata
</th>;

{
  /* Add new column data */
}
<td className="px-4 sm:px-6 py-4 whitespace-nowrap">
  {doc.metadata_status === "matched" ? (
    <div className="flex items-center gap-1">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-xs text-green-700">Matched</span>
    </div>
  ) : doc.metadata_status === "pending" ? (
    <div className="flex items-center gap-1">
      <AlertCircle className="w-4 h-4 text-orange-600" />
      <span className="text-xs text-orange-700">Pending</span>
    </div>
  ) : (
    <span className="text-xs text-gray-500">-</span>
  )}
</td>;
```

#### 3. **CSV Upload Modal** (New Modal)

```tsx
<Modal
  open={csvUploadDialogOpen}
  onClose={() => setCsvUploadDialogOpen(false)}
  title="Upload Metadata Catalog CSV"
  size="lg"
>
  <div className="space-y-4">
    {/* Upload Mode Selection */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Mode
      </label>
      <select
        value={csvUploadMode}
        onChange={(e) => setCsvUploadMode(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="replace">Replace All (Delete existing catalog)</option>
        <option value="merge">Merge (Add new, update existing)</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        {csvUploadMode === "replace"
          ? "All existing catalog entries will be deleted and replaced with new data"
          : "New entries will be added, existing entries (by doc_id) will be updated"}
      </p>
    </div>

    {/* File Upload */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        CSV File <span className="text-red-500">*</span>
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={handleCsvFileSelect}
        className="w-full"
      />
      <p className="text-xs text-gray-500 mt-1">
        Max file size: 50MB. For larger files, split and upload with "Merge"
        mode.
      </p>
    </div>

    {/* Preview */}
    {csvFile && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>Selected:</strong> {csvFile.name} (
          {formatFileSize(csvFile.size)})
        </p>
      </div>
    )}

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
      <Button variant="outline" onClick={() => setCsvUploadDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleCsvUpload}
        disabled={!csvFile || uploadingCsv}
      >
        {uploadingCsv ? "Uploading..." : "Upload Catalog"}
      </Button>
    </div>
  </div>
</Modal>
```

#### 4. **Catalog Viewer Modal** (New Modal)

```tsx
<Modal
  open={metadataCatalogViewOpen}
  onClose={() => setMetadataCatalogViewOpen(false)}
  title="Metadata Catalog Entries"
  size="xl"
>
  <div className="space-y-4">
    {/* Search/Filter */}
    <Input
      placeholder="Search by doc_id, filename, or title..."
      value={catalogSearchQuery}
      onChange={(e) => setCatalogSearchQuery(e.target.value)}
    />

    {/* Catalog Table */}
    <div className="overflow-x-auto max-h-96">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Doc ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Filename
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Jurisdiction
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCatalogEntries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{entry.doc_id}</td>
              <td className="px-4 py-3 text-sm">{entry.file_name}</td>
              <td className="px-4 py-3 text-sm">{entry.source_title}</td>
              <td className="px-4 py-3 text-sm">{entry.jurisdiction_level}</td>
              <td className="px-4 py-3 text-sm">{entry.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</Modal>
```

#### 5. **Pending Metadata Review Modal** (New Modal)

```tsx
<Modal
  open={pendingReviewDialogOpen}
  onClose={() => setPendingReviewDialogOpen(false)}
  title="Documents Pending Metadata Assignment"
  size="lg"
>
  <div className="space-y-4">
    <Alert severity="info">
      These documents were uploaded but no matching metadata was found in the
      catalog. You can manually assign metadata or upload an updated CSV
      catalog.
    </Alert>

    {/* Pending Documents List */}
    <div className="space-y-3">
      {pendingDocuments.map((doc) => (
        <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{doc.title}</p>
              <p className="text-sm text-gray-600">{doc.file_name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAssignMetadata(doc.id)}
            >
              Assign Metadata
            </Button>
          </div>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex justify-between pt-4 border-t border-gray-200">
      <Button variant="outline" onClick={() => setCsvUploadDialogOpen(true)}>
        Upload Updated CSV
      </Button>
      <Button
        variant="outline"
        onClick={() => setPendingReviewDialogOpen(false)}
      >
        Close
      </Button>
    </div>
  </div>
</Modal>
```

#### 6. **Enhanced Bulk Reprocess Modal** (Modify Existing)

Add option to reprocess documents with updated metadata:

```tsx
{
  /* Add to existing bulk reprocess modal */
}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
  <p className="text-sm text-blue-900">
    <strong>Note:</strong> After uploading an updated CSV catalog, use this to
    re-process documents with new metadata.
  </p>
</div>;

{
  /* Add filter option */
}
<div>
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={bulkReprocessFilter.metadataUpdated}
      onChange={(e) =>
        setBulkReprocessFilter({
          ...bulkReprocessFilter,
          metadataUpdated: e.target.checked,
        })
      }
    />
    <span className="text-sm">Only documents with updated metadata</span>
  </label>
</div>;
```

### New State Variables

Add to existing component state:

```tsx
const [csvUploadDialogOpen, setCsvUploadDialogOpen] = useState(false);
const [metadataCatalogViewOpen, setMetadataCatalogViewOpen] = useState(false);
const [pendingReviewDialogOpen, setPendingReviewDialogOpen] = useState(false);
const [csvFile, setCsvFile] = useState<File | null>(null);
const [csvUploadMode, setCsvUploadMode] = useState<"replace" | "merge">(
  "replace"
);
const [uploadingCsv, setUploadingCsv] = useState(false);
const [catalogEntries, setCatalogEntries] = useState<MetadataCatalogEntry[]>(
  []
);
const [catalogEntriesCount, setCatalogEntriesCount] = useState(0);
const [matchedDocsCount, setMatchedDocsCount] = useState(0);
const [pendingDocsCount, setPendingDocsCount] = useState(0);
const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
const [pendingDocuments, setPendingDocuments] = useState<RAGDocument[]>([]);
```

### New Handler Functions

```tsx
const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setCsvFile(file);
  }
};

const handleCsvUpload = async () => {
  if (!csvFile) return;

  try {
    setUploadingCsv(true);
    setError(null);
    const result = await adminAPI.uploadMetadataCatalog(csvFile, csvUploadMode);

    alert(
      `Catalog uploaded successfully!\n` +
        `Total rows: ${result.total_rows}\n` +
        `Inserted: ${result.inserted}\n` +
        `Updated: ${result.updated}\n` +
        `Errors: ${result.errors.length}`
    );

    setCsvUploadDialogOpen(false);
    setCsvFile(null);
    loadCatalogStats();
    loadDocuments();
  } catch (err: any) {
    setError(err.response?.data?.detail || "Failed to upload CSV catalog");
  } finally {
    setUploadingCsv(false);
  }
};

const loadCatalogStats = async () => {
  try {
    const stats = await adminAPI.getMetadataCatalogStats();
    setCatalogEntriesCount(stats.total_entries);
    setMatchedDocsCount(stats.matched_documents);
    setPendingDocsCount(stats.pending_documents);
  } catch (err) {
    console.error("Failed to load catalog stats:", err);
  }
};

const loadPendingDocuments = async () => {
  try {
    const docs = await adminAPI.getPendingDocuments();
    setPendingDocuments(docs);
  } catch (err) {
    console.error("Failed to load pending documents:", err);
  }
};
```

### Summary of Changes

1. ✅ **No new pages** - All features integrated into existing `RAG.tsx`
2. ✅ **New card section** for CSV metadata catalog (above vector stats)
3. ✅ **Enhanced table** with metadata status column
4. ✅ **3 new modals**: CSV upload, catalog viewer, pending review
5. ✅ **Enhanced bulk reprocess** modal with metadata filter
6. ✅ **Minimal disruption** to existing functionality
7. ✅ **Consistent design** with existing UI patterns

---

## Migration Strategy

### Step 1: Database Migration

```bash
# Create migration
cd backend
alembic revision -m "Add document metadata catalog"

# Apply migration
alembic upgrade head
```

### Step 2: Upload CSV Catalog

```bash
# Via admin UI or API
curl -X POST http://localhost:8000/api/admin/rag/metadata-catalog/upload \
  -F "file=@knowledge_sources_15.01.2025.csv"
```

### Step 3: Delete Existing Documents

```bash
# Via admin UI: Delete all RAG documents
# This clears both database and vector store
```

### Step 4: Re-upload Documents

```bash
# Upload PDFs via admin UI
# System will auto-match with CSV metadata
```

---

## Performance Considerations

1. **CSV Upload**: O(n) where n = number of rows

   - Expected: < 1 second for 100 rows
   - Use bulk insert for efficiency

2. **Filename Matching**: O(1) with index on `file_name_normalized`

   - Expected: < 10ms per lookup

3. **Re-processing**: O(n) where n = number of documents

   - Expected: ~30 seconds per document (extraction + chunking + embedding)
   - Run as background task with progress tracking

4. **Vector DB Payload Size**:
   - Indexed fields: ~500 bytes per chunk
   - Full CSV metadata: ~2KB per chunk
   - Total: ~2.5KB per chunk (acceptable)

---

## Batch Upload Scenarios

### Scenario 1: Small CSV (Initial Upload)

**File**: `knowledge_sources_15.01.2025.csv` (5 rows, ~7KB)

```bash
POST /api/admin/rag/metadata-catalog/upload
- mode: "replace"
- batch_size: 100 (default)

Result:
- Total rows: 5
- Inserted: 5
- Updated: 0
- Processing time: < 1 second
```

### Scenario 2: Medium CSV (100-500 rows)

**File**: `knowledge_sources_full.csv` (500 rows, ~700KB)

```bash
POST /api/admin/rag/metadata-catalog/upload
- mode: "replace"
- batch_size: 100

Processing:
- Batch 1: Rows 1-100 (committed)
- Batch 2: Rows 101-200 (committed)
- Batch 3: Rows 201-300 (committed)
- Batch 4: Rows 301-400 (committed)
- Batch 5: Rows 401-500 (committed)

Result:
- Total rows: 500
- Inserted: 500
- Updated: 0
- Processing time: ~5 seconds
```

### Scenario 3: Large CSV (1000+ rows)

**File**: `knowledge_sources_large.csv` (2000 rows, ~2.8MB)

```bash
POST /api/admin/rag/metadata-catalog/upload
- mode: "replace"
- batch_size: 100

Processing:
- 20 batches of 100 rows each
- Each batch commits separately
- Memory-efficient processing

Result:
- Total rows: 2000
- Inserted: 2000
- Updated: 0
- Processing time: ~15 seconds
```

### Scenario 4: Very Large CSV (Manual Split)

**Files**: Split into 3 files (10,000 rows total, ~14MB)

- `batch_1.csv` (3333 rows)
- `batch_2.csv` (3333 rows)
- `batch_3.csv` (3334 rows)

```bash
# Upload 1
POST /api/admin/rag/metadata-catalog/upload
- file: batch_1.csv
- mode: "replace"  # Clear existing
Result: 3333 inserted

# Upload 2
POST /api/admin/rag/metadata-catalog/upload
- file: batch_2.csv
- mode: "merge"  # Add to existing
Result: 3333 inserted

# Upload 3
POST /api/admin/rag/metadata-catalog/upload
- file: batch_3.csv
- mode: "merge"  # Add to existing
Result: 3334 inserted

Total: 10,000 rows in catalog
```

### Scenario 5: Incremental Updates

**File**: `knowledge_sources_new_2026.csv` (50 new documents)

```bash
POST /api/admin/rag/metadata-catalog/upload
- mode: "merge"  # Keep existing 2000 rows
- batch_size: 100

Result:
- Total rows: 50
- Inserted: 50 (new documents)
- Updated: 0
- Final catalog size: 2050 rows
```

### Scenario 6: Metadata Updates

**File**: `knowledge_sources_updated.csv` (2000 rows, 200 with updated metadata)

```bash
POST /api/admin/rag/metadata-catalog/upload
- mode: "merge"  # Update existing by doc_id
- batch_size: 100

Result:
- Total rows: 2000
- Inserted: 0
- Updated: 200 (matched by doc_id)
- Unchanged: 1800

Next step: Re-process 200 documents with updated metadata
```

### File Size Limits

| CSV Size | Rows (est.) | Upload Mode             | Processing Time  |
| -------- | ----------- | ----------------------- | ---------------- |
| < 1MB    | < 700       | Single upload           | < 5 seconds      |
| 1-10MB   | 700-7000    | Single upload (batched) | 5-60 seconds     |
| 10-50MB  | 7000-35000  | Single upload (batched) | 1-5 minutes      |
| > 50MB   | > 35000     | Manual split + merge    | Multiple uploads |

**Recommendation**:

- Files < 10MB: Upload directly
- Files 10-50MB: Upload directly (will auto-batch)
- Files > 50MB: Split into smaller files and upload with `mode="merge"`

---

## Security Considerations

1. **CSV Upload**: Admin-only permission (`CONTENT_WRITE`)
2. **File Validation**: Check CSV format, size limits (max 10MB)
3. **SQL Injection**: Use parameterized queries (SQLAlchemy ORM)
4. **Data Sanitization**: Escape special characters in CSV values

---

## Future Enhancements

1. **CSV Versioning**: Track history of catalog uploads
2. **Metadata Templates**: Pre-defined templates for common document types
3. **Auto-extraction**: Extract metadata from PDF metadata/OCR
4. **Bulk Edit**: Edit multiple catalog entries at once
5. **Metadata Validation**: Optional schema validation for specific fields
6. **API Export**: Export filtered documents with metadata as CSV

---

## Success Criteria

✅ Admin can upload CSV catalog with 23 metadata columns  
✅ Documents auto-match with CSV entries by filename  
✅ All chunks contain injected CSV metadata  
✅ Queries can filter by CSV metadata fields  
✅ Re-processing updates metadata in vector DB  
✅ Documents without metadata are flagged for review  
✅ No performance degradation in query/upload flows  
✅ **Batch processing handles large CSVs (up to 50MB)**  
✅ **Merge mode allows incremental catalog updates**  
✅ **Manual batching supported for very large files (>50MB)**

---

## Timeline Estimate

- **Phase 1** (Database & Models): 2 hours
- **Phase 2** (CSV Upload & Parsing): 4 hours
- **Phase 3** (Metadata Injection): 3 hours
- **Phase 4** (Vector Store Updates): 2 hours
- **Phase 5** (Enhanced Queries): 2 hours
- **Testing**: 3 hours
- **Documentation**: 1 hour

**Total**: ~17 hours (2-3 days)

---

## Ready for Implementation? ✅

All design decisions finalized. Implementation can begin.
