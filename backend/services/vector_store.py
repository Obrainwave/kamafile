"""
Vector Database Service for RAG
Uses Qdrant for storing and retrieving document chunks with metadata filtering
Qdrant provides a web UI for viewing vector data at http://localhost:6333/dashboard
"""
from typing import List, Dict, Any, Optional
import logging
import os
import hashlib
from uuid import UUID

# Lazy import to allow server to start even if qdrant_client isn't installed yet
logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    logger.warning("qdrant-client not installed. Vector store will not be available. Install with: pip install qdrant-client")

logger = logging.getLogger(__name__)

# Qdrant configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
QDRANT_COLLECTION_NAME = "tax_legal_documents"
# Vector size will be determined from embedding model
# Default: 384 for all-MiniLM-L6-v2


class VectorStore:
    """Vector database for storing and retrieving legal document chunks using Qdrant"""
    
    def __init__(self, vector_size: int = 384):
        """
        Initialize Qdrant client and collection
        
        Args:
            vector_size: Size of embedding vectors (default 384 for all-MiniLM-L6-v2)
        """
        if not QDRANT_AVAILABLE:
            raise ImportError(
                "qdrant-client is not installed. "
                "Please install it with: pip install qdrant-client"
            )
        
        try:
            self.vector_size = vector_size
            
            # Initialize Qdrant client
            if QDRANT_API_KEY:
                self.client = QdrantClient(
                    url=f"http://{QDRANT_HOST}:{QDRANT_PORT}",
                    api_key=QDRANT_API_KEY
                )
            else:
                self.client = QdrantClient(
                    host=QDRANT_HOST,
                    port=QDRANT_PORT
                )
            
            # Check if collection exists, create if not
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if QDRANT_COLLECTION_NAME not in collection_names:
                self.client.create_collection(
                    collection_name=QDRANT_COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=vector_size,
                        distance=Distance.COSINE  # Cosine similarity for semantic search
                    )
                )
                logger.info(f"Created Qdrant collection: {QDRANT_COLLECTION_NAME} with vector size {vector_size}")
            else:
                logger.info(f"Using existing Qdrant collection: {QDRANT_COLLECTION_NAME}")
            
            self.collection_name = QDRANT_COLLECTION_NAME
            logger.info(f"Vector store initialized (Qdrant at {QDRANT_HOST}:{QDRANT_PORT})")
            logger.info(f"Qdrant Web UI available at: http://{QDRANT_HOST}:{QDRANT_PORT}/dashboard")
            
        except Exception as e:
            logger.error(f"Error initializing Qdrant client: {e}")
            raise
    
    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        document_id: str
    ) -> None:
        """
        Add document chunks to vector database
        
        Args:
            chunks: List of chunk dictionaries with 'text', 'metadata', 'chunk_id'
            embeddings: List of embedding vectors
            document_id: Source document ID
        """
        try:
            points = []
            for i, chunk in enumerate(chunks):
                # Prepare metadata (Qdrant requires string values for filtering)
                metadata = {}
                for key, value in chunk['metadata'].items():
                    if value is not None:
                        # Convert to string for Qdrant metadata
                        if isinstance(value, (dict, list)):
                            metadata[key] = str(value)
                        else:
                            metadata[key] = value
                
                # Add document and chunk IDs
                metadata['document_id'] = document_id
                metadata['chunk_id'] = chunk['chunk_id']
                metadata['text'] = chunk['text'][:1000]  # Store first 1000 chars for preview
                
                # Generate a deterministic UUID from document_id and chunk_id using MD5 hash
                # This ensures the same chunk always gets the same ID (idempotent)
                # Qdrant requires proper UUID format, not composite strings like "doc_id_chunk_id"
                combined = f"{document_id}_{chunk['chunk_id']}"
                hashed = hashlib.md5(combined.encode()).hexdigest()
                # Format MD5 hash as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                # MD5 produces 32 hex chars, UUID needs them in 8-4-4-4-12 format
                formatted_uuid = f"{hashed[:8]}-{hashed[8:12]}-{hashed[12:16]}-{hashed[16:20]}-{hashed[20:32]}"
                # Convert to UUID object then to string for Qdrant (validates format)
                point_id = str(UUID(formatted_uuid))
                
                point = PointStruct(
                    id=point_id,
                    vector=embeddings[i],
                    payload={
                        **metadata,
                        'full_text': chunk['text']  # Store full text in payload
                    }
                )
                points.append(point)
            
            # Upsert points (insert or update)
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Added {len(chunks)} chunks for document {document_id} to Qdrant")
        except Exception as e:
            logger.error(f"Error adding chunks to Qdrant: {e}")
            raise
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant chunks
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_metadata: Metadata filters (e.g., {'law_name': 'VAT Act'})
            min_score: Minimum similarity score threshold
            
        Returns:
            List of relevant chunks with scores
        """
        try:
            # Build filter if metadata provided
            query_filter = None
            if filter_metadata:
                conditions = []
                for key, value in filter_metadata.items():
                    conditions.append(
                        FieldCondition(key=key, match=MatchValue(value=value))
                    )
                if conditions:
                    query_filter = Filter(must=conditions)
            
            # Search
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k,
                query_filter=query_filter,
                score_threshold=min_score
            )
            
            # Format results
            chunks = []
            for result in search_results:
                chunks.append({
                    'text': result.payload.get('full_text', result.payload.get('text', '')),
                    'metadata': {k: v for k, v in result.payload.items() if k != 'full_text'},
                    'score': result.score,
                    'id': str(result.id)  # Convert UUID to string for JSON serialization
                })
            
            return chunks
        except Exception as e:
            logger.error(f"Error searching Qdrant: {e}")
            return []
    
    def delete_document(self, document_id: str) -> None:
        """Delete all chunks for a document"""
        try:
            # Search for all points with this document_id
            search_results = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000  # Large limit to get all
            )
            
            if search_results[0]:  # Points found
                # Keep point IDs as-is (they should be UUIDs from Qdrant)
                # Qdrant delete accepts a list of IDs directly
                point_ids = [point.id for point in search_results[0]]
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=point_ids
                )
                logger.info(f"Deleted {len(point_ids)} chunks for document {document_id} from Qdrant")
        except Exception as e:
            logger.error(f"Error deleting document chunks from Qdrant: {e}")
            raise
    
    def get_document_chunks(self, document_id: str) -> List[Dict[str, Any]]:
        """Get all chunks for a specific document"""
        try:
            search_results = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000
            )
            
            chunks = []
            if search_results[0]:
                for point in search_results[0]:
                    chunks.append({
                        'text': point.payload.get('full_text', point.payload.get('text', '')),
                        'metadata': {k: v for k, v in point.payload.items() if k != 'full_text'},
                        'id': str(point.id)
                    })
            
            return chunks
        except Exception as e:
            logger.error(f"Error getting document chunks from Qdrant: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get collection information (for debugging/monitoring)"""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            # CollectionInfo doesn't have a 'name' attribute - use the collection name we requested
            indexed_count = getattr(collection_info, 'indexed_vectors_count', None)
            # If indexed_vectors_count is 0 but points_count > 0, it means indexing is in progress
            # In Qdrant, vectors are searchable even if indexed_vectors_count is 0 (full scan mode)
            # For UI purposes, if indexed is 0 but we have points, show points_count as indexed
            # (all points are technically searchable, just not optimally indexed)
            if indexed_count == 0 and collection_info.points_count > 0:
                indexed_count = collection_info.points_count  # All points are searchable
            elif indexed_count is None:
                indexed_count = collection_info.points_count  # Fallback if attribute doesn't exist
            
            return {
                'name': self.collection_name,  # Use the collection name we know
                'points_count': collection_info.points_count,  # Total number of chunks/points
                'vectors_count': collection_info.points_count,  # Alias for backward compatibility
                'indexed_vectors_count': indexed_count,  # Number of indexed vectors (use points_count if indexing in progress)
                'status': collection_info.status.value if hasattr(collection_info.status, 'value') else str(collection_info.status),
                'optimizer_status': getattr(collection_info, 'optimizer_status', None),  # Check if optimizer is running
                'segments_count': getattr(collection_info, 'segments_count', None),  # Number of segments
                'config': {
                    'vector_size': collection_info.config.params.vectors.size,
                    'distance': str(collection_info.config.params.vectors.distance) if hasattr(collection_info.config.params.vectors.distance, 'value') else str(collection_info.config.params.vectors.distance)
                }
            }
        except Exception as e:
            logger.error(f"Error getting collection info from Qdrant: {e}", exc_info=True)
            # Return structure with error info instead of empty dict
            return {
                'name': self.collection_name,
                'points_count': 0,
                'vectors_count': 0,
                'indexed_vectors_count': 0,
                'status': 'error',
                'error': str(e)[:200],  # Truncate error message
                'config': {
                    'vector_size': self.vector_size,
                    'distance': 'Cosine'
                }
            }


# Global vector store instance
_vector_store: Optional[VectorStore] = None


def get_vector_store(vector_size: int = 384) -> VectorStore:
    """
    Get or create vector store instance
    
    Args:
        vector_size: Size of embedding vectors (default 384 for all-MiniLM-L6-v2)
    """
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore(vector_size=vector_size)
    return _vector_store
