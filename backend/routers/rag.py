"""
RAG API Endpoints
Provides /ask endpoint for tax queries with strict no-hallucination enforcement
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import User
from services.rag_query_service import RAGQueryService
from auth import get_optional_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag", tags=["rag"])


class RAGQueryRequest(BaseModel):
    """Request model for RAG queries"""
    question: str = Field(..., min_length=1, max_length=1000, description="User's tax question")
    user_context: Optional[Dict[str, Any]] = Field(None, description="Optional user context (user_type, state, etc.)")


class Citation(BaseModel):
    """Citation model"""
    law_name: str
    section_number: Optional[str] = None
    section_title: Optional[str] = None
    year: Optional[int] = None
    authority: Optional[str] = None
    score: float = 0.0


class RAGQueryResponse(BaseModel):
    """Response model for RAG queries"""
    answer: str
    citations: List[Citation]
    confidence: str  # low, medium, high
    intent: str
    retrieved_chunks: int
    chunk_scores: List[float] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Global RAG query service
_rag_query_service: Optional[RAGQueryService] = None


def get_rag_query_service() -> RAGQueryService:
    """Get or create RAG query service"""
    global _rag_query_service
    if _rag_query_service is None:
        _rag_query_service = RAGQueryService()
    return _rag_query_service


@router.post("/ask", response_model=RAGQueryResponse)
async def ask_question(
    request: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Ask a tax question using RAG
    
    This endpoint:
    1. Processes the question through intent classification
    2. Retrieves relevant legal document chunks
    3. Generates answer with strict no-hallucination enforcement
    4. Returns answer with citations
    
    All queries are logged for audit purposes.
    """
    try:
        # Log the query
        user_id = current_user.id if current_user else None
        logger.info(f"RAG Query from user {user_id}: {request.question}")
        
        # Get RAG service
        rag_service = get_rag_query_service()
        
        # Process query
        result = await rag_service.process_query(
            query=request.question,
            user_context=request.user_context
        )
        
        # Log the result
        logger.info(
            f"RAG Query result - Intent: {result['intent']}, "
            f"Confidence: {result['confidence']}, "
            f"Chunks: {result['retrieved_chunks']}"
        )
        
        # Convert citations
        citations = [
            Citation(**citation) for citation in result.get('citations', [])
        ]
        
        return RAGQueryResponse(
            answer=result['answer'],
            citations=citations,
            confidence=result['confidence'],
            intent=result['intent'],
            retrieved_chunks=result['retrieved_chunks'],
            chunk_scores=result.get('chunk_scores', [])
        )
        
    except Exception as e:
        logger.error(f"Error processing RAG query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing query: {str(e)}"
        )
