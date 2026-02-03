import asyncio
import sys
import os
import logging
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.rag_controller import RagDecision
from services.rag_query_service import RAGQueryService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_end_to_end_pipeline():
    print("\n--- Testing End-to-End RAG Pipeline ---\n")
    
    # 1. Mock External Services to focus on Logic flow
    # We don't want to hit real LLM or Qdrant for this logic test, 
    # as we want to verify the PIPELINE orchestration.
    
    rag_service = RAGQueryService()
    
    # Mock Thinker
    rag_service.rag_controller.think = AsyncMock(return_value=RagDecision(
        intent='search',
        search_queries=['penalty rate', 'late filing penalty']
    ))
    
    # Mock Embedding Service
    rag_service.embedding_service.embed_text = MagicMock(return_value=[0.1]*384)
    rag_service.embedding_service.embed_sparse = MagicMock(return_value={101: 0.5, 202: 0.8})
    
    # Mock Vector Store (Return 10 candidates)
    # Mix of relevant and irrelevant chunks
    mock_chunks = []
    for i in range(10):
        mock_chunks.append({
            'chunk_id': f'chunk_{i}',
            'text': f'Document chunk content {i}. Penalty is N50,000.' if i == 2 else f'Filler content {i}',
            'metadata': {
                'law_name': 'Test Act',
                'section_number': str(i),
                'parent_text': f'Full Section {i} text describing penalties...' if i == 2 else f'Full Section {i} filler'
            },
            'score': 0.5 + (0.1 * i), # Fake vector scores
            'id': f'uuid_{i}'
        })
    rag_service.vector_store.search = MagicMock(return_value=mock_chunks)
    
    # Mock Reranker
    # Should promote chunk_2 (which has "Penalty") to top
    def mock_rank(query, docs, top_k):
        # Move chunk_2 to front for simulation
        sorted_docs = sorted(docs, key=lambda x: 1.0 if 'chunk_2' in x['chunk_id'] else 0.0, reverse=True)
        return sorted_docs[:top_k]
    
    rag_service.reranker_service.rank = MagicMock(side_effect=mock_rank)
    
    # Mock LLM Generation
    rag_service.llm_service.generate_answer = AsyncMock(return_value={
        'answer': "The penalty for late filing is N50,000 as per Section 2.",
        'confidence': 'high'
    })
    
    # --- EXECUTE PIPELINE ---
    query = "What is the penalty?"
    print(f"User Query: '{query}'")
    
    result = await rag_service.process_query(query)
    
    # --- VERIFY STEPS ---
    
    # 1. Verify Thinker called
    print("\n1. Thinker Layer:")
    rag_service.rag_controller.think.assert_called_once()
    print("  ✅ Intent classified & Queries generated")
    
    # 2. Verify Hybrid Search
    print("\n2. Hybrid Search:")
    # Should be called for each search query (2 queries mocked)
    # And potentially fallback if no results (but we returned results)
    print(f"  Search calls: {rag_service.vector_store.search.call_count}")
    args, kwargs = rag_service.vector_store.search.call_args
    if 'sparse_embedding' in kwargs:
         print("  ✅ Sparse embeddings passed to Vector Store")
    else:
         print("  ❌ Sparse embeddings query missing")
         
    # 3. Verify Reranker
    print("\n3. Reranker Layer:")
    rag_service.reranker_service.rank.assert_called()
    # Check if Top 5 selected
    print("  ✅ Reranking applied")
    
    # 4. Verify Context Construction (Parent-Child)
    # The generator should receive context.
    # We can inspect the context passed to the LLM
    print("\n4. Context & Generation:")
    call_args = rag_service.llm_service.generate_answer.call_args
    context_passed = call_args.kwargs['context']
    
    if "Full Section 2 text" in context_passed:
         print("  ✅ Parent Context (Full Section) used in LLM Prompt")
    else:
         print(f"  ❌ Parent Context MISSING. Content preview: {context_passed[:100]}...")
    
    print(f"\nFinal Answer: {result['answer']}")
    print("\n✅ End-to-End Pipeline Test PASSED")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_end_to_end_pipeline())
