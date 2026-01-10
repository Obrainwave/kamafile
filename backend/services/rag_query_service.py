"""
RAG Query Service
Handles query processing, intent classification, retrieval, and answer generation
Strict no-hallucination policy enforced
"""
from typing import Dict, Any, List, Optional
import logging
from services.embedding_service import get_embedding_service
from services.vector_store import get_vector_store
from services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


class IntentClassifier:
    """Classify user queries by tax domain"""
    
    INTENT_KEYWORDS = {
        'vat': ['vat', 'value added tax', 'sales tax', 'input tax', 'output tax'],
        'paye': ['paye', 'pay as you earn', 'salary tax', 'employment tax', 'wage tax'],
        'cit': ['cit', 'company income tax', 'corporate tax', 'business tax'],
        'wht': ['wht', 'withholding tax', 'tax deduction'],
        'penalties': ['penalty', 'penalties', 'fine', 'default', 'late payment'],
        'filing': ['filing', 'file', 'return', 'submit', 'deadline'],
        'registration': ['register', 'registration', 'tin', 'tax identification'],
        'exemptions': ['exempt', 'exemption', 'exempted', 'not taxable'],
        'deductions': ['deduction', 'deduct', 'allowable', 'expense'],
        'general': []  # Default
    }
    
    @classmethod
    def classify(cls, query: str) -> str:
        """Classify query intent"""
        query_lower = query.lower()
        
        for intent, keywords in cls.INTENT_KEYWORDS.items():
            if intent == 'general':
                continue
            if any(keyword in query_lower for keyword in keywords):
                return intent
        
        return 'general'


class RAGQueryService:
    """Main RAG query processing service"""
    
    def __init__(self):
        # Lazy initialization - services will be created on first use
        self._embedding_service = None
        self._vector_store = None
        self._llm_service = None
        self.intent_classifier = IntentClassifier()
    
    @property
    def embedding_service(self):
        """Lazy-load embedding service"""
        if self._embedding_service is None:
            self._embedding_service = get_embedding_service()
        return self._embedding_service
    
    @property
    def vector_store(self):
        """Lazy-load vector store"""
        if self._vector_store is None:
            # Get embedding dimension for vector store initialization
            test_embedding = self.embedding_service.embed_text("test")
            vector_size = len(test_embedding)
            self._vector_store = get_vector_store(vector_size=vector_size)
        return self._vector_store
    
    @property
    def llm_service(self):
        """Lazy-load LLM service"""
        if self._llm_service is None:
            self._llm_service = get_llm_service()
        return self._llm_service
    
    async def process_query(
        self,
        query: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user query through the RAG pipeline
        
        Steps:
        1. Classify intent
        2. Generate query embedding
        3. Retrieve relevant chunks (top 3-5)
        4. Generate answer with strict no-hallucination prompt
        5. Return answer with citations
        """
        try:
            # Step 1: Classify intent
            intent = self.intent_classifier.classify(query)
            logger.info(f"Query intent classified as: {intent}")
            
            # Step 2: Generate query embedding
            query_embedding = self.embedding_service.embed_text(query)
            
            # Step 3: Retrieve relevant chunks
            # Use metadata filtering based on intent if possible
            filter_metadata = None
            if intent != 'general':
                # Could filter by law type if we have that metadata
                # For now, retrieve top chunks
                pass
            
            chunks = self.vector_store.search(
                query_embedding=query_embedding,
                top_k=5,  # Retrieve top 5 chunks
                filter_metadata=filter_metadata,
                min_score=0.3  # Minimum similarity threshold
            )
            
            if not chunks:
                return {
                    'answer': "I don't have enough information in my knowledge base to answer this question. Please consult with a tax expert or refer to the official tax authority documents.",
                    'citations': [],
                    'confidence': 'low',
                    'intent': intent,
                    'retrieved_chunks': 0
                }
            
            # Step 4: Prepare context for LLM
            context_text = self._format_chunks_for_context(chunks)
            
            # Step 5: Generate answer with strict prompt
            answer_result = await self.llm_service.generate_answer(
                query=query,
                context=context_text,
                intent=intent
            )
            
            # Step 6: Extract citations
            citations = self._extract_citations(chunks)
            
            return {
                'answer': answer_result['answer'],
                'citations': citations,
                'confidence': answer_result.get('confidence', 'medium'),
                'intent': intent,
                'retrieved_chunks': len(chunks),
                'chunk_scores': [chunk['score'] for chunk in chunks]
            }
            
        except Exception as e:
            logger.error(f"Error processing RAG query: {e}", exc_info=True)
            return {
                'answer': "I encountered an error while processing your question. Please try again or consult with a tax expert.",
                'citations': [],
                'confidence': 'low',
                'intent': 'error',
                'retrieved_chunks': 0,
                'error': str(e)
            }
    
    def _format_chunks_for_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks as context for LLM"""
        context_parts = []
        
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get('metadata', {})
            law_name = metadata.get('law_name', 'Unknown Law')
            section_number = metadata.get('section_number', '')
            section_title = metadata.get('section_title', '')
            year = metadata.get('year', '')
            
            citation = f"[{i}] {law_name}"
            if year:
                citation += f" ({year})"
            if section_number:
                citation += f", Section {section_number}"
            if section_title:
                citation += f" – {section_title}"
            
            context_parts.append(f"{citation}\n{chunk['text']}\n")
        
        return "\n---\n\n".join(context_parts)
    
    def _extract_citations(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract citation information from chunks"""
        citations = []
        
        for chunk in chunks:
            metadata = chunk.get('metadata', {})
            citation = {
                'law_name': metadata.get('law_name', 'Unknown Law'),
                'section_number': metadata.get('section_number'),
                'section_title': metadata.get('section_title'),
                'year': metadata.get('year'),
                'authority': metadata.get('authority'),
                'score': chunk.get('score', 0.0)
            }
            citations.append(citation)
        
        return citations
