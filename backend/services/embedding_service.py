"""
Embedding Service for generating vector embeddings
Uses OpenAI API for dense embeddings
"""
from typing import List, Dict, Optional
import logging
import os

logger = logging.getLogger(__name__)

# OpenAI embeddings
OPENAI_AVAILABLE = False
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("openai not installed. Dense embeddings will not be available.")

# Sparse embeddings (fastembed)
FASTEMBED_AVAILABLE = False
try:
    from fastembed import SparseTextEmbedding
    FASTEMBED_AVAILABLE = True
except ImportError:
    logger.warning("fastembed not installed. Sparse embeddings will not be available.")

# OpenAI embedding model - text-embedding-3-small has 1536 dimensions
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
# SPLADE model for sparse retrieval (unchanged)
SPARSE_MODEL_NAME = os.getenv("SPARSE_MODEL", "prithivida/Splade_PP_en_v1")


class EmbeddingService:
    """Service for generating dense (OpenAI) and sparse (SPLADE) embeddings"""
    
    def __init__(self):
        """Initialize the embedding models"""
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai is not installed. "
                "Please install it with: pip install openai"
            )
        
        # Check for API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. "
                "Please set it to use OpenAI embeddings."
            )
        
        try:
            logger.info(f"Initializing OpenAI embedding client with model: {EMBEDDING_MODEL_NAME}")
            # Use AsyncOpenAI for non-blocking I/O
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=api_key)
            self.model_name = EMBEDDING_MODEL_NAME
            logger.info("OpenAI embedding client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing OpenAI client: {e}")
            raise

        # Initialize Sparse Model (SPLADE via fastembed)
        # This model runs on CPU, so we'll need to run inference in an executor
        self.sparse_model = None
        if FASTEMBED_AVAILABLE:
            try:
                logger.info(f"Loading sparse embedding model: {SPARSE_MODEL_NAME}")
                self.sparse_model = SparseTextEmbedding(model_name=SPARSE_MODEL_NAME, threads=1)
                logger.info("Sparse embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading sparse embedding model: {e}")
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate dense embedding for a single text using OpenAI (Async)"""
        try:
            response = await self.client.embeddings.create(
                model=self.model_name,
                input=text
            )
            embedding = response.data[0].embedding
            return embedding
        except Exception as e:
            logger.error(f"Error generating OpenAI embedding: {e}")
            raise
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate dense embeddings for multiple texts using OpenAI (Async)"""
        try:
            # OpenAI supports batch embedding in a single request
            response = await self.client.embeddings.create(
                model=self.model_name,
                input=texts
            )
            # Sort by index to ensure order matches input
            sorted_data = sorted(response.data, key=lambda x: x.index)
            embeddings = [item.embedding for item in sorted_data]
            return embeddings
        except Exception as e:
            logger.error(f"Error generating OpenAI batch embeddings: {e}")
            raise

    async def embed_sparse(self, text: str) -> Dict[int, float]:
        """Generate sparse embedding for a single text (SPLADE) - Runs in Executor"""
        if not self.sparse_model:
            return {}
        
        import asyncio
        loop = asyncio.get_running_loop()
        
        def _run_sync():
            try:
                embeddings = list(self.sparse_model.embed([text]))
                if not embeddings:
                    return {}
                sparse_vector = embeddings[0]
                indices = sparse_vector.indices.tolist()
                values = sparse_vector.values.tolist()
                return dict(zip(indices, values))
            except Exception as e:
                logger.error(f"Error generating sparse embedding: {e}")
                return {}
                
        return await loop.run_in_executor(None, _run_sync)

    async def embed_sparse_batch(self, texts: List[str]) -> List[Dict[int, float]]:
        """Generate sparse embeddings for multiple texts (SPLADE) - Runs in Executor"""
        if not self.sparse_model:
            return [{} for _ in texts]
        
        import asyncio
        loop = asyncio.get_running_loop()
        
        def _run_sync():
            try:
                embeddings = list(self.sparse_model.embed(texts))
                results = []
                for sparse_vector in embeddings:
                    indices = sparse_vector.indices.tolist()
                    values = sparse_vector.values.tolist()
                    results.append(dict(zip(indices, values)))
                return results
            except Exception as e:
                logger.error(f"Error generating sparse batch embeddings: {e}")
                return [{} for _ in texts]

        return await loop.run_in_executor(None, _run_sync)

    def get_embedding_dimension(self) -> int:
        """Return the dimension of the embedding model"""
        # text-embedding-3-small: 1536 dimensions
        # text-embedding-3-large: 3072 dimensions
        # text-embedding-ada-002: 1536 dimensions
        if "3-small" in self.model_name or "ada-002" in self.model_name:
            return 1536
        elif "3-large" in self.model_name:
            return 3072
        else:
            # Default to 1536 for unknown models
            return 1536


# Global embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create embedding service instance"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
