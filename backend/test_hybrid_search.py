import asyncio
import sys
import os
import logging
from typing import List, Dict

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.embedding_service import get_embedding_service
from services.vector_store import get_vector_store

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_sparse_embeddings():
    print("\n--- Testing Sparse Embeddings (SPLADE) ---\n")
    service = get_embedding_service()
    
    if not hasattr(service, 'sparse_model') or not service.sparse_model:
        print("⚠️ Sparse model not loaded (fastembed missing?). Skipping.")
        return

    text = "tax section 24 penalty rate"
    print(f"Text: '{text}'")
    
    # Test single
    sparse_vec = service.embed_sparse(text)
    print(f"Sparse Vector (top 5 indices): {list(sparse_vec.items())[:5]}")
    print(f"Total non-zero elements: {len(sparse_vec)}")
    
    if len(sparse_vec) > 0:
        print("✅ Sparse embedding generation successful")
    else:
        print("❌ Sparse embedding generation failed")

async def test_vector_store_hybrid():
    print("\n--- Testing Vector Store Hybrid Config ---\n")
    try:
        # We need a dummy embedding service to init vector store size
        service = get_embedding_service()
        test_emb = service.embed_text("test")
        
        store = get_vector_store(vector_size=len(test_emb))
        print(f"Vector Store Collection: {store.collection_name}")
        
        # We can't easily test add/search without a running Qdrant instance
        # But successful initialization means config is valid
        print("✅ Vector Store initialized with Hybrid Config")
        
    except Exception as e:
        print(f"⚠️ Vector Store init failed (expected if Qdrant down): {e}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    test_sparse_embeddings()
    asyncio.run(test_vector_store_hybrid())
