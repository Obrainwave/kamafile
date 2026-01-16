import { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Upload,
  Link as LinkIcon,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  Globe,
  Copy,
  Check,
  Database,
  ExternalLink,
  FileUp,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  adminAPI,
  RAGDocument,
  VectorStoreInfo,
} from "../../services/adminAPI";
import Container from "../../components/ui/Container";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

export default function AdminRAG() {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vectorStoreInfo, setVectorStoreInfo] =
    useState<VectorStoreInfo | null>(null);
  const [loadingVectorInfo, setLoadingVectorInfo] = useState(true); // Start as true for initial load
  const [isPolling, setIsPolling] = useState(false); // Track if we're polling (updating in background)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: "",
    file: null as File | null,
  });
  const [urlFormData, setUrlFormData] = useState({ title: "", url: "" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);
  const [bulkReprocessDialogOpen, setBulkReprocessDialogOpen] = useState(false);
  const [bulkReprocessing, setBulkReprocessing] = useState(false);
  const [bulkReprocessFilter, setBulkReprocessFilter] = useState<{
    status?: string;
    sourceType?: string;
  }>({});
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // CSV Metadata state
  const [csvUploadDialogOpen, setCsvUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadMode, setCsvUploadMode] = useState<"replace" | "merge">(
    "replace"
  );
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [catalogStats, setCatalogStats] = useState<{
    total_entries: number;
    matched_documents: number;
    pending_documents: number;
  } | null>(null);
  const [catalogViewerOpen, setCatalogViewerOpen] = useState(false);
  const [pendingReviewOpen, setPendingReviewOpen] = useState(false);

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<RAGDocument | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Catalog Viewer State
  const [catalogEntries, setCatalogEntries] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState("");
  const CATALOG_PAGE_SIZE = 10;

  // Pending Review State
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [pendingDocsLoading, setPendingDocsLoading] = useState(false);

  // Load Catalog Entries when modal opens or page/search changes
  useEffect(() => {
    if (catalogViewerOpen) {
      loadCatalogEntries();
    }
  }, [catalogViewerOpen, catalogPage, catalogSearch]);

  // Load Pending Docs when modal opens
  useEffect(() => {
    if (pendingReviewOpen) {
      loadPendingDocs();
    }
  }, [pendingReviewOpen]);

  const loadCatalogEntries = async () => {
    try {
      setCatalogLoading(true);
      const entries = await adminAPI.getMetadataCatalog({
        skip: catalogPage * CATALOG_PAGE_SIZE,
        limit: CATALOG_PAGE_SIZE,
        search: catalogSearch
      });
      setCatalogEntries(entries);
    } catch (err) {
      console.error("Failed to load catalog entries:", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadPendingDocs = async () => {
    try {
      setPendingDocsLoading(true);
      const docs = await adminAPI.getPendingDocuments();
      setPendingDocs(docs);
    } catch (err) {
      console.error("Failed to load pending documents:", err);
    } finally {
      setPendingDocsLoading(false);
    }
  };

  // Metadata Viewer Modal State
  const [metadataViewerOpen, setMetadataViewerOpen] = useState(false);
  const [selectedMetadataDoc, setSelectedMetadataDoc] = useState<RAGDocument | null>(null);

  const handleViewMetadata = (doc: RAGDocument) => {
    setSelectedMetadataDoc(doc);
    setMetadataViewerOpen(true);
  };





  useEffect(() => {
    loadDocuments();
    loadVectorStoreInfo(true); // Pass true for initial load
    loadCatalogStats(); // NEW: Load catalog stats
    // Poll for status updates every 5 seconds
    const interval = setInterval(() => {
      loadDocuments(false); // Pass false for polling (background update)
      loadVectorStoreInfo(false); // Pass false for polling (background update)
      loadCatalogStats(); // NEW: Poll catalog stats
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadVectorStoreInfo = async (isInitialLoad: boolean = false) => {
    try {
      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoadingVectorInfo(true);
      } else {
        setIsPolling(true); // Use polling state instead of loading state
      }

      const info = await adminAPI.getVectorStoreInfo();
      console.log(
        "Vector store info loaded (raw):",
        JSON.stringify(info, null, 2)
      ); // Debug log

      // Normalize the data - ensure all numeric fields are numbers, not undefined
      const normalizedInfo: VectorStoreInfo = {
        qdrant_host: info?.qdrant_host || "localhost",
        qdrant_port: info?.qdrant_port || 6333,
        web_ui_url: info?.web_ui_url || "http://localhost:6333/dashboard",
        collection_info: {
          name: info?.collection_info?.name || "tax_legal_documents",
          points_count:
            typeof info?.collection_info?.points_count === "number"
              ? info.collection_info.points_count
              : typeof info?.collection_info?.vectors_count === "number"
              ? info.collection_info.vectors_count
              : 0,
          vectors_count:
            typeof info?.collection_info?.vectors_count === "number"
              ? info.collection_info.vectors_count
              : typeof info?.collection_info?.points_count === "number"
              ? info.collection_info.points_count
              : 0,
          indexed_vectors_count: (() => {
            const pointsCount =
              typeof info?.collection_info?.points_count === "number"
                ? info.collection_info.points_count
                : typeof info?.collection_info?.vectors_count === "number"
                ? info.collection_info.vectors_count
                : 0;
            const indexedCount =
              typeof info?.collection_info?.indexed_vectors_count === "number"
                ? info.collection_info.indexed_vectors_count
                : null;

            // If indexed_vectors_count is 0 but we have points, all points are searchable (just not optimally indexed)
            // Show points_count as indexed for user clarity
            if (indexedCount === 0 && pointsCount > 0) {
              return pointsCount; // All points are searchable
            }
            return indexedCount ?? pointsCount; // Use indexed count if available, otherwise points_count
          })(),
          status: info?.collection_info?.status || "unknown",
          config: {
            vector_size:
              typeof info?.collection_info?.config?.vector_size === "number"
                ? info.collection_info.config.vector_size
                : 384,
            distance: info?.collection_info?.config?.distance || "Cosine",
          },
        },
      };

      console.log(
        "Vector store info normalized:",
        JSON.stringify(normalizedInfo, null, 2)
      );
      console.log(
        "Points count value:",
        normalizedInfo.collection_info.points_count
      );
      setVectorStoreInfo(normalizedInfo);
    } catch (err: any) {
      console.error("Failed to load vector store info:", err);
      console.error("Error details:", err.response?.data || err.message || err);
      // Only set error structure if we don't have existing data or it's initial load
      if (!vectorStoreInfo || isInitialLoad) {
        setVectorStoreInfo({
          qdrant_host: "localhost",
          qdrant_port: 6333,
          web_ui_url: "http://localhost:6333/dashboard",
          collection_info: {
            name: "tax_legal_documents",
            points_count: 0,
            vectors_count: 0,
            indexed_vectors_count: 0,
            status: "error",
            config: {
              vector_size: 384,
              distance: "Cosine",
            },
          },
        });
      }
    } finally {
      setLoadingVectorInfo(false);
      // Clear polling state after a brief delay for smooth transition
      setTimeout(() => setIsPolling(false), 200);
    }
  };

  const loadDocuments = async (updateLoadingState = true) => {
    try {
      if (updateLoadingState) {
        setLoading(true);
        setError(null);
      }
      const data = await adminAPI.getRAGDocuments();
      setDocuments(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load RAG documents");
    } finally {
      if (updateLoadingState) setLoading(false);
    }
  };

  const cleanFilenameToTitle = (filename: string): string => {
    // Clean filename to suggest a better title
    if (!filename) return "";

    // Remove file extension
    let title = filename.replace(/\.[^/.]+$/, "");

    // Replace common separators with spaces
    title = title.replace(/[-_]/g, " ");

    // Remove common file suffixes
    title = title.replace(/\s+base\s*$/i, "");
    title = title.replace(/\s+copy\s*$/i, "");
    title = title.replace(/\s+\(\d+\)\s*$/, "");

    // Remove years (they'll be extracted separately)
    title = title.replace(/\b(19|20)\d{2}\b/g, "");

    // Clean up multiple spaces
    title = title.replace(/\s+/g, " ").trim();

    // Title case (but preserve acronyms)
    const words = title.split(" ");
    const cleanedWords = words.map((word) => {
      // Preserve acronyms (all caps, 2-4 chars)
      if (word === word.toUpperCase() && word.length >= 2 && word.length <= 4) {
        return word;
      }
      // Title case other words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return cleanedWords.join(" ") || filename.replace(/\.[^/.]+$/, "");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Auto-suggest a cleaned title from filename if title is empty or same as filename
      const cleanedTitle = cleanFilenameToTitle(file.name);
      const currentTitle = uploadFormData.title;
      // Only auto-fill if title is empty or matches previous filename
      const suggestedTitle =
        !currentTitle || currentTitle === uploadFormData.file?.name
          ? cleanedTitle
          : currentTitle;
      setUploadFormData({ ...uploadFormData, file, title: suggestedTitle });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drag area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Auto-suggest a cleaned title from filename if title is empty or same as filename
      const cleanedTitle = cleanFilenameToTitle(file.name);
      const currentTitle = uploadFormData.title;
      const suggestedTitle =
        !currentTitle || currentTitle === uploadFormData.file?.name
          ? cleanedTitle
          : currentTitle;
      setUploadFormData({ ...uploadFormData, file, title: suggestedTitle });
    }
  };

  const handleUpload = async () => {
    if (!uploadFormData.file || !uploadFormData.title) {
      setError("Please select a file and provide a title");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await adminAPI.uploadRAGFile(uploadFormData.file, uploadFormData.title);
      setUploadDialogOpen(false);
      setUploadFormData({ title: "", file: null });
      setIsDragOver(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      loadDocuments();
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Failed to upload file";
      setError(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlFormData.url || !urlFormData.title) {
      setError("Please provide both URL and title");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await adminAPI.addRAGUrl({
        title: urlFormData.title,
        url: urlFormData.url,
      });
      setUrlDialogOpen(false);
      setUrlFormData({ title: "", url: "" });
      loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add URL");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (document: RAGDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete && selectedDocIds.size === 0) return;

    try {
      setDeleting(true);
      if (documentToDelete) {
        await adminAPI.deleteRAGDocument(documentToDelete.id);
      } else {
        await adminAPI.bulkDeleteRAGDocuments(Array.from(selectedDocIds));
        setSelectedDocIds(new Set());
      }
      
      loadDocuments();
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete document(s)");
      setDeleteDialogOpen(false); 
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDocIds(new Set(documents.map((d) => d.id)));
    } else {
      setSelectedDocIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocIds(newSelected);
  };

  const handleReprocess = async (documentId: string) => {
    try {
      await adminAPI.reprocessRAGDocument(documentId);
      loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reprocess document");
    }
  };

  const handleBulkReprocess = async () => {
    if (
      !window.confirm(
        `This will reprocess ${
          bulkReprocessFilter.status
            ? `all ${bulkReprocessFilter.status} `
            : "all "
        }documents. ` +
          `Old chunks will be deleted and documents will be re-indexed with updated metadata (law names, etc.). ` +
          `This may take several minutes. Continue?`
      )
    ) {
      return;
    }

    try {
      setBulkReprocessing(true);
      setError(null);
      const result = await adminAPI.bulkReprocessRAGDocuments(
        bulkReprocessFilter.status,
        bulkReprocessFilter.sourceType
      );

      const message =
        `${result.message}. ` +
        (result.errors.length > 0
          ? `Errors: ${result.errors.length}`
          : "All documents queued successfully.");

      alert(message); // Use alert for bulk operation feedback
      setBulkReprocessDialogOpen(false);
      setBulkReprocessFilter({});
      loadDocuments();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to bulk reprocess documents"
      );
    } finally {
      setBulkReprocessing(false);
    }
  };

  const handleCopyError = async (errorText: string, documentId: string) => {
    try {
      await navigator.clipboard.writeText(errorText);
      setCopiedErrorId(documentId);
      setTimeout(() => {
        setCopiedErrorId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy error:", err);
      // Fallback: select and copy
      const textArea = document.createElement("textarea");
      textArea.value = errorText;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedErrorId(documentId);
        setTimeout(() => {
          setCopiedErrorId(null);
        }, 2000);
      } catch (e) {
        console.error("Fallback copy failed:", e);
      }
      document.body.removeChild(textArea);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Loader className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "processing":
        return "Processing";
      default:
        return "Pending";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // CSV Metadata Handlers
  const loadCatalogStats = async () => {
    try {
      const stats = await adminAPI.getMetadataCatalogStats()
      setCatalogStats(stats)
    } catch (err: any) {
      console.error('Failed to load catalog stats:', err)
    }
  }

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV file')
      return
    }

    try {
      setUploadingCsv(true)
      setError(null)
      const result = await adminAPI.uploadMetadataCatalog(csvFile, csvUploadMode)
      
      alert(`CSV uploaded successfully!\nTotal rows: ${result.total_rows}\nInserted: ${result.inserted}\nUpdated: ${result.updated}`)
      
      setCsvUploadDialogOpen(false)
      setCsvFile(null)
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = ''
      }
      loadCatalogStats()
      loadDocuments()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload CSV catalog')
    } finally {
      setUploadingCsv(false)
    }
  }

  const getMetadataStatusBadge = (doc: RAGDocument) => {
    if (!doc.metadata_status) return null
    
    switch (doc.metadata_status) {
      case 'matched':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Matched
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        )
      case 'manual':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
            Manual
          </span>
        )
      default:
        return <span className="text-gray-400">-</span>
    }
  }

  if (loading && documents.length === 0) {
    return (
      <Container maxWidth="xl">
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-4xl font-bold truncate">
            RAG Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage documents and URLs for the knowledge base
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0 flex-wrap">
          {selectedDocIds.size > 0 && (
            <Button
              variant="danger"
              onClick={() => {
                setDocumentToDelete(null);
                setDeleteDialogOpen(true);
              }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedDocIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setBulkReprocessDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Bulk Reprocess
          </Button>
          <Button
            variant="outline"
            onClick={() => setUrlDialogOpen(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <LinkIcon className="w-4 h-4" />
            Add URL
          </Button>
          <Button
            variant="primary"
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      </div>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* CSV Metadata Catalog */}
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
                {catalogStats.pending_documents} document(s) uploaded without metadata.
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
      </Card>

      {/* Vector Store Statistics */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Vector Database Statistics
            </h2>
            {isPolling && (
              <span className="flex items-center gap-1 text-xs text-gray-500 animate-pulse">
                <Loader className="w-3 h-3 animate-spin" />
                <span>Updating...</span>
              </span>
            )}
          </div>
          {vectorStoreInfo?.web_ui_url && (
            <a
              href={vectorStoreInfo.web_ui_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open Qdrant Web UI
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] flex flex-col justify-between">
            <div className="text-sm text-gray-600 mb-1">Total Chunks</div>
            <div className="text-2xl font-bold text-gray-900 h-8 flex items-center transition-opacity duration-200">
              {loadingVectorInfo ? (
                <Spinner size="sm" />
              ) : (
                <span className={isPolling ? "opacity-70" : "opacity-100"}>
                  {String(
                    vectorStoreInfo?.collection_info?.points_count ??
                      vectorStoreInfo?.collection_info?.vectors_count ??
                      0
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] flex flex-col justify-between">
            <div className="text-sm text-gray-600 mb-1">Indexed Vectors</div>
            <div className="text-2xl font-bold text-gray-900 h-8 flex items-center transition-opacity duration-200">
              {loadingVectorInfo ? (
                <Spinner size="sm" />
              ) : (
                <span className={isPolling ? "opacity-70" : "opacity-100"}>
                  {String(
                    vectorStoreInfo?.collection_info?.indexed_vectors_count ?? 0
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] flex flex-col justify-between">
            <div className="text-sm text-gray-600 mb-1">Vector Size</div>
            <div className="text-2xl font-bold text-gray-900 h-8 flex items-center transition-opacity duration-200">
              {loadingVectorInfo ? (
                <Spinner size="sm" />
              ) : (
                <span className={isPolling ? "opacity-70" : "opacity-100"}>
                  {vectorStoreInfo?.collection_info?.config?.vector_size
                    ? `${vectorStoreInfo.collection_info.config.vector_size}D`
                    : "384D"}
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] flex flex-col justify-between">
            <div className="text-sm text-gray-600 mb-1">Distance Metric</div>
            <div className="text-2xl font-bold text-gray-900 h-8 flex items-center transition-opacity duration-200">
              {loadingVectorInfo ? (
                <Spinner size="sm" />
              ) : (
                <span className={isPolling ? "opacity-70" : "opacity-100"}>
                  {vectorStoreInfo?.collection_info?.config?.distance ||
                    "Cosine"}
                </span>
              )}
            </div>
          </div>
        </div>
        {vectorStoreInfo?.collection_info?.name && (
          <div className="mt-4 text-sm text-gray-600">
            <strong>Collection:</strong> {vectorStoreInfo.collection_info.name}{" "}
            • <strong>Host:</strong> {vectorStoreInfo.qdrant_host}:
            {vectorStoreInfo.qdrant_port}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden w-full">
        <div className="overflow-x-auto w-full" style={{ minWidth: 0 }}>
          <table
            className="min-w-full divide-y divide-gray-200"
            style={{ width: "100%", tableLayout: "auto" }}
          >
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={documents.length > 0 && selectedDocIds.size === documents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Size
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Chunks
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Metadata
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      checked={selectedDocIds.has(doc.id)}
                      onChange={() => handleSelectOne(doc.id)}
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 min-w-0 max-w-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {doc.source_type === "url" ? (
                        <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {doc.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                      {doc.source_type}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 min-w-0 max-w-xs">
                    <div
                      className="text-sm text-gray-600 truncate"
                      title={doc.source_path || doc.file_name || ""}
                    >
                      {doc.source_type === "url" ? (
                        <a
                          href={doc.source_path || ""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                        >
                          {doc.source_path}
                        </a>
                      ) : (
                        <span className="truncate">
                          {doc.file_name || doc.source_path || "-"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="w-100 px-4 sm:px-6 py-4 min-w-0 max-w-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.processing_status)}
                      <span className="text-sm text-gray-700">
                        {getStatusText(doc.processing_status)}
                      </span>
                    </div>
                    {doc.processing_error && (
                      <div className="flex items-center gap-1 mt-1 group">
                        <div
                          className="text-xs text-red-600 truncate max-w-[100px] flex-1"
                          title={doc.processing_error}
                        >
                          {doc.processing_error.substring(0, 40)}...
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyError(doc.processing_error || "", doc.id);
                          }}
                          className="flex-shrink-0 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                          title="Copy full error message"
                        >
                          {copiedErrorId === doc.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {doc.processing_status === "completed" &&
                    doc.content_metadata?.chunks_count ? (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                        {doc.content_metadata.chunks_count}{" "}
                        {doc.content_metadata.chunks_count === 1
                          ? "chunk"
                          : "chunks"}
                      </span>
                    ) : doc.processing_status === "completed" ? (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                        0 chunks
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    {getMetadataStatusBadge(doc)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewMetadata(doc)}
                        className="p-1 text-gray-600 hover:text-gray-900 flex-shrink-0"
                        title="View Metadata"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {doc.processing_status === "failed" && (
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          className="p-1 text-blue-600 hover:text-blue-700 flex-shrink-0"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1 text-red-600 hover:text-red-700 flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No documents found. Upload a file or add a URL to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload File Modal */}
      <Modal
        open={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setUploadFormData({ title: "", file: null });
          setIsDragOver(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        title="Upload RAG Document"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title (Law Name)"
            required
            value={uploadFormData.title}
            onChange={(e) =>
              setUploadFormData({ ...uploadFormData, title: e.target.value })
            }
            placeholder="e.g., Personal Income Tax Act, VAT Act 2023"
            helperText="Enter the proper law name (e.g., 'Personal Income Tax Act', not the filename). The filename will be used as a fallback if not specified."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition cursor-pointer ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 pointer-events-none" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileSelect}
                      accept="*/*"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                  <p className="pl-1 pointer-events-none">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 pointer-events-none">
                  All file types supported (PDF, DOCX, images, etc.)
                </p>
                {uploadFormData.file && (
                  <p className="text-sm text-gray-700 mt-2 pointer-events-none">
                    Selected:{" "}
                    <span className="font-medium">
                      {uploadFormData.file.name}
                    </span>{" "}
                    ({formatFileSize(uploadFormData.file.size)})
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFormData({ title: "", file: null });
                setIsDragOver(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={
                !uploadFormData.file || !uploadFormData.title || uploading
              }
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add URL Modal */}
      <Modal
        open={urlDialogOpen}
        onClose={() => {
          setUrlDialogOpen(false);
          setUrlFormData({ title: "", url: "" });
        }}
        title="Add URL to RAG"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={urlFormData.title}
            onChange={(e) =>
              setUrlFormData({ ...urlFormData, title: e.target.value })
            }
            placeholder="Enter document title"
          />
          <Input
            label="URL"
            required
            type="url"
            value={urlFormData.url}
            onChange={(e) =>
              setUrlFormData({ ...urlFormData, url: e.target.value })
            }
            placeholder="https://example.com/page"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setUrlDialogOpen(false);
                setUrlFormData({ title: "", url: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddUrl}
              disabled={!urlFormData.url || !urlFormData.title || uploading}
            >
              {uploading ? "Adding..." : "Add URL"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Reprocess Modal */}
      <Modal
        open={bulkReprocessDialogOpen}
        onClose={() => {
          setBulkReprocessDialogOpen(false);
          setBulkReprocessFilter({});
        }}
        title="Bulk Reprocess Documents"
        size="md"
      >
        <div className="space-y-4">
          <Alert severity="warning">
            This will reprocess selected documents to update their metadata (law
            names, etc.) with the new extraction logic. Old chunks will be
            deleted and documents will be re-indexed. This may take several
            minutes.
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status (Optional)
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                value={bulkReprocessFilter.status || ""}
                onChange={(e) =>
                  setBulkReprocessFilter({
                    ...bulkReprocessFilter,
                    status: e.target.value || undefined,
                  })
                }
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only reprocess documents with the selected status. Leave empty
                to reprocess all.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Source Type (Optional)
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                value={bulkReprocessFilter.sourceType || ""}
                onChange={(e) =>
                  setBulkReprocessFilter({
                    ...bulkReprocessFilter,
                    sourceType: e.target.value || undefined,
                  })
                }
              >
                <option value="">All types</option>
                <option value="file">File uploads</option>
                <option value="url">URLs</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only reprocess documents of the selected type. Leave empty to
                reprocess all.
              </p>
            </div>
          </div>

          {error && <Alert severity="error">{error}</Alert>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setBulkReprocessDialogOpen(false);
              setBulkReprocessFilter({});
            }}
            disabled={bulkReprocessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleBulkReprocess}
            disabled={bulkReprocessing}
          >
            {bulkReprocessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Reprocessing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Bulk Reprocess
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        open={csvUploadDialogOpen}
        onClose={() => {
          setCsvUploadDialogOpen(false);
          setCsvFile(null);
          if (csvFileInputRef.current) {
            csvFileInputRef.current.value = '';
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
              onChange={(e) => setCsvUploadMode(e.target.value as 'replace' | 'merge')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="replace">Replace All (Delete existing catalog)</option>
              <option value="merge">Merge (Add new, update existing)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {csvUploadMode === 'replace' 
                ? 'All existing catalog entries will be deleted and replaced with new data'
                : 'New entries will be added, existing entries (matched by doc_id) will be updated'}
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
              Max file size: 50MB. For larger files, split and upload with "Merge" mode.
            </p>
            {csvFile && (
              <p className="text-sm text-gray-700 mt-2">
                Selected: <span className="font-medium">{csvFile.name}</span> ({formatFileSize(csvFile.size)})
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
                  csvFileInputRef.current.value = '';
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
              {uploadingCsv ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Document"
        size="md"
        hideBackdrop
        className="shadow-2xl border border-gray-200"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {documentToDelete ? (
              <>Are you sure you want to delete <strong>{documentToDelete.title}</strong>?</>
            ) : (
              <>Are you sure you want to delete <strong>{selectedDocIds.size} documents</strong>?</>
            )}
            {' '}This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Catalog Viewer Modal */}
      <Modal
        open={catalogViewerOpen}
        onClose={() => setCatalogViewerOpen(false)}
        title="Metadata Catalog Viewer"
        size="4xl"
        className="shadow-2xl border border-gray-200"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Search by Doc ID, Filename, or Title..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Modal Table */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doc ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catalogLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <Loader className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : catalogEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No entries found.
                      </td>
                    </tr>
                  ) : (
                    catalogEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {catalogPage * CATALOG_PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.doc_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[200px]" title={entry.file_name}>
                          {entry.file_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[200px]" title={entry.source_title}>
                          {entry.source_title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            entry.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-gray-500">
              Page {catalogPage + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogPage(Math.max(0, catalogPage - 1))}
                disabled={catalogPage === 0 || catalogLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogPage(catalogPage + 1)}
                disabled={catalogEntries.length < CATALOG_PAGE_SIZE || catalogLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Pending Review Modal */}
      <Modal
        open={pendingReviewOpen}
        onClose={() => setPendingReviewOpen(false)}
        title="Pending Metadata Review"
        size="lg"
        className="shadow-2xl border border-gray-200"
      >
        <div className="space-y-4">
          <Alert severity="info">
            The following uploaded documents could not be automatically matched with the CSV metadata catalog. 
            Please check if the filename matches an entry in the catalog (ignoring case and special characters).
            If you have updated the catalog or renamed the file, click "Reprocess" to try matching again.
          </Alert>

          <div className="border border-gray-200 rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingDocsLoading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center">
                      <Loader className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : pendingDocs.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                      No pending documents found.
                    </td>
                  </tr>
                ) : (
                  pendingDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                        <div className="text-xs text-gray-500">{doc.file_name}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReprocess(doc.id)}
                          className="flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reprocess
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end pt-4">
             <Button onClick={() => setPendingReviewOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
      {/* Metadata Viewer Modal */}
      <Modal
        open={metadataViewerOpen}
        onClose={() => setMetadataViewerOpen(false)}

        title="Document Metadata"
        size="lg"
      >
        <div className="space-y-6">
          {selectedMetadataDoc && (
            <>
              {/* Document Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Document</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Title</label>
                    <div className="text-sm font-medium">{selectedMetadataDoc.title}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Filename</label>
                    <div className="text-sm text-gray-600 truncate" title={selectedMetadataDoc.file_name || ""}>
                      {selectedMetadataDoc.file_name || "-"}
                    </div>
                  </div>
                   <div>
                    <label className="text-xs text-gray-400">Metadata Status</label>
                    <div className="mt-1">{getMetadataStatusBadge(selectedMetadataDoc)}</div>
                  </div>
                </div>
              </div>

              {/* Matched Catalog Entry */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Matched Catalog Entry
                </h3>
                
                {selectedMetadataDoc.metadata_catalog ? (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
                      <div>
                        <label className="text-xs text-gray-400 uppercase">Doc ID</label>
                        <div className="text-sm font-mono text-blue-600">{selectedMetadataDoc.metadata_catalog.doc_id}</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase">Status</label>
                        <div className="text-sm">{selectedMetadataDoc.metadata_catalog.status || "Active"}</div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-400 uppercase">Official Title</label>
                        <div className="text-sm font-medium">{selectedMetadataDoc.metadata_catalog.source_title}</div>
                      </div>
                      
                      {selectedMetadataDoc.metadata_catalog.issuing_body && (
                        <div>
                          <label className="text-xs text-gray-400 uppercase">Issuing Body</label>
                          <div className="text-sm">{selectedMetadataDoc.metadata_catalog.issuing_body}</div>
                        </div>
                      )}
                      
                      {selectedMetadataDoc.metadata_catalog.publication_date && (
                         <div>
                          <label className="text-xs text-gray-400 uppercase">Publication Date</label>
                          <div className="text-sm">{selectedMetadataDoc.metadata_catalog.publication_date}</div>
                        </div>
                      )}

                       {selectedMetadataDoc.metadata_catalog.effective_date && (
                         <div>
                          <label className="text-xs text-gray-400 uppercase">Effective Date</label>
                          <div className="text-sm">{selectedMetadataDoc.metadata_catalog.effective_date}</div>
                        </div>
                      )}
                      
                       {selectedMetadataDoc.metadata_catalog.jurisdiction_level && (
                         <div>
                          <label className="text-xs text-gray-400 uppercase">Jurisdiction</label>
                          <div className="text-sm">{selectedMetadataDoc.metadata_catalog.jurisdiction_level}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                   <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No catalog entry matched.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Ensure the filename matches a valid entry in the metadata catalog.
                      </p>
                   </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setMetadataViewerOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
}
