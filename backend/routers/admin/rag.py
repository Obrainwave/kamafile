from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import asyncio
import logging
import os

from database import get_db
from models import RAGDocument, User
from schemas import RAGDocumentCreate, RAGDocumentResponse, RAGDocumentUpdate, BulkDeleteRequest
from services.permission_service import require_permission, Permission
from services.rag_service import (
    save_uploaded_file,
    process_rag_document,
    delete_rag_file
)
from services.vector_store import get_vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/rag", tags=["admin"])


@router.get("", response_model=List[RAGDocumentResponse])
async def get_rag_documents(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    source_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get all RAG documents"""
    query = select(RAGDocument).options(joinedload(RAGDocument.metadata_catalog))
    
    if source_type:
        query = query.where(RAGDocument.source_type == source_type)
    if is_active is not None:
        query = query.where(RAGDocument.is_active == is_active)
    
    query = query.order_by(RAGDocument.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    documents = result.scalars().all()
    return documents


@router.post("/bulk-reprocess")
async def bulk_reprocess_rag_documents(
    filter_status: Optional[str] = Query(None, description="Filter by processing status (completed, failed, pending, processing)"),
    filter_source_type: Optional[str] = Query(None, description="Filter by source type (file, url)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """
    Bulk reprocess RAG documents
    
    Options:
    - filter_status: Only reprocess documents with this status (e.g., "completed", "failed")
    - filter_source_type: Only reprocess documents of this type (e.g., "file", "url")
    
    If no filters, reprocesses all documents.
    """
    try:
        # Build query
        query = select(RAGDocument)
        
        if filter_status:
            query = query.where(RAGDocument.processing_status == filter_status)
        if filter_source_type:
            query = query.where(RAGDocument.source_type == filter_source_type)
        
        # Get all matching documents
        result = await db.execute(query)
        documents = result.scalars().all()
        
        if not documents:
            return {
                "message": "No documents found matching the criteria",
                "total": 0,
                "queued": 0,
                "errors": []
            }
        
        # Delete old chunks from vector store and queue reprocessing
        from services.vector_store import get_vector_store
        from services.embedding_service import get_embedding_service
        
        embedding_service = get_embedding_service()
        embedding_service = get_embedding_service()
        vector_size = embedding_service.get_embedding_dimension()
        vector_store = get_vector_store(vector_size=vector_size)
        
        queued_count = 0
        errors = []
        
        for document in documents:
            try:
                # Delete old chunks from vector store
                try:
                    vector_store.delete_document(str(document.id))
                    logger.info(f"Deleted old chunks for document {document.id} before bulk reprocessing")
                except Exception as e:
                    logger.warning(f"Error deleting old chunks for document {document.id}: {e}. Continuing...")
                
                # Reset processing status
                document.processing_status = "pending"
                document.processing_error = None
                queued_count += 1
                
                # Queue reprocessing (async, don't wait)
                if document.source_type == "url":
                    asyncio.create_task(process_url_async(document.id, document.source_path))
                elif document.source_type == "file":
                    asyncio.create_task(process_document_async(document.id, document.source_path, document.file_type))
                else:
                    errors.append(f"Document {document.id}: Unknown source_type '{document.source_type}'")
                    
            except Exception as e:
                logger.error(f"Error queuing reprocess for document {document.id}: {e}", exc_info=True)
                errors.append(f"Document {document.id}: {str(e)}")
        
        # Commit all status changes
        await db.commit()
        
        logger.info(f"Bulk reprocess queued {queued_count} documents out of {len(documents)} total")
        
        return {
            "message": f"Bulk reprocessing queued for {queued_count} document(s)",
            "total": len(documents),
            "queued": queued_count,
            "errors": errors,
            "filter_status": filter_status,
            "filter_source_type": filter_source_type
        }
        

    except Exception as e:
        logger.error(f"Error in bulk reprocess: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initiating bulk reprocess: {str(e)}"
        )


@router.post("/{document_id}/reprocess", response_model=RAGDocumentResponse)
async def reprocess_rag_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Reprocess a specific RAG document"""
    # 1. Get document
    result = await db.execute(select(RAGDocument).where(RAGDocument.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    try:
        # 2. Delete old chunks from vector store
        # Start fresh to avoid duplicates if chunks exist
        try:
            from services.vector_store import get_vector_store
            from services.embedding_service import get_embedding_service
            
            # We need to ensure we initialize with correct vector size if possible, 
            # though delete_document might not strictly need it depending on implementation.
            # Safest is to try standard initialization.
            embedding_service = get_embedding_service()
            # Just use a dummy embed to get size, or rely on defaults if robust
            # Just use a dummy embed to get size, or rely on defaults if robust
            vector_size = embedding_service.get_embedding_dimension()
            
            vector_store = get_vector_store(vector_size=vector_size)
            vector_store.delete_document(str(document.id))
            logger.info(f"Deleted old chunks for document {document.id} before reprocessing")
        except Exception as e:
            # Non-fatal, might just not exist yet
            logger.warning(f"Error deleting old chunks for document {document.id}: {e}")
            
        # 3. Reset status
        document.processing_status = "pending"
        document.processing_error = None
        # Don't clear content_text yet, let the processor handle it
        
        await db.commit()
        await db.refresh(document)
        
        # 4. Trigger processing
        if document.source_type == "url":
            asyncio.create_task(process_url_async(document.id, document.source_path))
        elif document.source_type == "file":
            asyncio.create_task(process_document_async(document.id, document.source_path, document.file_type))
        else:
            document.processing_status = "failed"
            document.processing_error = f"Unknown source_type '{document.source_type}'"
            await db.commit()
            raise HTTPException(status_code=400, detail=f"Unknown source_type '{document.source_type}'")
            
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reprocessing document {document.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )



# ============================================================================
# CSV METADATA CATALOG ENDPOINTS (Moved up to avoid path conflict)
# ============================================================================

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
    try:
        # Validate mode
        if mode not in ["replace", "merge"]:
            raise HTTPException(status_code=400, detail="Mode must be 'replace' or 'merge'")
        
        # Validate file type
        if not file.filename or not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")
        
        # Read file content
        csv_content = await file.read()
        
        # Validate file size (max 50MB)
        if len(csv_content) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="CSV file too large. Maximum 50MB. Please split into multiple files."
            )
        
        logger.info(f"Uploading CSV catalog: {file.filename}, mode={mode}, size={len(csv_content)} bytes")
        
        # Upload catalog
        from services.csv_metadata_service import upload_metadata_catalog
        result = await upload_metadata_catalog(csv_content, db, mode, batch_size)
        
        logger.info(f"CSV catalog uploaded: {result}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading CSV catalog: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading CSV catalog: {str(e)}"
        )


@router.get("/metadata-catalog/stats")
async def get_metadata_catalog_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """
    Get metadata catalog statistics
    
    Returns:
    - total_entries: Number of catalog entries
    - matched_documents: Number of documents with matched metadata
    - pending_documents: Number of documents without metadata
    """
    try:
        from services.csv_metadata_service import get_catalog_stats
        stats = await get_catalog_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error getting catalog stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting catalog stats: {str(e)}"
        )


@router.get("/metadata-catalog/pending-documents")
async def get_pending_documents(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """
    Get documents with pending metadata status
    
    Returns list of documents that were uploaded but have no matching metadata in the catalog
    """
    try:
        from services.csv_metadata_service import get_pending_documents
        documents = await get_pending_documents(db)
        return documents
    except Exception as e:
        logger.error(f"Error getting pending documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting pending documents: {str(e)}"
        )


@router.get("/metadata-catalog")
async def get_metadata_catalog(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """
    Get metadata catalog entries
    
    Parameters:
    - skip: Number of entries to skip (pagination)
    - limit: Maximum number of entries to return
    - search: Optional search query (searches doc_id, file_name, source_title)
    """
    try:
        from services.csv_metadata_service import get_catalog_entries
        entries = await get_catalog_entries(db, skip, limit, search)
        return entries
    except Exception as e:
        logger.error(f"Error getting catalog entries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting catalog entries: {str(e)}"
        )


@router.get("/{document_id}", response_model=RAGDocumentResponse)
async def get_rag_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get a specific RAG document"""
    result = await db.execute(select(RAGDocument).options(joinedload(RAGDocument.metadata_catalog)).where(RAGDocument.id == document_id))

    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="RAG document not found")
    return document


@router.post("/upload", response_model=RAGDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_rag_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Upload a file for RAG"""
    try:
        logger.info(f"Received file upload: filename={file.filename}, title={title}, content_type={file.content_type}")
        
        # Validate title
        if not title or not title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info(f"File read successfully, size: {len(file_content)} bytes")
        
        # Save file
        file_info = await save_uploaded_file(file_content, file.filename or "untitled")
        logger.info(f"File saved: {file_info}")
        
        # Create document record
        document = RAGDocument(
            title=title.strip(),
            source_type="file",
            source_path=file_info["file_path"],
            file_name=file_info["file_name"],
            file_type=file_info["file_type"],
            file_size=file_info["file_size"],
            processing_status="pending",
            uploaded_by=admin_user.id
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        logger.info(f"Document record created: {document.id}")
        
        # Process file asynchronously (don't wait)
        asyncio.create_task(process_document_async(document.id, file_info["file_path"], file_info["file_type"]))
        
        return document
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.post("/url", response_model=RAGDocumentResponse, status_code=status.HTTP_201_CREATED)
async def add_rag_url(
    document_data: RAGDocumentCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Add a URL for RAG"""
    try:
        if document_data.source_type != "url":
            raise HTTPException(status_code=400, detail="source_type must be 'url'")
        
        if not document_data.url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Create document record
        document = RAGDocument(
            title=document_data.title,
            source_type="url",
            source_path=document_data.url,
            processing_status="pending",
            uploaded_by=admin_user.id
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        
        # Process URL asynchronously
        asyncio.create_task(process_url_async(document.id, document_data.url))
        
        return document
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding URL: {str(e)}")


@router.patch("/{document_id}", response_model=RAGDocumentResponse)
async def update_rag_document(
    document_id: UUID,
    document_data: RAGDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Update a RAG document"""
    result = await db.execute(select(RAGDocument).where(RAGDocument.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="RAG document not found")
    
    update_data = document_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    await db.commit()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rag_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """
    Delete a RAG document
    - Deletes file from disk (if applicable)
    - Deletes chunks from vector store
    - Deletes record from database
    """
    # 1. Get document
    result = await db.execute(select(RAGDocument).where(RAGDocument.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # 2. Delete file from disk if it exists
    if document.source_path and document.source_type == "file":
        try:
            await delete_rag_file(document.source_path)
        except Exception as e:
            logger.warning(f"Failed to delete file {document.source_path}: {e}")
            # Continue deletion of database record
            
    # 3. Delete from vector store
    try:
        vector_store = get_vector_store()
        vector_store.delete_document(str(document_id))
    except Exception as e:
        logger.warning(f"Failed to delete vectors for {document_id}: {e}")
        
    # 4. Delete from database
    await db.delete(document)
    await db.commit()
    
    logger.info(f"Deleted RAG document {document_id} by {admin_user.email}")
    return None


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_rag_documents(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """
    Bulk delete RAG documents
    """
    document_ids = request.document_ids
    if not document_ids:
        return {"message": "No documents provided", "deleted_count": 0}

    # Fetch documents to get paths for file deletion
    result = await db.execute(select(RAGDocument).where(RAGDocument.id.in_(document_ids)))
    documents = result.scalars().all()
    
    deleted_count = 0
    errors = []
    
    try:
        vector_store = get_vector_store()
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")
        vector_store = None

    for doc in documents:
        try:
            # 1. Delete file
            if doc.source_path and doc.source_type == "file":
                try:
                    await delete_rag_file(doc.source_path)
                except Exception as e:
                    logger.warning(f"Failed to delete file {doc.source_path}: {e}")
            
            # 2. Delete vectors
            if vector_store:
                try:
                    vector_store.delete_document(str(doc.id))
                except Exception as e:
                    logger.warning(f"Failed to delete vectors for {doc.id}: {e}")
                
            # 3. Delete from DB
            await db.delete(doc)
            deleted_count += 1
        except Exception as e:
            errors.append(f"Failed to delete {doc.id}: {str(e)}")
            
    await db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} documents", 
        "deleted_count": deleted_count,
        "errors": errors
    }


@router.get("/vector-store/info")
async def get_vector_store_info(
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get Qdrant vector store information"""
    try:
        from services.vector_store import get_vector_store
        from services.embedding_service import get_embedding_service
        
        # Get embedding dimension
        embedding_service = get_embedding_service()
        embedding_service = get_embedding_service()
        vector_size = embedding_service.get_embedding_dimension()
        
        vector_store = get_vector_store(vector_size=vector_size)
        collection_info = vector_store.get_collection_info()
        
        # Ensure collection_info is not empty - if it is, something went wrong
        if not collection_info or collection_info == {}:
            logger.warning("get_collection_info() returned empty dict. Qdrant might not be accessible.")
            # Return a default structure with zeros so frontend can display something
            collection_info = {
                "name": "tax_legal_documents",
                "points_count": 0,
                "vectors_count": 0,
                "indexed_vectors_count": 0,
                "status": "unknown",
                "config": {
                    "vector_size": vector_size,
                    "distance": "Cosine"
                }
            }
        
        return {
            "qdrant_host": os.getenv("QDRANT_HOST", "localhost"),
            "qdrant_port": int(os.getenv("QDRANT_PORT", "6333")),
            "web_ui_url": f"http://{os.getenv('QDRANT_HOST', 'localhost')}:{os.getenv('QDRANT_PORT', '6333')}/dashboard",
            "collection_info": collection_info
        }
    except ImportError as e:
        logger.error(f"Import error getting vector store info: {e}", exc_info=True)
        # Return default structure if dependencies not available
        return {
            "qdrant_host": os.getenv("QDRANT_HOST", "localhost"),
            "qdrant_port": int(os.getenv("QDRANT_PORT", "6333")),
            "web_ui_url": f"http://{os.getenv('QDRANT_HOST', 'localhost')}:{os.getenv('QDRANT_PORT', '6333')}/dashboard",
            "collection_info": {
                "name": "tax_legal_documents",
                "points_count": 0,
                "vectors_count": 0,
                "indexed_vectors_count": 0,
                "status": "error",
                "config": {
                    "vector_size": 384,
                    "distance": "Cosine"
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting vector store info: {e}", exc_info=True)
        # Return default structure instead of raising, so frontend can still display something
        return {
            "qdrant_host": os.getenv("QDRANT_HOST", "localhost"),
            "qdrant_port": int(os.getenv("QDRANT_PORT", "6333")),
            "web_ui_url": f"http://{os.getenv('QDRANT_HOST', 'localhost')}:{os.getenv('QDRANT_PORT', '6333')}/dashboard",
            "collection_info": {
                "name": "tax_legal_documents",
                "points_count": 0,
                "vectors_count": 0,
                "indexed_vectors_count": 0,
                "status": "error",
                "error": str(e)[:200],
                "config": {
                    "vector_size": 384,
                    "distance": "Cosine"
                }
            }
        }


async def process_document_async(document_id: UUID, file_path: str, file_type: str):
    """Asynchronously process a file document"""
    try:
        # Get fresh session
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(RAGDocument).where(RAGDocument.id == document_id))
            document = result.scalar_one_or_none()
            
            if not document:
                return
            
            # Update status
            document.processing_status = "processing"
            await session.commit()
            await session.refresh(document)
            
            # Step 1: Extract text from file
            from services.rag_service import extract_text_from_file
            text_result = await extract_text_from_file(file_path, file_type)
            text_content = text_result.get("content_text", "")
            
            # CRITICAL: Check if text extraction failed (error messages start with "[")
            # If so, skip chunking and mark as failed
            if text_content and text_content.strip().startswith("["):
                # Check if it's an error message (common patterns)
                error_indicators = [
                    "[Binary file content detected",
                    "[Error",
                    "[Unable to decode",
                    "[No text content found",
                    "[PDF processing requires",
                    "[Word document processing requires",
                    "[Image OCR requires",
                    "[Binary file detected",
                    "[Invalid UTF-8 content",
                    "[Text extraction failed",
                    "[Binary content could not"
                ]
                is_error_message = any(text_content.startswith(indicator) for indicator in error_indicators)
                
                if is_error_message:
                    logger.warning(f"Text extraction failed for document {document_id}: {text_content[:100]}")
                    document.processing_status = "failed"
                    document.processing_error = text_content[:500]  # Store full error message
                    document.content_text = text_content[:50000] if text_content else ""
                    document.content_metadata = {
                        **text_result.get("content_metadata", {}),
                        "extraction_failed": True,
                        "chunks_count": 0
                    }
                    document.processed_at = datetime.utcnow()
                    await session.commit()
                    await session.refresh(document)
                    logger.info(f"Document {document_id} marked as failed due to extraction error")
                    return  # Exit early - don't try to chunk error messages
            
            # NEW: Step 1.5: Look up CSV metadata by filename
            csv_metadata = None
            if document.file_name:
                from services.csv_metadata_service import lookup_metadata_by_filename
                csv_metadata = await lookup_metadata_by_filename(document.file_name, session)
                
                if csv_metadata:
                    # Update document with catalog reference
                    from uuid import UUID as UUIDType
                    document.metadata_catalog_id = UUIDType(csv_metadata['id'])
                    document.metadata_status = 'matched'
                    logger.info(f"Found CSV metadata for {document.file_name}: doc_id={csv_metadata['doc_id']}")
                else:
                    # No match found
                    document.metadata_status = 'pending'
                    logger.warning(f"No CSV metadata found for {document.file_name}")
                
                await session.commit()
                await session.refresh(document)
            
            # Step 2: Delete old chunks from vector store before reprocessing (if any exist)
            # This ensures clean reprocessing with updated metadata (law_name, etc.)
            # This is important because metadata (law_name) may have changed
            try:
                from services.vector_store import get_vector_store
                from services.embedding_service import get_embedding_service
                
                embedding_service = get_embedding_service()
                embedding_service = get_embedding_service()
                vector_size = embedding_service.get_embedding_dimension()
                vector_store = get_vector_store(vector_size=vector_size)
                vector_store.delete_document(str(document.id))
                logger.info(f"Deleted old chunks for document {document_id} before reprocessing")
            except Exception as e:
                logger.warning(f"Error deleting old chunks for document {document_id} (might not exist yet): {e}")
                # Continue - document might not have been processed before
            
            # Step 3: Process and index using new pipeline
            # Extract metadata (law_name, year, authority) from document title, filename, and content
            from services.metadata_extractor import extract_metadata_from_document
            metadata = extract_metadata_from_document(
                title=document.title,
                file_name=document.file_name,
                text_content=text_content[:5000] if text_content else None  # Use first 5k chars for extraction
            )
            law_name = metadata["law_name"]
            year = metadata.get("year")
            authority = metadata.get("authority", "Federal Inland Revenue Service")
            
            # Validate text_content is not empty or too short
            if not text_content or len(text_content.strip()) < 10:
                logger.warning(f"Document {document_id} has insufficient text content ({len(text_content) if text_content else 0} chars). Marking as failed.")
                document.processing_status = "failed"
                document.processing_error = f"Insufficient text content extracted: {len(text_content) if text_content else 0} characters"
                document.content_text = text_content[:50000] if text_content else ""
                document.content_metadata = {
                    **text_result.get("content_metadata", {}),
                    "extraction_failed": True,
                    "chunks_count": 0
                }
                document.processed_at = datetime.utcnow()
                await session.commit()
                await session.refresh(document)
                return  # Exit early
            
            from services.rag_service import process_and_index_document
            index_result = await process_and_index_document(
                text_content=text_content,
                document_id=str(document.id),
                law_name=law_name,
                year=year,
                authority=authority,  # Extracted from metadata
                jurisdiction="Nigeria",
                csv_metadata=csv_metadata  # NEW: Pass CSV metadata
            )
            
            # Update document with results
            # CRITICAL: Ensure content_text is valid UTF-8 text (not binary) before storing in database
            safe_content_text = text_content
            
            # First check: if it's bytes, decode it
            if isinstance(safe_content_text, bytes):
                try:
                    safe_content_text = safe_content_text.decode('utf-8', errors='ignore')
                except:
                    safe_content_text = "[Unable to decode content as text]"
            
            # Second check: detect binary content (ZIP signatures, null bytes, etc.)
            if safe_content_text and isinstance(safe_content_text, str):
                # CRITICAL: Remove ALL null bytes FIRST (PostgreSQL cannot store them - causes UTF8 encoding error)
                null_count = safe_content_text.count('\x00')
                if null_count > 0:
                    logger.warning(f"Found {null_count} null bytes in content_text, removing ALL...")
                    safe_content_text = safe_content_text.replace('\x00', '')
                
                # Check for ZIP file signature (DOCX files are ZIP archives: PK\x03\x04)
                # Check first 4 bytes: should be 0x50 0x4B 0x03 0x04 (PK\x03\x04)
                if len(safe_content_text) >= 4 and safe_content_text.startswith('PK'):
                    # Check bytes 2 and 3 (indices 2 and 3)
                    byte2 = ord(safe_content_text[2]) if len(safe_content_text) > 2 else 0
                    byte3 = ord(safe_content_text[3]) if len(safe_content_text) > 3 else 0
                    # ZIP signature: 0x03 0x04 or 0x05 0x06
                    if (byte2 == 3 and byte3 == 4) or (byte2 == 5 and byte3 == 6):
                        logger.error(f"BINARY ZIP CONTENT DETECTED after null byte removal! First 50: {repr(safe_content_text[:50])}")
                        safe_content_text = f"[Binary file content detected. DOCX text extraction failed. File: {document.file_name}]"
                    # Also check string form of ZIP signature
                    elif '\x03\x04' in safe_content_text[:100] or '\x05\x06' in safe_content_text[:100]:
                        logger.error(f"ZIP signature found in content! Rejecting.")
                        safe_content_text = f"[Binary file content detected. DOCX text extraction failed. File: {document.file_name}]"
            
            # CRITICAL: Final validation before database storage - PostgreSQL requires valid UTF-8 with NO null bytes
            if safe_content_text and isinstance(safe_content_text, str):
                # Final check: ensure absolutely no null bytes (PostgreSQL will reject them)
                if '\x00' in safe_content_text:
                    logger.error("CRITICAL: Null bytes still present in final validation! Removing ALL...")
                    safe_content_text = safe_content_text.replace('\x00', '')
                    # If still contains binary-looking content, reject entirely
                    if safe_content_text.startswith('PK') and len(safe_content_text) >= 4:
                        logger.error("ZIP signature still present after final cleanup. Rejecting entirely.")
                        safe_content_text = f"[Binary file content detected. DOCX text extraction failed. File: {document.file_name}]"
            
            document.content_text = safe_content_text[:50000] if safe_content_text else ""  # Store first 50k chars for reference
            document.content_metadata = {
                **text_result.get("content_metadata", {}),
                "markdown_processed": True,
                "chunks_count": index_result.get("chunks_count", 0)
            }
            document.processing_status = "completed"
            document.processed_at = datetime.utcnow()
            document.processing_error = None
            
            # Commit with error handling for UTF-8 encoding issues (PostgreSQL rejects null bytes)
            try:
                await session.commit()
                await session.refresh(document)
            except Exception as db_error:
                error_str = str(db_error)
                # Check if it's a UTF-8 encoding error (PostgreSQL rejects null bytes in VARCHAR/TEXT)
                if "UTF8" in error_str or "encoding" in error_str.lower() or "0x00" in error_str or "CharacterNotInRepertoire" in error_str:
                    logger.error(f"CRITICAL: Database UTF-8 encoding error: {db_error}. Binary content with null bytes still present.")
                    # CRITICAL: Remove ALL null bytes and retry
                    if document.content_text and '\x00' in document.content_text:
                        logger.error("Found null bytes in content_text during commit. Removing ALL null bytes...")
                        document.content_text = document.content_text.replace('\x00', '')
                        # If still contains ZIP signature, replace entirely
                        if document.content_text.startswith('PK') and len(document.content_text) >= 4:
                            byte2 = ord(document.content_text[2]) if len(document.content_text) > 2 else 0
                            byte3 = ord(document.content_text[3]) if len(document.content_text) > 3 else 0
                            if (byte2 == 3 and byte3 == 4) or (byte2 == 5 and byte3 == 6):
                                logger.error("ZIP signature still present after null byte removal. Replacing with error message.")
                                document.content_text = f"[Binary file content detected. DOCX text extraction failed. File: {document.file_name}]"
                    
                    # Update status and retry
                    document.processing_status = "failed"
                    document.processing_error = "Binary content detected. Text extraction may have failed. Please ensure python-docx is installed and the file is not corrupted."
                    
                    # Retry commit with cleaned content
                    try:
                        await session.commit()
                        await session.refresh(document)
                    except Exception as retry_error:
                        logger.error(f"CRITICAL: Commit still failed after cleaning: {retry_error}. Using minimal error message.")
                        # Last resort: set minimal error message without any binary content
                        document.content_text = "[Binary content could not be stored. Text extraction failed.]"
                        await session.commit()
                        await session.refresh(document)
                else:
                    raise
    except Exception as e:
        # Update with error
        try:
            from database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(RAGDocument).where(RAGDocument.id == document_id))
                document = result.scalar_one_or_none()
                if document:
                    document.processing_status = "failed"
                    document.processing_error = str(e)[:1000]
                    await session.commit()
        except Exception as update_error:
            import logging
            logging.error(f"Failed to update error status: {update_error}")


async def process_url_async(document_id: UUID, url: str):
    """Asynchronously process a URL document"""
    try:
        # Get fresh session
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(RAGDocument).where(RAGDocument.id == document_id))
            document = result.scalar_one_or_none()
            
            if not document:
                return
            
            # Update status
            document.processing_status = "processing"
            await session.commit()
            await session.refresh(document)
            
            # Step 1: Fetch URL content
            from services.rag_service import fetch_url_content
            url_result = await fetch_url_content(url)
            text_content = url_result.get("content_text", "")
            
            # CRITICAL: Check if URL content extraction failed (error messages start with "[")
            if text_content and text_content.strip().startswith("["):
                error_indicators = [
                    "[Error",
                    "[Unable to",
                    "[Binary",
                    "[Invalid"
                ]
                is_error_message = any(text_content.startswith(indicator) for indicator in error_indicators)
                
                if is_error_message:
                    logger.warning(f"URL content extraction failed for document {document_id}: {text_content[:100]}")
                    document.processing_status = "failed"
                    document.processing_error = text_content[:500]
                    document.content_text = text_content[:50000] if text_content else ""
                    document.content_metadata = {
                        **url_result.get("content_metadata", {}),
                        "extraction_failed": True,
                        "chunks_count": 0
                    }
                    document.processed_at = datetime.utcnow()
                    await session.commit()
                    await session.refresh(document)
                    return
            
            # Validate text_content is not empty or too short
            if not text_content or len(text_content.strip()) < 10:
                logger.warning(f"Document {document_id} has insufficient URL content ({len(text_content) if text_content else 0} chars). Marking as failed.")
                document.processing_status = "failed"
                document.processing_error = f"Insufficient content from URL: {len(text_content) if text_content else 0} characters"
                document.content_text = text_content[:50000] if text_content else ""
                document.content_metadata = {
                    **url_result.get("content_metadata", {}),
                    "extraction_failed": True,
                    "chunks_count": 0
                }
                document.processed_at = datetime.utcnow()
                await session.commit()
                await session.refresh(document)
                return
            
            # Step 2: Process and index using new pipeline
            # Extract metadata (law_name, year, authority) from document title and content
            from services.metadata_extractor import extract_metadata_from_document
            metadata = extract_metadata_from_document(
                title=document.title,
                file_name=None,  # URL doesn't have filename
                text_content=text_content[:5000] if text_content else None  # Use first 5k chars for extraction
            )
            law_name = metadata["law_name"]
            year = metadata.get("year")
            authority = metadata.get("authority", "Federal Inland Revenue Service")
            
            from services.rag_service import process_and_index_document
            index_result = await process_and_index_document(
                text_content=text_content,
                document_id=str(document.id),
                law_name=law_name,
                year=year,
                authority=authority,  # Extracted from metadata
                jurisdiction="Nigeria"
            )
            
            # Update document with results
            # Ensure content_text is valid UTF-8 text (not binary)
            safe_content_text = text_content
            if isinstance(safe_content_text, bytes):
                try:
                    safe_content_text = safe_content_text.decode('utf-8', errors='ignore')
                except:
                    safe_content_text = "[Unable to decode content as text]"
            
            # Remove null bytes and other invalid characters
            if safe_content_text:
                safe_content_text = safe_content_text.replace('\x00', '')
            
            document.content_text = safe_content_text[:50000] if safe_content_text else ""
            document.content_metadata = {
                **url_result.get("content_metadata", {}),
                "markdown_processed": True,
                "chunks_count": index_result.get("chunks_count", 0)
            }
            document.processing_status = "completed"
            document.processed_at = datetime.utcnow()
            document.processing_error = None
            
            await session.commit()
    except Exception as e:
        # Update with error
        try:
            from database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(RAGDocument).where(RAGDocument.id == document_id))
                document = result.scalar_one_or_none()
                if document:
                    document.processing_status = "failed"
                    document.processing_error = str(e)[:1000]
                    await session.commit()
        except Exception as update_error:
            import logging
            logging.error(f"Failed to update error status: {update_error}")



# ============================================================================
# END OF FILE
# ============================================================================


