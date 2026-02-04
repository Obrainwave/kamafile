"""
Test script for RAG query functionality
Tests the complete RAG pipeline: intent classification → embedding → retrieval → LLM answer
"""
import asyncio
import sys
import os
sys.path.insert(0, '/app')

from services.rag_query_service import RAGQueryService
from services.vector_store import get_vector_store
from services.embedding_service import get_embedding_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_rag_query(query: str):
    """Test a single RAG query"""
    print(f"\n{'='*80}")
    print(f"Testing Query: {query}")
    print(f"{'='*80}\n")
    
    try:
        rag_service = RAGQueryService()
        result = await rag_service.process_query(query)
        
        print(f"✅ Intent: {result['intent']}")
        print(f"✅ Confidence: {result['confidence']}")
        print(f"✅ Retrieved Chunks: {result['retrieved_chunks']}")
        if result.get('chunk_scores'):
            print(f"✅ Chunk Scores: {[f'{s:.3f}' for s in result['chunk_scores']]}")
        
        print(f"\n📄 Answer:\n{result['answer']}\n")
        
        if result.get('citations'):
            print(f"📚 Citations ({len(result['citations'])}):")
            for i, citation in enumerate(result['citations'], 1):
                law_name = citation.get('law_name', 'Unknown')
                section = citation.get('section_number', '')
                year = citation.get('year', '')
                score = citation.get('score', 0.0)
                print(f"  {i}. {law_name}", end='')
                if year:
                    print(f" ({year})", end='')
                if section:
                    print(f", Section {section}", end='')
                print(f" [Score: {score:.3f}]")
        else:
            print("📚 No citations found")
        
        if result.get('error'):
            print(f"\n⚠️  Error: {result['error']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error testing query: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_vector_store_info():
    """Test vector store info retrieval"""
    print(f"\n{'='*80}")
    print("Vector Store Information")
    print(f"{'='*80}\n")
    
    try:
        es = get_embedding_service()
        # OLD: test_embedding = es.embed_text("test")
        # OLD: vs = get_vector_store(len(test_embedding))
        vector_size = es.get_embedding_dimension()
        vs = get_vector_store(vector_size)
        info = vs.get_collection_info()
        
        print(f"✅ Collection: {info.get('name')}")
        print(f"✅ Points Count: {info.get('points_count')}")
        print(f"✅ Indexed Vectors: {info.get('indexed_vectors_count')}")
        print(f"✅ Status: {info.get('status')}")
        print(f"✅ Segments: {info.get('segments_count')}")
        print(f"✅ Vector Size: {info.get('config', {}).get('vector_size')}")
        print(f"✅ Distance: {info.get('config', {}).get('distance')}")
        
        return info
        
    except Exception as e:
        print(f"❌ Error getting vector store info: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_sample_search():
    """Test sample vector search"""
    print(f"\n{'='*80}")
    print("Sample Vector Search Test")
    print(f"{'='*80}\n")
    
    try:
        es = get_embedding_service()
        test_query = "What is VAT rate in Nigeria?"
        print(f"Query: {test_query}")
        
        query_embedding = await es.embed_text(test_query)
        print(f"✅ Generated embedding (dimension: {len(query_embedding)})")
        
        vs = get_vector_store(len(query_embedding))
        results = vs.search(
            query_embedding=query_embedding,
            top_k=3,
            min_score=0.3
        )
        
        print(f"✅ Retrieved {len(results)} chunks\n")
        
        for i, chunk in enumerate(results, 1):
            print(f"Chunk {i}:")
            print(f"  Score: {chunk.get('score', 0):.3f}")
            metadata = chunk.get('metadata', {})
            print(f"  Law: {metadata.get('law_name', 'Unknown')}")
            print(f"  Section: {metadata.get('section_number', 'N/A')}")
            print(f"  Year: {metadata.get('year', 'N/A')}")
            text_preview = chunk.get('text', '')[:200]
            print(f"  Preview: {text_preview}...")
            print()
        
        return results
        
    except Exception as e:
        print(f"❌ Error in sample search: {e}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Run all tests"""
    print("🧪 RAG Query System Test Suite")
    print("=" * 80)
    
    # Test 1: Vector Store Info
    await test_vector_store_info()
    
    # Test 2: Sample Search
    await test_sample_search()
    
    # Test 3: RAG Queries (only if we have data)
    test_queries = [
        "What is VAT?",
        "What is the VAT rate in Nigeria?",
        "What is PAYE?",
        "When should I file my tax return?",
        "What documents do I need for tax filing?",
    ]
    
    print(f"\n{'='*80}")
    print("Testing RAG Queries")
    print(f"{'='*80}")
    print("\n⚠️  Note: LLM answers require API key configuration.")
    print("    If no API key is set, you'll see 'LLM service is not configured' message.\n")
    
    for query in test_queries:
        await test_rag_query(query)
        await asyncio.sleep(1)  # Small delay between queries


if __name__ == "__main__":
    asyncio.run(main())
