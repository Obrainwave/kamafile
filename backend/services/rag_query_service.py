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
    
    @property
    def rag_controller(self):
        """Lazy-load RagController"""
        from services.rag_controller import get_rag_controller
        return get_rag_controller()

    @property
    def reranker_service(self):
        """Lazy-load Reranker Service"""
        from services.reranker import get_reranker_service
        return get_reranker_service()
    
    async def process_query(
        self,
        query: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user query through the RAG pipeline
        
        Steps:
        1. "Think" (RagController): Analyze intent and plan
        2. Execute Plan:
           - Search: Hybrid Search (Top 25) -> Rerank (Top 5) -> Generate
           - Clarify: Return clarification question
           - Chitchat: Return direct response
        """
        try:
            # Step 1: The "Thinker" Layer
            decision = await self.rag_controller.think(query)
            logger.info(f"Thinker decision: {decision.intent}")
            
            # Handle Non-Search Intents
            if decision.intent == 'clarify':
                return {
                    'answer': decision.clarification_question,
                    'citations': [],
                    'confidence': 'high',
                    'intent': 'clarify',
                    'retrieved_chunks': 0,
                    'chunk_scores': []
                }
            
            elif decision.intent in ['chitchat', 'direct_answer']:
                return {
                    'answer': decision.direct_response,
                    'citations': [],
                    'confidence': 'high',
                    'intent': decision.intent,
                    'retrieved_chunks': 0,
                    'chunk_scores': []
                }
            
            # Handle Search Intent
            # Use optimized search queries from Thinker
            search_queries = decision.search_queries or [query]
            logger.info(f"Searching with queries: {search_queries}")
            
            # Combine results from all queries (Hybrid Search with RRF Fusion)
            # Retrieve CANDIDATES (Top 25) for Reranking
            CANDIDATE_LIMIT = 25
            
            all_chunks = []
            seen_ids = set()
            
            for q in search_queries:
                query_embedding = self.embedding_service.embed_text(q)
                # Generate sparse embedding for Hybrid Search
                sparse_embedding = self.embedding_service.embed_sparse(q)
                
                chunks = self.vector_store.search(
                    query_embedding=query_embedding,
                    sparse_embedding=sparse_embedding,  # Pass sparse vector
                    top_k=CANDIDATE_LIMIT,
                    min_score=0.1 # Lower threshold for candidates
                )
                for chunk in chunks:
                    if chunk['id'] not in seen_ids:
                        all_chunks.append(chunk)
                        seen_ids.add(chunk['id'])
            
            # Deduplicate and initial sort
            all_chunks.sort(key=lambda x: x['score'], reverse=True)
            candidate_chunks = all_chunks[:CANDIDATE_LIMIT]
            
            if not candidate_chunks:
                # Fallback: try original query
                logger.info("No results from optimized queries, trying original query fallback")
                query_embedding = self.embedding_service.embed_text(query)
                sparse_embedding = self.embedding_service.embed_sparse(query)
                
                candidate_chunks = self.vector_store.search(
                    query_embedding=query_embedding,
                    sparse_embedding=sparse_embedding,
                    top_k=CANDIDATE_LIMIT,
                    min_score=0.1
                )

            if not candidate_chunks:
                return {
                    'answer': "I don't have enough information in my knowledge base to answer this question. Please consult with a tax expert.",
                    'citations': [],
                    'confidence': 'low',
                    'intent': decision.intent,
                    'retrieved_chunks': 0
                }
            
            # Step 3.5: Reranking (Quality Filter)
            # Apply Cross-Encoder to re-score candidates against the ORIGINAL query
            # (Thinker queries are for retrieval, Reranker scores against user intent)
            try:
                top_chunks = self.reranker_service.rank(query, candidate_chunks, top_k=5)
                logger.info(f"Reranked {len(candidate_chunks)} candidates -> Top {len(top_chunks)}")
            except Exception as e:
                logger.error(f"Reranking failed: {e}. Falling back to vector scores.")
                top_chunks = candidate_chunks[:5]
            
            # Step 4: Prepare context for LLM

            if not top_chunks:
                return {
                    'answer': "I don't have enough information in my knowledge base to answer this question. Please consult with a tax expert or refer to the official tax authority documents.",
                    'citations': [],
                    'confidence': 'low',
                    'intent': decision.intent,
                    'retrieved_chunks': 0
                }
            
            # Step 4: Prepare context for LLM
            context_text = self._format_chunks_for_context(top_chunks)
            
            # Step 5: Generate answer with strict prompt
            # We explicitly pass the original user query, not the search queries, to the generator
            # Use response_style from Thinker to control verbosity
            answer_result = await self.llm_service.generate_answer(
                query=query,
                context=context_text,
                intent=decision.intent,
                response_style=decision.response_style  # Pass concise/detailed from Thinker
            )
            
            # Step 6: Extract citations
            citations = self._extract_citations(top_chunks)
            
            return {
                'answer': answer_result['answer'],
                'citations': citations,
                'confidence': answer_result.get('confidence', 'medium'),
                'intent': decision.intent,
                'retrieved_chunks': len(top_chunks),
                'chunk_scores': [chunk['score'] for chunk in top_chunks]
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
        """Format retrieved chunks as context for LLM (Parent-Child Aware)"""
        context_parts = []
        seen_parent_ids = set() # To deduplicate parent sections
        
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get('metadata', {})
            law_name = metadata.get('law_name', 'Unknown Law')
            section_number = metadata.get('section_number', '')
            section_title = metadata.get('section_title', '')
            year = metadata.get('year', '')
            
            # Parent-Child Logic
            # If we have parent context, use it. But only once per parent section.
            # We use (law_name, section_number) acts as unique ID for parent
            parent_id = f"{law_name}_{section_number}"
            
            content_to_use = chunk['text']
            is_parent_context = False
            
            if metadata.get('is_child') and metadata.get('parent_text'):
                if parent_id in seen_parent_ids and parent_id != "Unknown Law_":
                   # We already included this parent's full text.
                   # Should we skip this chunk entirely? 
                   # Yes, because the LLM already has the full section context.
                   # Just adding the specific child text again is redundant and wastes tokens.
                   continue
                else:
                    content_to_use = metadata['parent_text']
                    seen_parent_ids.add(parent_id)
                    is_parent_context = True

            citation = f"[{i}] {law_name}"
            if year:
                citation += f" ({year})"
            if section_number:
                # If it's a child, maybe mention "Excerpt from Section X" but here we provide full section
                citation += f", Section {section_number}"
            if section_title:
                citation += f" – {section_title}"
            
            # Add note if providing full section context
            if is_parent_context:
                citation += " (Full Section Context)"
            
            context_parts.append(f"{citation}\n{content_to_use}\n")
        
        if not context_parts:
            # Fallback if all were duplicates (highly unlikely given top_k)
            # Just return original chunks
             return "\n---\n\n".join([c['text'] for c in chunks])

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
