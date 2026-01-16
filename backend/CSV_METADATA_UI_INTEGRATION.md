# CSV Metadata Integration - UI Integration Plan

## Overview

All CSV metadata features will be integrated into the **existing RAG Management page** (`frontend/src/pages/admin/RAG.tsx`). No new pages will be created.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ RAG Management                                    [Buttons] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─── NEW: CSV Metadata Catalog Card ──────────────────────┐ │
│ │ Metadata Catalog          [View Catalog] [Upload CSV]   │ │
│ │                                                          │ │
│ │ ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│ │ │ Total    │  │ Matched  │  │ Pending  │              │ │
│ │ │ Entries  │  │ Docs     │  │ Review   │              │ │
│ │ │   150    │  │   145    │  │    5     │              │ │
│ │ └──────────┘  └──────────┘  └──────────┘              │ │
│ │                                                          │ │
│ │ ⚠️ 5 document(s) uploaded without metadata. [Review now]│ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── EXISTING: Vector Database Statistics ────────────────┐ │
│ │ Vector Database Statistics        [Open Qdrant Web UI]  │ │
│ │                                                          │ │
│ │ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│ │
│ │ │ Total    │  │ Indexed  │  │ Vector   │  │ Distance │ │
│ │ │ Chunks   │  │ Vectors  │  │ Size     │  │ Metric   │ │
│ │ │  1,234   │  │  1,234   │  │  384D    │  │  Cosine  │ │
│ │ └──────────┘  └──────────┘  └──────────┘  └──────────┘│ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── ENHANCED: Documents Table ────────────────────────────┐ │
│ │ Title  Type  Source  Size  Status  Chunks  Metadata  ... │ │
│ │ ─────────────────────────────────────────────────────────│ │
│ │ NTA    file  ...     2MB   ✓       45      ✓ Matched  ...│ │
│ │ JRBN   file  ...     1MB   ✓       32      ⚠ Pending  ...│ │
│ │ ...                                                       │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## New Modals

### 1. CSV Upload Modal

```
┌─────────────────────────────────────────────┐
│ Upload Metadata Catalog CSV           [X]   │
├─────────────────────────────────────────────┤
│                                             │
│ Upload Mode:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ ▼ Replace All (Delete existing catalog)│ │
│ └─────────────────────────────────────────┘ │
│ All existing catalog entries will be        │
│ deleted and replaced with new data          │
│                                             │
│ CSV File: *                                 │
│ [Choose File] knowledge_sources.csv         │
│ Max file size: 50MB. For larger files,      │
│ split and upload with "Merge" mode.         │
│                                             │
│ ℹ️ Selected: knowledge_sources.csv (700KB)  │
│                                             │
│                        [Cancel] [Upload]    │
└─────────────────────────────────────────────┘
```

### 2. Catalog Viewer Modal

```
┌─────────────────────────────────────────────────────┐
│ Metadata Catalog Entries                      [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Search by doc_id, filename, or title...]          │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Doc ID  │ Filename     │ Title    │ Jurisdiction││
│ │─────────┼──────────────┼──────────┼─────────────││
│ │ NTA-25  │ NTA_2025.PDF │ Nigeria  │ Federal     ││
│ │ JRBN-25 │ JRBN_2025... │ Joint... │ National    ││
│ │ ...                                             ││
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                                        [Close]      │
└─────────────────────────────────────────────────────┘
```

### 3. Pending Review Modal

```
┌─────────────────────────────────────────────────────┐
│ Documents Pending Metadata Assignment         [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ℹ️ These documents were uploaded but no matching    │
│   metadata was found in the catalog.                │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Tax Regulation 2026                             │ │
│ │ tax_regulation_2026.pdf                         │ │
│ │                          [Assign Metadata]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ New Law Document                                │ │
│ │ new_law.pdf                                     │ │
│ │                          [Assign Metadata]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Upload Updated CSV]                    [Close]    │
└─────────────────────────────────────────────────────┘
```

---

## Integration Points

### State Variables (Add to existing)

```tsx
// CSV Metadata states
const [csvUploadDialogOpen, setCsvUploadDialogOpen] = useState(false);
const [metadataCatalogViewOpen, setMetadataCatalogViewOpen] = useState(false);
const [pendingReviewDialogOpen, setPendingReviewDialogOpen] = useState(false);
const [csvFile, setCsvFile] = useState<File | null>(null);
const [csvUploadMode, setCsvUploadMode] = useState<"replace" | "merge">(
  "replace"
);
const [uploadingCsv, setUploadingCsv] = useState(false);
const [catalogEntriesCount, setCatalogEntriesCount] = useState(0);
const [matchedDocsCount, setMatchedDocsCount] = useState(0);
const [pendingDocsCount, setPendingDocsCount] = useState(0);
```

### API Functions (Add to adminAPI.ts)

```tsx
// Upload CSV catalog
uploadMetadataCatalog(file: File, mode: 'replace' | 'merge'): Promise<{
  total_rows: number
  inserted: number
  updated: number
  errors: any[]
}>

// Get catalog stats
getMetadataCatalogStats(): Promise<{
  total_entries: number
  matched_documents: number
  pending_documents: number
}>

// Get pending documents
getPendingDocuments(): Promise<RAGDocument[]>

// Get catalog entries
getMetadataCatalog(skip?: number, limit?: number): Promise<MetadataCatalogEntry[]>
```

### Document Table Enhancement

**Add new column:**

- Header: "Metadata"
- Data: Shows ✓ Matched (green) or ⚠ Pending (orange) badge
- Position: Between "Chunks" and "Created" columns

---

## User Workflow

### Initial Setup

1. Admin clicks **"Upload CSV Catalog"** button
2. Selects CSV file (`knowledge_sources_15.01.2025.csv`)
3. Chooses mode: **"Replace All"** (first time)
4. Clicks **"Upload"**
5. System shows: "5 entries inserted"
6. Catalog stats update: Total Entries: 5

### Upload Documents

1. Admin clicks **"Upload File"** (existing button)
2. Selects PDF: `NIGERIA_TAX_ACT_2025.PDF`
3. Enters title: "Nigeria Tax Act, 2025"
4. Clicks **"Upload"**
5. System:
   - Normalizes filename: `nigeriataxact2025pdf`
   - Finds match in catalog (doc_id: NTA-2025)
   - Injects metadata during chunking
   - Sets `metadata_status = 'matched'`
6. Document table shows: ✓ Matched (green badge)

### Handle Missing Metadata

1. Admin uploads `NEW_REGULATION_2026.PDF`
2. System finds no match in catalog
3. Sets `metadata_status = 'pending'`
4. Catalog card shows: "Pending Review: 1" (orange)
5. Alert appears: "1 document(s) uploaded without metadata. [Review now]"
6. Admin clicks **"Review now"**
7. Pending Review Modal opens
8. Admin can:
   - Upload updated CSV with new entry
   - Manually assign metadata (future feature)

### Update Metadata

1. Admin uploads updated CSV with `mode = 'merge'`
2. System updates 5 existing entries
3. Catalog stats show: "Updated: 5"
4. Admin clicks **"Bulk Reprocess"**
5. Selects: "Only documents with updated metadata"
6. System re-processes 5 documents with new metadata
7. Vector DB updated with new metadata

---

## Benefits

✅ **No new pages** - Everything in one place  
✅ **Minimal disruption** - Existing features unchanged  
✅ **Clear visibility** - Catalog stats prominently displayed  
✅ **Proactive alerts** - Pending documents flagged immediately  
✅ **Consistent design** - Matches existing UI patterns  
✅ **Efficient workflow** - Upload → Match → Review → Reprocess

---

## Implementation Checklist

### Backend (Already specified)

- [ ] Database migration (add `document_metadata_catalog` table)
- [ ] CSV upload endpoint
- [ ] Catalog stats endpoint
- [ ] Pending documents endpoint
- [ ] Metadata lookup during document processing

### Frontend (New)

- [ ] Add CSV Metadata Catalog card component
- [ ] Add "Metadata" column to documents table
- [ ] Create CSV Upload modal
- [ ] Create Catalog Viewer modal
- [ ] Create Pending Review modal
- [ ] Add state variables and handlers
- [ ] Update `adminAPI.ts` with new endpoints
- [ ] Add TypeScript interfaces for catalog entries

### Testing

- [ ] Upload CSV catalog (replace mode)
- [ ] Upload CSV catalog (merge mode)
- [ ] Upload document with matching metadata
- [ ] Upload document without matching metadata
- [ ] View catalog entries
- [ ] Review pending documents
- [ ] Bulk reprocess with metadata filter

---

Ready to implement! 🚀
