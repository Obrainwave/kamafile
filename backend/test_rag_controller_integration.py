import asyncio
import sys
import os
import logging

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.rag_controller import get_rag_controller, RagDecision

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_thinker():
    controller = get_rag_controller()
    
    test_queries = [
        ("What is the VAT rate in Nigeria?", "search"),
        ("Hello, how are you?", "chitchat"),
        ("I'm confused about tax.", "clarify"),
        ("Tell me about Section 24 of CITA.", "search"),
        ("What can you do?", "direct_answer")
    ]
    
    print("\n--- Testing RagController (The Thinker) ---\n")
    
    for query, expected_intent in test_queries:
        print(f"Query: '{query}'")
        try:
            decision = await controller.think(query)
            print(f"  -> Decision: {decision.intent}")
            
            if decision.intent == 'search':
                print(f"  -> Queries: {decision.search_queries}")
            elif decision.intent == 'clarify':
                print(f"  -> Question: {decision.clarification_question}")
            elif decision.intent == 'chitchat':
                print(f"  -> Response: {decision.direct_response}")
                
            # Basic validation
            if decision.intent == expected_intent:
                print("  ✅ Intent MATCH")
            else:
                print(f"  ⚠️ Intent MISMATCH (Expected {expected_intent})")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
        print("-" * 40)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_thinker())
