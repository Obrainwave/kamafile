"""
RAG Controller ("The Thinker")
Orchestrates the RAG pipeline by analyzing user intent before searching.
"""
import os
import json
import logging
import re
from typing import Dict, Any, List, Optional, Literal, Tuple
import httpx
from pydantic import BaseModel

# Import configuration from LLM service to ensure consistency
from services.llm_service import (
    DEEPSEEK_API_KEY, DEEPSEEK_API_URL,
    OPENAI_API_KEY, OPENAI_API_URL,
    USE_DEEPSEEK, LLM_MODEL
)

logger = logging.getLogger(__name__)

# ============================================================================
# RULE-BASED INTENT DETECTION (Fast path - no LLM needed)
# ============================================================================

# Greeting patterns - exact matches (lowercase, stripped)
GREETINGS = {
    "hi", "hello", "hey", "howdy", "greetings",
    "good morning", "good afternoon", "good evening", "good day",
    "hi there", "hello there", "hey there",
    "morning", "afternoon", "evening",
}

# Thanks patterns - words that indicate gratitude
THANKS_WORDS = {"thanks", "thank you", "thx", "thank", "appreciated", "cheers"}

# AI capability questions - patterns that ask about the bot itself
AI_PATTERNS = [
    r"^what can you do\??$",
    r"^who are you\??$",
    r"^what are you\??$",
    r"^help$",
    r"^what do you do\??$",
]


def rule_based_intent(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Deterministic rule-based intent detection.
    Returns (intent, direct_response) if matched, (None, None) otherwise.
    
    This is a FAST PATH that bypasses LLM for trivial intents like greetings.
    """
    q = query.lower().strip()
    
    # Remove punctuation for matching
    q_clean = re.sub(r'[^\w\s]', '', q).strip()
    
    # Check for exact greeting matches
    if q_clean in GREETINGS:
        return "chitchat", "👋 Hello! I'm your Nigerian Tax Assistant. How can I help you with tax-related questions today?"
    
    # Check for thanks (can be anywhere in short messages)
    if len(q_clean.split()) <= 5:  # Only check short messages
        if any(word in q_clean for word in THANKS_WORDS):
            return "chitchat", "You're welcome! Feel free to ask if you have any more questions about Nigerian taxes."
    
    # Check for AI capability questions
    for pattern in AI_PATTERNS:
        if re.match(pattern, q_clean):
            return "direct_answer", (
                "I'm an AI assistant specialized in Nigerian Tax Law. I can help you with:\n"
                "• Understanding VAT, PAYE, CIT, and other Nigerian taxes\n"
                "• Tax registration and compliance requirements\n"
                "• Penalties and filing deadlines\n"
                "• Interpreting tax laws and regulations\n\n"
                "Just ask me any tax-related question!"
            )
    
    # No rule matched - fall through to LLM
    return None, None

class RagDecision(BaseModel):
    """Structured decision from the Thinker"""
    intent: Literal["search", "clarify", "chitchat", "direct_answer"]
    search_queries: Optional[List[str]] = None
    clarification_question: Optional[str] = None
    direct_response: Optional[str] = None
    thought_process: Optional[str] = None
    response_style: Literal["concise", "detailed"] = "detailed"  # NEW: Response verbosity

class RagController:
    """
    The 'Thinker' layer that sits between the user and the RAG pipeline.
    It decides whether to search, ask for clarification, or just chat.
    """
    
    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY if USE_DEEPSEEK else OPENAI_API_KEY
        self.api_url = DEEPSEEK_API_URL if USE_DEEPSEEK else OPENAI_API_URL
        self.model = LLM_MODEL
        
        if not self.api_key:
            logger.warning("No LLM API key configured for RagController.")

    def _build_system_prompt(self) -> str:
        return """You are the "Thinker" layer for a Nigerian Tax Law AI Assistant.
Your job is to analyze the user's input and decide the best course of action.
DO NOT answer legal questions directly. Your job is ONLY to plan the retrieval strategy.

Input: User query string.
Output: A JSON object defining the strategy.

INTENTS:
1. "search": The user is asking a clear legal/tax question.
   - Action: Generate 1-3 optimized search queries.
   - Example user: "What is vat rate?" -> queries: ["VAT rate Nigeria", "Value Added Tax rate"]
   
2. "clarify": The user's query is ambiguous, vauge, or uses terms that could mean multiple things in tax law.
   - Action: Ask a clarifying question to narrow down the context.
   - Example user: "Tell me about the tax." -> question: "Are you interested in Company Income Tax, Personal Income Tax, or Value Added Tax?"

3. "chitchat": The user is greeting, thanking, or making small talk.
   - Action: Provide a polite, professional direct response.
   - Example user: "Hello" -> response: "Hello! I am your Nigerian Tax Assistant. How can I help you today?"

4. "direct_answer": The user asks a question about YOU (the AI), or a question that shouldn't involve document retrieval (e.g. "What can you do?").
   - Action: Provide a direct response describing your capabilities.

RESPONSE STYLE (for search intent):
- "concise": Simple questions like definitions, meanings, acronyms, single facts. Example: "What does TIN mean?", "What is VAT?", "Define withholding tax"
- "detailed": Complex questions requiring analysis, comparison, procedures, calculations. Example: "How do I calculate VAT?", "What are the penalties for late filing?", "Compare PAYE and CIT"

OUTPUT FORMAT (JSON ONLY):
{
    "intent": "search" | "clarify" | "chitchat" | "direct_answer",
    "search_queries": ["query1", "query2"],  // Only if intent is "search"
    "clarification_question": "string",       // Only if intent is "clarify"
    "direct_response": "string",              // Only if intent is "chitchat" or "direct_answer"
    "thought_process": "Brief explanation of why you chose this intent",
    "response_style": "concise" | "detailed"  // For search intent: how verbose the answer should be
}

CRITICAL:
- If use asks for "Sections", ensure "Section X" is preserved in search queries.
- If user mentions specific Acts (CITA, PITA), include them in queries.
- Output MUST be valid JSON.
"""

    async def think(self, user_query: str) -> RagDecision:
        """
        Analyze user query and return a decision.
        
        Flow:
        1. Rule-based check (fast path for greetings, thanks, etc.)
        2. LLM-based analysis (for complex intent classification)
        """
        # =====================================================================
        # STEP 0: Rule-based fast path (no LLM needed)
        # =====================================================================
        intent, response = rule_based_intent(user_query)
        if intent:
            logger.info(f"Rule-based intent detected: {intent}")
            return RagDecision(
                intent=intent,
                direct_response=response,
                thought_process="Rule-based detection (fast path)",
                response_style="concise"  # Non-search intents default to concise
            )
        
        # =====================================================================
        # STEP 1: LLM-based reasoning (for tax/legal questions)
        # =====================================================================
        if not self.api_key:
            # Fallback if no API key
            return RagDecision(
                intent="search",
                search_queries=[user_query],
                thought_process="No API key, falling back to direct search."
            )

        try:
            messages = [
                {"role": "system", "content": self._build_system_prompt()},
                {"role": "user", "content": user_query}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0,
                "response_format": {"type": "json_object"}
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
            content = result['choices'][0]['message']['content']
            
            # Parse JSON
            try:
                data = json.loads(content)
                # Ensure response_style has a valid default if not provided or invalid
                if 'response_style' not in data or data.get('response_style') not in ['concise', 'detailed']:
                    data['response_style'] = 'detailed'
                return RagDecision(**data)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse Thinker JSON: {content}")
                # Fallback to simple search
                return RagDecision(
                    intent="search",
                    search_queries=[user_query],
                    thought_process="Failed to parse JSON response."
                )
            except Exception as parse_error:
                logger.error(f"Pydantic validation error: {parse_error}")
                # Fallback to simple search
                return RagDecision(
                    intent="search",
                    search_queries=[user_query],
                    thought_process=f"Validation error: {str(parse_error)}"
                )

        except Exception as e:
            logger.error(f"Error in Thinker layer: {e}", exc_info=True)
            # Fallback
            return RagDecision(
                intent="search",
                search_queries=[user_query],
                thought_process=f"Error: {str(e)}"
            )

# Global instance
_rag_controller: Optional[RagController] = None

def get_rag_controller() -> RagController:
    global _rag_controller
    if _rag_controller is None:
        _rag_controller = RagController()
    return _rag_controller
