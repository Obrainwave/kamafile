import sys
import os
import logging
from typing import List, Dict, Any

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.reranker import get_reranker_service

# Configure logging
logging.basicConfig(level=logging.INFO)

def test_reranker():
    print("\n--- Testing LLM-based Reranker Service ---\n")
    
    try:
        service = get_reranker_service()
    except Exception as e:
        print(f"⚠️ Reranker init failed (OpenAI API key missing?): {e}")
        return

    query = "What is the penalty for late filing?"
    
    # Mock documents with varying relevance
    documents = [
        {
            "text": "The weather in Lagos is sunny.", 
            "metadata": {"parent_text": "The weather in Lagos is sunny."},
            "score": 0.9, # Artificially high vector score (false positive)
            "id": "doc1"
        },
        {
            "text": "The penalty for late filing is N50,000.", 
            "metadata": {"parent_text": "Section 20: The penalty for late filing is N50,000."},
            "score": 0.5, # Lower vector score (but highly relevant)
            "id": "doc2"
        },
        {
            "text": "Filing is important for compliance.", 
            "metadata": {"parent_text": "Filing is important for compliance."},
            "score": 0.7,
            "id": "doc3"
        }
    ]
    
    print(f"Query: '{query}'")
    print("Original Order (by vector score):")
    for doc in documents:
        print(f"  - {doc['id']}: {doc['score']} | {doc['text']}")
        
    reranked = service.rank(query, documents, top_k=3)
    
    print("\nReranked Order (by LLM relevance score):")
    for doc in reranked:
        print(f"  - {doc['id']}: {doc['score']:.1f}/10 (was {doc.get('original_score', 'N/A')}) | {doc['text']}")
        
    # Validation
    top_doc = reranked[0]
    if top_doc['id'] == 'doc2':
        print("\n✅ SUCCESS: Relevant document promoted to top!")
    else:
        print(f"\n❌ FAILURE: Top document is {top_doc['id']} (Expected doc2)")

if __name__ == "__main__":
    test_reranker()
