"""
LLM Service with strict no-hallucination prompts
Uses DeepSeek API (as per roadmap) or OpenAI-compatible API
Temperature = 0 (deterministic, no creativity)
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

# API Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")

# Use DeepSeek if available, otherwise OpenAI
USE_DEEPSEEK = bool(DEEPSEEK_API_KEY)
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat" if USE_DEEPSEEK else "gpt-4")


class LLMService:
    """LLM service with strict no-hallucination enforcement"""
    
    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY if USE_DEEPSEEK else OPENAI_API_KEY
        self.api_url = DEEPSEEK_API_URL if USE_DEEPSEEK else OPENAI_API_URL
        self.model = LLM_MODEL
        
        if not self.api_key:
            logger.warning("No LLM API key configured. RAG answers will not be generated.")
    
    def _build_system_prompt(self, intent: str) -> str:
        """Build system prompt based on intent"""
        
        # CONCEPTUAL INTENT: Allow general knowledge
        if intent == 'conceptual':
            return """You are a helpful Nigerian Tax Consultant.
The user is asking a conceptual or philosophical question about tax (e.g., benefits, purpose, importance).

RULES:
1. Use your general knowledge to answer helpfully.
2. You do NOT need to cite specific sections unless you want to.
3. Be conversational, professional, and explaining the "WHY" behind tax.
4. Keep it relevant to the Nigerian context where possible.
5. If the question drifts into SPECIFIC rates/laws, refer to documents or say you need to check.

Tone: Friendly, educational, professional."""

        # STRICT SEARCH INTENT (and others): Documents ONLY
        return """You are a Nigerian tax information assistant. You provide information ONLY from the documents given to you.

STRICT RULES - NO EXCEPTIONS:
1. Answer ONLY using information from the provided documents
2. If the documents don't contain the answer, say simply: "I currently don't have the information to guide you on this." or "I don't have that specific information in my records yet."
3. Do NOT explain what your documents *do* contain (e.g., "The documents discuss X, Y...") - it sounds robotic.
4. NEVER guess, assume, or use external knowledge
5. NEVER give advice like "you should..." or "you'll need to..."
6. State ONLY what the documents explicitly say

EXAMPLES:
- BAD: "To start a business, you'll need a TIN..." (guessing)
- BAD: "I don't have that info. My records only cover Withholding Tax..." (too robotic)
- GOOD: "I currently don't have the information to guide you on business registration."
- GOOD: "My records don't cover VAT rates at the moment."

TONE: Helpful, simple, direct.
FORMAT: Brief statements."""
    
    def _build_user_prompt(self, query: str, context: str, response_style: str = "detailed") -> str:
        """Build user prompt with context"""
        if response_style == "concise":
            return f"""Documents available:
{context}

---

User question: {query}

Answer in 1-2 sentences using ONLY information from the documents above. If the documents don't have the answer, say "I don't have that specific information in my records." """
        else:
            return f"""Documents available:
{context}

---

User question: {query}

Answer using ONLY the documents above:
- State what the documents say
- If the documents don't cover this topic, say "I don't have that information in my current records"
- Don't guess or add information not in the documents"""
    
    async def generate_answer(
        self,
        query: str,
        context: str,
        intent: str = 'general',
        response_style: str = 'detailed'
    ) -> Dict[str, Any]:
        """
        Generate answer with strict no-hallucination enforcement
        
        Args:
            query: User question
            context: Retrieved document chunks
            intent: Classified intent
            response_style: 'concise' for brief answers, 'detailed' for comprehensive
            
        Returns:
            Dictionary with 'answer' and 'confidence'
        """
        if not self.api_key:
            return {
                'answer': "LLM service is not configured. Please configure API keys.",
                'confidence': 'low'
            }
        
        try:
            system_prompt = self._build_system_prompt(intent)
            user_prompt = self._build_user_prompt(query, context, response_style)
            
            # Adjust max_tokens based on response style
            max_tokens = 200 if response_style == "concise" else 400
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0,  # CRITICAL: No creativity, deterministic
                "max_tokens": max_tokens,
                "top_p": 0.1  # Very focused sampling
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
            
            answer = result['choices'][0]['message']['content']
            
            # Calculate confidence based on response characteristics
            confidence = self._calculate_confidence(answer, context)
            
            return {
                'answer': answer,
                'confidence': confidence
            }
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling LLM API: {e}")
            return {
                'answer': "I encountered an error while generating the answer. Please try again.",
                'confidence': 'low',
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error generating LLM answer: {e}", exc_info=True)
            return {
                'answer': "I encountered an error while processing your question. Please try again.",
                'confidence': 'low',
                'error': str(e)
            }
    
    def _calculate_confidence(self, answer: str, context: str) -> str:
        """Calculate confidence level based on answer characteristics"""
        # Low confidence indicators
        low_confidence_phrases = [
            "don't have enough information",
            "not in my knowledge base",
            "consult with a tax expert",
            "I cannot answer"
        ]
        
        if any(phrase.lower() in answer.lower() for phrase in low_confidence_phrases):
            return 'low'
        
        # Check if answer contains citations
        if '[' in answer and ']' in answer:
            return 'high'
        
        return 'medium'


# Global LLM service instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
