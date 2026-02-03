"""
Reranker Service
Uses OpenAI LLM to re-score retrieval results for high precision.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Lazy loading variables
_reranker_service: Optional['RerankerService'] = None

# OpenAI for LLM-based reranking
OPENAI_AVAILABLE = False
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("openai not installed. Reranking will not be available.")

# Model configuration - gpt-4o-mini is cost-effective for scoring
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "gpt-4o-mini")


class RerankerService:
    """Service for re-ranking retrieved documents using LLM-based relevance scoring"""
    
    def __init__(self):
        """Initialize the OpenAI client for reranking"""
        if not OPENAI_AVAILABLE:
            raise ImportError("openai is not installed. Install with: pip install openai")
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set.")
        
        try:
            logger.info(f"Initializing LLM reranker with model: {RERANKER_MODEL}")
            self.client = OpenAI(api_key=api_key)
            self.model = RERANKER_MODEL
            logger.info("LLM reranker initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing reranker: {e}")
            raise

    def rank(
        self, 
        query: str, 
        documents: List[Dict[str, Any]], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Re-rank a list of documents based on relevance to the query using LLM.
        
        Args:
            query: The user query
            documents: List of document dicts. Must contain 'text' field.
            top_k: Number of top results to return
            
        Returns:
            List of re-ranked document dicts with updated 'score'
        """
        if not documents:
            return []
        
        # Limit documents to prevent token overflow (max ~15 docs)
        docs_to_rank = documents[:15]
            
        try:
            # Prepare documents for LLM scoring
            doc_texts = []
            for i, doc in enumerate(docs_to_rank):
                meta = doc.get('metadata', {})
                # Use parent_text if available for better context
                text = meta.get('parent_text') if meta.get('parent_text') else doc.get('text', '')
                if not text:
                    text = " "
                # Truncate very long texts
                text = text[:1000] if len(text) > 1000 else text
                doc_texts.append(f"[{i}] {text}")
            
            formatted_docs = "\n\n".join(doc_texts)
            
            # Create reranking prompt
            prompt = f"""You are a relevance scoring assistant. Score each document's relevance to the query on a scale of 0-10.

Query: {query}

Documents:
{formatted_docs}

Return ONLY a JSON object with document indices as keys and relevance scores as values.
Example: {{"0": 8, "1": 3, "2": 9}}

Score based on:
- How directly the document answers the query (0-10)
- Semantic relevance to the topic
- Specificity and usefulness of the information

JSON response:"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=200
            )
            
            # Parse the response
            content = response.choices[0].message.content.strip()
            
            # Handle potential markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            scores = json.loads(content)
            
            # Update scores in documents
            for i, doc in enumerate(docs_to_rank):
                doc['original_score'] = doc.get('score', 0)
                # Get score from LLM response, default to 0 if missing
                llm_score = scores.get(str(i), scores.get(i, 0))
                doc['score'] = float(llm_score)
            
            # Sort by new score descending
            ranked_docs = sorted(docs_to_rank, key=lambda x: x['score'], reverse=True)
            
            return ranked_docs[:top_k]
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM reranking response: {e}")
            # Fallback: return original top_k
            return documents[:top_k]
        except Exception as e:
            logger.error(f"Error during LLM reranking: {e}")
            # Fallback: return original top_k if reranking fails
            return documents[:top_k]


def get_reranker_service() -> RerankerService:
    """Get or create reranker service instance"""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = RerankerService()
    return _reranker_service
