"""
CSV Metadata Service

Handles parsing, uploading, and managing the CSV metadata catalog for RAG documents.
"""
import csv
import io
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models import DocumentMetadataCatalog
import logging

logger = logging.getLogger(__name__)


def normalize_filename(filename: str) -> str:
    """
    Normalize filename for case-insensitive matching
    
    Removes extension, converts to lowercase, removes special characters
    Example: "NIGERIA_TAX_ACT_2025.PDF" -> "nigeriataxact2025pdf"
    """
    if not filename:
        return ""
    
    # Convert to lowercase
    normalized = filename.lower()
    
    # Remove spaces, underscores, hyphens, dots
    normalized = re.sub(r'[_\-\s\.]+', '', normalized)
    
    return normalized


def parse_csv_catalog(csv_content: bytes) -> List[Dict[str, Any]]:
    """
    Parse CSV content and return list of metadata dictionaries
    
    Args:
        csv_content: Raw CSV file bytes
        
    Returns:
        List of dictionaries with metadata for each document
        
    Raises:
        ValueError: If CSV is invalid or missing required columns
    """
    try:
        # Decode CSV content
        csv_text = csv_content.decode('utf-8-sig', errors='ignore')
        
        # Parse CSV
        csv_file = io.StringIO(csv_text)
        reader = csv.DictReader(csv_file)
        
        # Validate required columns
        required_columns = ['doc_id', 'file_name', 'source_title']
        if not reader.fieldnames:
            raise ValueError("CSV file is empty or has no headers")
        
        missing_columns = [col for col in required_columns if col not in reader.fieldnames]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Parse rows
        rows = []
        for i, row in enumerate(reader):
            # Skip empty rows
            if not row.get('doc_id') or not row.get('file_name'):
                logger.warning(f"Skipping row {i+2}: Missing doc_id or file_name")
                continue
            
            # Normalize filename for matching
            row['file_name_normalized'] = normalize_filename(row['file_name'])
            
            rows.append(row)
        
        logger.info(f"Parsed {len(rows)} valid rows from CSV")
        return rows
        
    except UnicodeDecodeError as e:
        raise ValueError(f"Invalid CSV encoding: {str(e)}")
    except csv.Error as e:
        raise ValueError(f"CSV parsing error: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing CSV: {e}", exc_info=True)
        raise ValueError(f"Failed to parse CSV: {str(e)}")


async def upload_metadata_catalog(
    csv_content: bytes,
    db: AsyncSession,
    mode: str = "replace",
    batch_size: int = 100
) -> Dict[str, Any]:
    """
    Upload CSV metadata catalog to database
    
    Args:
        csv_content: Raw CSV file bytes
        db: Database session
        mode: "replace" (delete all existing) or "merge" (upsert)
        batch_size: Number of rows to process per batch
        
    Returns:
        Dictionary with upload results:
        {
            'total_rows': int,
            'inserted': int,
            'updated': int,
            'errors': List[Dict]
        }
    """
    # Parse CSV
    rows = parse_csv_catalog(csv_content)
    
    results = {
        'total_rows': len(rows),
        'inserted': 0,
        'updated': 0,
        'errors': []
    }
    
    # Replace mode: delete all existing entries
    if mode == "replace":
        await db.execute(delete(DocumentMetadataCatalog))
        await db.flush()
        logger.info("Deleted all existing catalog entries (replace mode)")
    
    # Process in batches
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        
        for row in batch:
            try:
                result = await upsert_catalog_entry(row, db, mode)
                if result == "inserted":
                    results['inserted'] += 1
                else:
                    results['updated'] += 1
            except Exception as e:
                logger.error(f"Error processing row {i + batch.index(row)}: {e}")
                results['errors'].append({
                    'row': i + batch.index(row) + 2,  # +2 for header and 0-index
                    'doc_id': row.get('doc_id'),
                    'error': str(e)
                })
        
        # Commit after each batch
        await db.commit()
        logger.info(f"Processed batch {i//batch_size + 1}/{(len(rows)//batch_size)+1}")
    
    return results


async def upsert_catalog_entry(
    row: Dict[str, Any],
    db: AsyncSession,
    mode: str
) -> str:
    """
    Insert or update a single catalog entry
    
    Args:
        row: Dictionary with metadata fields
        db: Database session
        mode: "replace" or "merge"
        
    Returns:
        "inserted" or "updated"
    """
    # Check if entry exists (by doc_id)
    result = await db.execute(
        select(DocumentMetadataCatalog).where(
            DocumentMetadataCatalog.doc_id == row['doc_id']
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing and mode == "merge":
        # Update existing entry
        for key, value in row.items():
            if hasattr(existing, key) and value:  # Only update non-empty values
                setattr(existing, key, value)
        await db.flush()
        return "updated"
    else:
        # Insert new entry
        entry = DocumentMetadataCatalog(
            doc_id=row.get('doc_id'),
            file_name=row.get('file_name'),
            file_name_normalized=row.get('file_name_normalized'),
            source_title=row.get('source_title'),
            source_file_type=row.get('Source_file_type'),  # Note: Capital S in CSV
            issuing_body=row.get('issuing_body'),
            country=row.get('country'),
            jurisdiction_level=row.get('jurisdiction_level'),
            knowledge_domain=row.get('knowledge_domain'),
            tax_type=row.get('tax_type'),
            taxpayer_type=row.get('taxpayer_type'),
            doc_category=row.get('doc_category'),
            effective_date=row.get('effective_date'),
            expiry_date=row.get('expiry_date'),
            publication_date=row.get('publication_date'),
            version=row.get('version'),
            supersedes_doc_id=row.get('supersedes_doc_id'),
            lifecycle_stage=row.get('lifecycle_stage'),
            authority_level=row.get('authority_level'),
            intended_usage=row.get('intended_usage'),
            topic_tags=row.get('topic_tags'),
            status=row.get('status'),
            language=row.get('language'),
            notes=row.get('notes')
        )
        db.add(entry)
        await db.flush()
        return "inserted"


async def lookup_metadata_by_filename(
    filename: str,
    db: AsyncSession
) -> Optional[Dict[str, Any]]:
    """
    Look up metadata by normalized filename
    
    Args:
        filename: Original filename (will be normalized)
        db: Database session
        
    Returns:
        Dictionary with metadata or None if not found
    """
    normalized = normalize_filename(filename)
    
    result = await db.execute(
        select(DocumentMetadataCatalog).where(
            DocumentMetadataCatalog.file_name_normalized == normalized
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        logger.info(f"No metadata found for filename: {filename} (normalized: {normalized})")
        return None
    
    logger.info(f"Found metadata for {filename}: doc_id={entry.doc_id}")
    
    # Convert to dictionary
    return {
        'id': str(entry.id),
        'doc_id': entry.doc_id,
        'file_name': entry.file_name,
        'source_title': entry.source_title,
        'source_file_type': entry.source_file_type,
        'issuing_body': entry.issuing_body,
        'country': entry.country,
        'jurisdiction_level': entry.jurisdiction_level,
        'knowledge_domain': entry.knowledge_domain,
        'tax_type': entry.tax_type,
        'taxpayer_type': entry.taxpayer_type,
        'doc_category': entry.doc_category,
        'effective_date': entry.effective_date,
        'expiry_date': entry.expiry_date,
        'publication_date': entry.publication_date,
        'version': entry.version,
        'supersedes_doc_id': entry.supersedes_doc_id,
        'lifecycle_stage': entry.lifecycle_stage,
        'authority_level': entry.authority_level,
        'intended_usage': entry.intended_usage,
        'topic_tags': entry.topic_tags,
        'status': entry.status,
        'language': entry.language,
        'notes': entry.notes
    }


async def get_catalog_stats(db: AsyncSession) -> Dict[str, int]:
    """
    Get statistics about the metadata catalog
    
    Returns:
        {
            'total_entries': int,
            'matched_documents': int,
            'pending_documents': int
        }
    """
    from models import RAGDocument
    
    # Total catalog entries
    result = await db.execute(select(DocumentMetadataCatalog))
    total_entries = len(result.scalars().all())
    
    # Matched documents
    result = await db.execute(
        select(RAGDocument).where(RAGDocument.metadata_status == 'matched')
    )
    matched_documents = len(result.scalars().all())
    
    # Pending documents
    result = await db.execute(
        select(RAGDocument).where(RAGDocument.metadata_status == 'pending')
    )
    pending_documents = len(result.scalars().all())
    
    return {
        'total_entries': total_entries,
        'matched_documents': matched_documents,
        'pending_documents': pending_documents
    }


async def get_pending_documents(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Get all documents with pending metadata status
    
    Returns:
        List of RAGDocument dictionaries
    """
    from models import RAGDocument
    
    result = await db.execute(
        select(RAGDocument).where(RAGDocument.metadata_status == 'pending')
    )
    documents = result.scalars().all()
    
    return [
        {
            'id': str(doc.id),
            'title': doc.title,
            'file_name': doc.file_name,
            'source_type': doc.source_type,
            'created_at': doc.created_at.isoformat() if doc.created_at else None
        }
        for doc in documents
    ]


async def get_catalog_entries(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get catalog entries with optional search
    
    Args:
        db: Database session
        skip: Number of entries to skip (pagination)
        limit: Maximum number of entries to return
        search: Optional search query (searches doc_id, file_name, source_title)
        
    Returns:
        List of catalog entry dictionaries
    """
    query = select(DocumentMetadataCatalog)
    
    # Apply search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (DocumentMetadataCatalog.doc_id.ilike(search_pattern)) |
            (DocumentMetadataCatalog.file_name.ilike(search_pattern)) |
            (DocumentMetadataCatalog.source_title.ilike(search_pattern))
        )
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    return [
        {
            'id': str(entry.id),
            'doc_id': entry.doc_id,
            'file_name': entry.file_name,
            'source_title': entry.source_title,
            'jurisdiction_level': entry.jurisdiction_level,
            'status': entry.status,
            'doc_category': entry.doc_category,
            'effective_date': entry.effective_date,
            'created_at': entry.created_at.isoformat() if entry.created_at else None
        }
        for entry in entries
    ]
