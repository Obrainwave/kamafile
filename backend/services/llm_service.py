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
        """Build strict system prompt that enforces no hallucination"""
        base_prompt = """You are a legal information assistant for Nigerian tax law. Your role is to explain legal provisions based ONLY on the provided context.

CRITICAL RULES:
1. Answer ONLY from the provided context. Never use your own knowledge.
2. If the answer is not in the context, say: "I don't have enough information in my knowledge base to answer this question. Please consult with a tax expert or refer to the official tax authority documents."
3. Every answer MUST cite the source:
   - Law name
   - Section number (if available)
   - Year (if available)
4. Use neutral, factual language. No creative interpretations.
5. If the context contains conflicting information, mention this explicitly.
6. Do not make calculations unless the exact formula is provided in the context.
7. Do not provide advice - only explain what the law states.

Tone: Professional, neutral, factual
Format: Clear, structured, with citations"""
        
        # Add intent-specific guidance
        intent_guidance = {
            'vat': "Focus on VAT Act provisions. Explain rates, exemptions, and filing requirements as stated in the law.",
            'paye': "Focus on PAYE provisions. Explain tax rates, thresholds, and deductions as per the law.",
            'cit': "Focus on Company Income Tax Act. Explain rates, deductions, and filing requirements.",
            'wht': "Focus on Withholding Tax provisions. Explain rates and applicability.",
            'penalties': "Focus on penalty provisions. State exact penalties as written in the law.",
            'filing': "Focus on filing requirements, deadlines, and procedures as stated in the law.",
        }
        
        if intent in intent_guidance:
            base_prompt += f"\n\n{intent_guidance[intent]}"
        
        return base_prompt
    
    def _build_user_prompt(self, query: str, context: str) -> str:
        """Build user prompt with context"""
        return f"""Context from legal documents:

{context}

---

Question: {query}

Instructions:
1. Answer the question using ONLY the information from the context above.
2. Cite the source using the format: [Law Name (Year), Section X – Title]
3. If the answer is not in the context, state that you don't have enough information.
4. Be precise and factual."""
    
    async def generate_answer(
        self,
        query: str,
        context: str,
        intent: str = 'general'
    ) -> Dict[str, Any]:
        """
        Generate answer with strict no-hallucination enforcement
        
        Args:
            query: User question
            context: Retrieved document chunks
            intent: Classified intent
            
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
            user_prompt = self._build_user_prompt(query, context)
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0,  # CRITICAL: No creativity, deterministic
                "max_tokens": 1000,
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
