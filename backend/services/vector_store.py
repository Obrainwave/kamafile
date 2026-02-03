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
    from qdrant_client.models import (
        Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue,
        SparseVectorParams, SparseIndexParams, Modifier, Prefetch, FusionQuery, Fusion
    )
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    logger.warning("qdrant-client not installed. Vector store will not be available. Install with: pip install qdrant-client")

logger = logging.getLogger(__name__)

# Qdrant configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
# Use a new collection name for Hybrid Search to avoid conflicts with old single-vector collection
QDRANT_COLLECTION_NAME = "tax_documents_hybrid"


class VectorStore:
    """Vector database for storing and retrieving legal document chunks using Qdrant (Hybrid Search)"""
    
    def __init__(self, vector_size: int = 384):
        """
        Initialize Qdrant client and collection with Hybrid Config
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
            
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if QDRANT_COLLECTION_NAME not in collection_names:
                # Create collection with Named Vectors (Dense + Sparse)
                self.client.create_collection(
                    collection_name=QDRANT_COLLECTION_NAME,
                    vectors_config={
                        "text-dense": VectorParams(
                            size=vector_size,
                            distance=Distance.COSINE
                        )
                    },
                    sparse_vectors_config={
                        "text-sparse": SparseVectorParams(
                            index=SparseIndexParams(
                                on_disk=False,
                            )
                        )
                    }
                )
                logger.info(f"Created Hybrid Qdrant collection: {QDRANT_COLLECTION_NAME}")
            else:
                logger.info(f"Using existing Qdrant collection: {QDRANT_COLLECTION_NAME}")
            
            self.collection_name = QDRANT_COLLECTION_NAME
            logger.info(f"Vector store initialized (Qdrant at {QDRANT_HOST}:{QDRANT_PORT})")
            
        except Exception as e:
            logger.error(f"Error initializing Qdrant client: {e}")
            raise
    
    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        document_id: str,
        sparse_embeddings: Optional[List[Dict[int, float]]] = None
    ) -> None:
        """
        Add document chunks to vector database
        
        Args:
            chunks: List of chunk dictionaries
            embeddings: List of dense vectors
            document_id: Source document ID
            sparse_embeddings: List of sparse vectors (dicts of index->weight)
        """
        try:
            points = []
            for i, chunk in enumerate(chunks):
                # Prepare metadata
                metadata = {}
                for key, value in chunk['metadata'].items():
                    if value is not None:
                        if isinstance(value, (dict, list)):
                            metadata[key] = str(value)
                        else:
                            metadata[key] = value
                
                metadata['document_id'] = document_id
                metadata['chunk_id'] = chunk['chunk_id']
                metadata['text'] = chunk['text'][:2000] # Store text for retrieval
                
                # Deterministic UUID
                combined = f"{document_id}_{chunk['chunk_id']}"
                hashed = hashlib.md5(combined.encode()).hexdigest()
                formatted_uuid = f"{hashed[:8]}-{hashed[8:12]}-{hashed[12:16]}-{hashed[16:20]}-{hashed[20:32]}"
                point_id = str(UUID(formatted_uuid))
                
                # Build Vector dictionary (Dense + Sparse)
                vector_dict = {
                    "text-dense": embeddings[i]
                }
                if sparse_embeddings and i < len(sparse_embeddings) and sparse_embeddings[i]:
                    # Qdrant expects sparse vector as specific structure or dict
                    # Python client accepts dict {index: value} or SparseVector object
                    # We pass the dict directly if client supports it, or SparseVector
                    # For safety with 1.11+, we pass SparseVector(indices=..., values=...)
                    # provided by qdrant_client.models
                    # Or simple dict if using fastembed dict, assuming client handles it.
                    # Qdrant client usually expects SparseVector Object for named sparse vectors.
                    
                    indices = list(sparse_embeddings[i].keys())
                    values = list(sparse_embeddings[i].values())
                    from qdrant_client.models import SparseVector
                    vector_dict["text-sparse"] = SparseVector(indices=indices, values=values)

                point = PointStruct(
                    id=point_id,
                    vector=vector_dict,
                    payload={
                        **metadata,
                        'full_text': chunk['text']
                    }
                )
                points.append(point)
            
            # Upsert
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Added {len(chunks)} chunks for document {document_id} to Qdrant (Hybrid)")
        except Exception as e:
            logger.error(f"Error adding chunks to Qdrant: {e}")
            raise
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        min_score: float = 0.0,
        sparse_embedding: Optional[Dict[int, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Hybrid Search for relevant chunks
        
        Args:
            query_embedding: Dense query vector
            top_k: Number of results
            filter_metadata: Filters
            min_score: Minimum score
            sparse_embedding: Sparse query vector (optional)
        """
        try:
            query_filter = None
            if filter_metadata:
                conditions = []
                for key, value in filter_metadata.items():
                    conditions.append(
                        FieldCondition(key=key, match=MatchValue(value=value))
                    )
                if conditions:
                    query_filter = Filter(must=conditions)
            
            # If sparse vector provided, perform Hybrid Search with RRF Fusion
            if sparse_embedding:
                from qdrant_client.models import SparseVector
                indices = list(sparse_embedding.keys())
                values = list(sparse_embedding.values())
                sparse_vec_obj = SparseVector(indices=indices, values=values)

                # Use Query API (available in recent Qdrant versions)
                prefetch = [
                    Prefetch(
                        query=query_embedding,
                        using="text-dense",
                        limit=top_k * 2,
                        filter=query_filter
                    ),
                    Prefetch(
                        query=sparse_vec_obj,
                        using="text-sparse",
                        limit=top_k * 2,
                        filter=query_filter
                    ),
                ]
                
                search_results = self.client.query_points(
                    collection_name=self.collection_name,
                    prefetch=prefetch,
                    query=FusionQuery(fusion=Fusion.RRF),
                    limit=top_k,
                    score_threshold=min_score if min_score > 0 else None
                ).points
                
            else:
                # Fallback to standard Dense-only search
                search_results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=("text-dense", query_embedding), # Use named vector
                    limit=top_k,
                    query_filter=query_filter,
                    score_threshold=min_score
                )
            
            # Format results
            chunks = []
            for result in search_results:
                payload = result.payload or {}
                chunks.append({
                    'text': payload.get('full_text', payload.get('text', '')),
                    'metadata': {k: v for k, v in payload.items() if k != 'full_text'},
                    'score': result.score,
                    'id': str(result.id)
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
            
            # Handle named vectors (dict structure) vs single vector (object with .size)
            vectors_config = collection_info.config.params.vectors
            if isinstance(vectors_config, dict):
                # Named vectors - get the first one (text-dense)
                first_vector = next(iter(vectors_config.values()), None)
                vector_size = first_vector.size if first_vector else self.vector_size
                vector_distance = str(first_vector.distance) if first_vector else 'Cosine'
            else:
                # Single vector config
                vector_size = vectors_config.size
                vector_distance = str(vectors_config.distance) if hasattr(vectors_config.distance, 'value') else str(vectors_config.distance)
            
            return {
                'name': self.collection_name,  # Use the collection name we know
                'points_count': collection_info.points_count,  # Total number of chunks/points
                'vectors_count': collection_info.points_count,  # Alias for backward compatibility
                'indexed_vectors_count': indexed_count,  # Number of indexed vectors (use points_count if indexing in progress)
                'status': collection_info.status.value if hasattr(collection_info.status, 'value') else str(collection_info.status),
                'optimizer_status': getattr(collection_info, 'optimizer_status', None),  # Check if optimizer is running
                'segments_count': getattr(collection_info, 'segments_count', None),  # Number of segments
                'config': {
                    'vector_size': vector_size,
                    'distance': vector_distance
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


def get_vector_store(vector_size: int = 1536) -> VectorStore:
    """
    Get or create vector store instance
    
    Args:
        vector_size: Size of embedding vectors (default 1536 for OpenAI text-embedding-3-small)
    """
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore(vector_size=vector_size)
    return _vector_store
