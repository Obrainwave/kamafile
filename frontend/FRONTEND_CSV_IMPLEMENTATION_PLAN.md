# Frontend CSV Metadata Integration - Implementation Plan

## Changes to RAG.tsx

### 1. State Variables (✅ DONE)

Added CSV metadata state variables:

- `csvUploadDialogOpen`
- `csvFile`
- `csvUploadMode`
- `uploadingCsv`
- `catalogStats`
- `catalogViewerOpen`
- `pendingReviewOpen`
- `csvFileInputRef`

### 2. Handler Functions (TO ADD)

Add after `formatFileSize` function (line 461):

```typescript
// CSV Metadata Handlers
const loadCatalogStats = async () => {
  try {
    const stats = await adminAPI.getMetadataCatalogStats();
    setCatalogStats(stats);
  } catch (err: any) {
    console.error("Failed to load catalog stats:", err);
  }
};

const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setCsvFile(file);
  }
};

const handleCsvUpload = async () => {
  if (!csvFile) {
    setError("Please select a CSV file");
    return;
  }

  try {
    setUploadingCsv(true);
    setError(null);
    const result = await adminAPI.uploadMetadataCatalog(csvFile, csvUploadMode);

    alert(
      `CSV uploaded successfully!\nTotal rows: ${result.total_rows}\nInserted: ${result.inserted}\nUpdated: ${result.updated}`
    );

    setCsvUploadDialogOpen(false);
    setCsvFile(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
    loadCatalogStats();
    loadDocuments();
  } catch (err: any) {
    setError(err.response?.data?.detail || "Failed to upload CSV catalog");
  } finally {
    setUploadingCsv(false);
  }
};

const getMetadataStatusBadge = (doc: RAGDocument) => {
  if (!doc.metadata_status) return null;

  switch (doc.metadata_status) {
    case "matched":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Matched
        </span>
      );
    case "pending":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Pending
        </span>
      );
    case "manual":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
          Manual
        </span>
      );
    default:
      return <span className="text-gray-400">-</span>;
  }
};
```

### 3. useEffect Update (TO ADD)

Update the useEffect to load catalog stats:

```typescript
useEffect(() => {
  loadDocuments();
  loadVectorStoreInfo(true);
  loadCatalogStats(); // NEW

  const interval = setInterval(() => {
    loadDocuments();
    loadVectorStoreInfo(false);
    loadCatalogStats(); // NEW
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

### 4. CSV Metadata Catalog Card (TO ADD)

Add BEFORE the Vector Database Statistics card (before line 433):

```tsx
{
  /* CSV Metadata Catalog */
}
<Card className="mb-6 p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <FileUp className="w-5 h-5 text-primary" />
      <h2 className="text-lg font-semibold">Metadata Catalog</h2>
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCatalogViewerOpen(true)}
        className="flex items-center gap-2"
      >
        <Database className="w-4 h-4" />
        View Catalog
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setCsvUploadDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload CSV Catalog
      </Button>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Total Entries</div>
      <div className="text-2xl font-bold text-gray-900">
        {catalogStats?.total_entries ?? 0}
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Matched Documents</div>
      <div className="text-2xl font-bold text-green-600">
        {catalogStats?.matched_documents ?? 0}
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">Pending Review</div>
      <div className="text-2xl font-bold text-orange-600">
        {catalogStats?.pending_documents ?? 0}
      </div>
    </div>
  </div>

  {catalogStats && catalogStats.pending_documents > 0 && (
    <Alert severity="warning" className="mt-4">
      <div className="flex items-center justify-between">
        <span>
          {catalogStats.pending_documents} document(s) uploaded without
          metadata.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPendingReviewOpen(true)}
        >
          Review Now
        </Button>
      </div>
    </Alert>
  )}
</Card>;
```

### 5. Update Document Table (TO ADD)

Add "Metadata" column header after "Chunks" column (around line 530):

```tsx
<th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
  Metadata
</th>
```

Add metadata cell in table body (after chunks cell, around line 604):

```tsx
<td className="px-4 sm:px-6 py-4 whitespace-nowrap">
  {getMetadataStatusBadge(doc)}
</td>
```

### 6. CSV Upload Modal (TO ADD)

Add at the end, before closing Container tag:

```tsx
{
  /* CSV Upload Modal */
}
<Modal
  open={csvUploadDialogOpen}
  onClose={() => {
    setCsvUploadDialogOpen(false);
    setCsvFile(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  }}
  title="Upload Metadata Catalog CSV"
  size="md"
>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Mode
      </label>
      <select
        value={csvUploadMode}
        onChange={(e) =>
          setCsvUploadMode(e.target.value as "replace" | "merge")
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="replace">Replace All (Delete existing catalog)</option>
        <option value="merge">Merge (Add new, update existing)</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        {csvUploadMode === "replace"
          ? "All existing catalog entries will be deleted and replaced with new data"
          : "New entries will be added, existing entries (matched by doc_id) will be updated"}
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        CSV File <span className="text-red-500">*</span>
      </label>
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCsvFileSelect}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <p className="text-xs text-gray-500 mt-1">
        Max file size: 50MB. For larger files, split and upload with "Merge"
        mode.
      </p>
      {csvFile && (
        <p className="text-sm text-gray-700 mt-2">
          Selected: <span className="font-medium">{csvFile.name}</span> (
          {formatFileSize(csvFile.size)})
        </p>
      )}
    </div>

    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
      <Button
        variant="outline"
        onClick={() => {
          setCsvUploadDialogOpen(false);
          setCsvFile(null);
          if (csvFileInputRef.current) {
            csvFileInputRef.current.value = "";
          }
        }}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleCsvUpload}
        disabled={!csvFile || uploadingCsv}
      >
        {uploadingCsv ? "Uploading..." : "Upload"}
      </Button>
    </div>
  </div>
</Modal>;
```

---

## Next Steps

1. Add handler functions
2. Update useEffect
3. Add CSV Metadata Catalog card
4. Update document table
5. Add CSV upload modal
6. Add adminAPI functions (separate file)

**Status**: Ready to implement step by step
