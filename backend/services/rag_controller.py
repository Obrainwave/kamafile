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
        return "chitchat", "Hey there! 👋 What tax questions can I help you sort out today?"
    
    # Check for thanks (can be anywhere in short messages)
    if len(q_clean.split()) <= 5:  # Only check short messages
        if any(word in q_clean for word in THANKS_WORDS):
            return "chitchat", "Happy to help! Let me know if anything else comes up."
    
    # Check for AI capability questions
    for pattern in AI_PATTERNS:
        if re.match(pattern, q_clean):
            return "direct_answer", (
                "I'm your go-to for Nigerian tax matters! I can help with:\n"
                "• VAT, PAYE, CIT, WHT - rates, rules, and compliance\n"
                "• Filing deadlines and procedures\n"
                "• Understanding tax penalties and how to avoid them\n\n"
                "What would you like to know?"
            )
    
    # No rule matched - fall through to LLM
    return None, None

class RagDecision(BaseModel):
    """Structured decision from the Thinker"""
    intent: Literal["search", "conceptual", "chitchat", "off_topic"]
    search_queries: Optional[List[str]] = None
    direct_response: Optional[str] = None
    thought_process: Optional[str] = None
    response_style: Literal["concise", "detailed"] = "detailed"

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

INTENTS:

1. "search": User wants SPECIFIC legal information (rates, deadlines, requirements, procedures).
   - These need document lookup - no guessing allowed
   - Generate 1-3 search queries
   - Examples:
     - "What is the VAT rate?" -> queries: ["VAT rate Nigeria"]
     - "What do I need to register a business?" -> queries: ["business tax registration Nigeria"]
     - "What are the WHT rates?" -> queries: ["withholding tax rates Nigeria"]

2. "conceptual": User asks PHILOSOPHICAL/GENERAL questions about tax concepts.
   - These can use general knowledge - no documents needed
   - Examples:
     - "What are the benefits of paying tax?" -> explain benefits generally
     - "Why do we pay tax?" -> explain purpose of taxation
     - "What is tax?" -> give general definition
     - "Is tax important?" -> explain importance
   - Provide a helpful, conversational answer about the concept

3. "chitchat": Greetings, thanks, small talk, or questions about YOU.
   - "Hello" -> friendly greeting
   - "How are you?" -> brief friendly response
   - "What can you do?" -> describe tax capabilities
   - "Thanks" -> you're welcome

4. "off_topic": User asks about NON-TAX topics (sports, weather, vacation, etc.)
   - Just politely redirect with personality
   - Example: "Tell me about vacation" -> "Wish I could help plan your getaway, but I'm all about taxes!"

OUTPUT FORMAT (JSON ONLY):
{
    "intent": "search" | "conceptual" | "chitchat" | "off_topic",
    "search_queries": ["query1"],     // Only for "search"
    "direct_response": "string",      // For "conceptual", "chitchat", or "off_topic"
    "thought_process": "Why this intent",
    "response_style": "concise" | "detailed"
}

RULES:
1. NEVER ask the user questions or request clarification
2. "conceptual" = WHY/BENEFITS/PURPOSE of tax (general knowledge OK)
3. "search" = SPECIFIC rates/requirements/procedures (documents only)
4. For off-topic, be friendly and redirect with humor
5. Output MUST be valid JSON
"""

    async def think(
        self, 
        user_query: str, 
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> RagDecision:
        """
        Analyze user query and return a decision.
        
        Flow:
        1. Rule-based check (fast path for greetings, thanks, etc.)
        2. LLM-based analysis (for complex intent classification) WITH conversation context
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
            # Build messages with conversation context
            messages = [
                {"role": "system", "content": self._build_system_prompt()}
            ]
            
            # Add conversation history for context (if available)
            if conversation_history and len(conversation_history) > 0:
                # Format conversation history as context
                context_text = "CONVERSATION HISTORY (use this to understand context like 'it', 'that', etc.):\n"
                for msg in conversation_history[-6:]:  # Last 6 messages max
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    context_text += f"{role}: {msg.get('content', '')[:200]}\n"  # Truncate long messages
                context_text += "\n---\n"
                
                # Add the context and current query
                messages.append({
                    "role": "user", 
                    "content": f"{context_text}CURRENT USER QUERY: {user_query}"
                })
            else:
                messages.append({"role": "user", "content": user_query})

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

            async with httpx.AsyncClient(timeout=15.0) as client:
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
