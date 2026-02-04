import api from './api'

export interface Citation {
  law_name: string
  section_number?: string
  section_title?: string
  year?: number
  authority?: string
  score?: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RAGQueryRequest {
  question: string
  user_context?: {
    user_type?: string
    state?: string
    [key: string]: any
  }
  conversation_history?: ConversationMessage[]
}

export interface RAGQueryResponse {
  answer: string
  citations: Citation[]
  confidence: 'low' | 'medium' | 'high'
  intent: string
  retrieved_chunks: number
  chunk_scores?: number[]
  timestamp: string
}

export const ragAPI = {
  ask: async (
    question: string, 
    userContext?: Record<string, any>,
    conversationHistory?: ConversationMessage[]
  ): Promise<RAGQueryResponse> => {
    const response = await api.post<RAGQueryResponse>('/api/rag/ask', {
      question,
      user_context: userContext,
      conversation_history: conversationHistory,
    })
    return response.data
  },
}
