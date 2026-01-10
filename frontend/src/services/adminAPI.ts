import api from './api'
import { User } from './api'

export interface UserStats {
  total: number
  active: number
  verified: number
  by_type: Record<string, number>
  by_role: Record<string, number>
}

export interface DashboardStats {
  total_users: number
  active_users: number
  new_users_today: number
  new_users_this_week: number
  users_by_type: Record<string, number>
  users_by_role: Record<string, number>
}

export interface UserListParams {
  skip?: number
  limit?: number
  search?: string
  role?: string
  user_type?: string
  is_active?: boolean
  is_verified?: boolean
}

export interface UserUpdate {
  full_name?: string
  phone_number?: string
  user_type?: string
  is_active?: boolean
  is_verified?: boolean
  role?: string
}

export interface Banner {
  id: string
  title: string
  description?: string
  image_url?: string
  order: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface BannerCreate {
  title: string
  description?: string
  image_url?: string
  order?: number
  is_active?: boolean
}

export interface BannerUpdate {
  title?: string
  description?: string
  image_url?: string
  order?: number
  is_active?: boolean
}

export interface RAGDocument {
  id: string
  title: string
  source_type: string
  source_path?: string
  file_name?: string
  file_type?: string
  file_size?: number
  content_text?: string
  content_metadata?: Record<string, any>
  processing_status: string
  processing_error?: string
  uploaded_by?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  processed_at?: string
}

export interface RAGDocumentCreate {
  title: string
  source_type: string
  url?: string
}

export interface RAGDocumentUpdate {
  title?: string
  is_active?: boolean
}

export interface VectorStoreInfo {
  qdrant_host: string
  qdrant_port: number
  web_ui_url: string
  collection_info: {
    name?: string
    vectors_count?: number
    points_count?: number
    indexed_vectors_count?: number
    status?: string
    error?: string
    config?: {
      vector_size?: number
      distance?: string
    }
  }
}

export const adminAPI = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/api/admin/dashboard/stats')
    return response.data
  },

  // Users
  getUsers: async (params?: UserListParams): Promise<User[]> => {
    const response = await api.get('/api/admin/users', { params })
    return response.data
  },

  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get('/api/admin/users/stats')
    return response.data
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/api/admin/users/${userId}`)
    return response.data
  },

  updateUser: async (userId: string, data: UserUpdate): Promise<User> => {
    const response = await api.patch(`/api/admin/users/${userId}`, data)
    return response.data
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/api/admin/users/${userId}`)
  },

  // Banners
  getBanners: async (activeOnly?: boolean): Promise<Banner[]> => {
    const response = await api.get('/api/admin/banners', { params: { active_only: activeOnly } })
    return response.data
  },

  getPublicBanners: async (): Promise<Banner[]> => {
    const response = await api.get('/api/admin/banners/public')
    return response.data
  },

  getBanner: async (bannerId: string): Promise<Banner> => {
    const response = await api.get(`/api/admin/banners/${bannerId}`)
    return response.data
  },

  createBanner: async (data: BannerCreate): Promise<Banner> => {
    const response = await api.post('/api/admin/banners', data)
    return response.data
  },

  updateBanner: async (bannerId: string, data: BannerUpdate): Promise<Banner> => {
    const response = await api.patch(`/api/admin/banners/${bannerId}`, data)
    return response.data
  },

  deleteBanner: async (bannerId: string): Promise<void> => {
    await api.delete(`/api/admin/banners/${bannerId}`)
  },

  // RAG Documents
  getRAGDocuments: async (params?: { skip?: number; limit?: number; source_type?: string; is_active?: boolean }): Promise<RAGDocument[]> => {
    const response = await api.get('/api/admin/rag', { params })
    return response.data
  },

  getRAGDocument: async (documentId: string): Promise<RAGDocument> => {
    const response = await api.get(`/api/admin/rag/${documentId}`)
    return response.data
  },

  uploadRAGFile: async (file: File, title: string): Promise<RAGDocument> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    // Don't set Content-Type header - axios will set it automatically with boundary
    const response = await api.post('/api/admin/rag/upload', formData)
    return response.data
  },

  addRAGUrl: async (data: { title: string; url: string }): Promise<RAGDocument> => {
    const response = await api.post('/api/admin/rag/url', {
      title: data.title,
      source_type: 'url',
      url: data.url,
    })
    return response.data
  },

  updateRAGDocument: async (documentId: string, data: RAGDocumentUpdate): Promise<RAGDocument> => {
    const response = await api.patch(`/api/admin/rag/${documentId}`, data)
    return response.data
  },

  deleteRAGDocument: async (documentId: string): Promise<void> => {
    await api.delete(`/api/admin/rag/${documentId}`)
  },

  reprocessRAGDocument: async (documentId: string): Promise<RAGDocument> => {
    const response = await api.post(`/api/admin/rag/${documentId}/reprocess`)
    return response.data
  },

  getVectorStoreInfo: async (): Promise<VectorStoreInfo> => {
    const response = await api.get('/api/admin/rag/vector-store/info')
    return response.data
  },

  bulkReprocessRAGDocuments: async (filterStatus?: string, filterSourceType?: string): Promise<{
    message: string
    total: number
    queued: number
    errors: string[]
    filter_status?: string
    filter_source_type?: string
  }> => {
    const params: Record<string, string> = {}
    if (filterStatus) params.filter_status = filterStatus
    if (filterSourceType) params.filter_source_type = filterSourceType
    const response = await api.post('/api/admin/rag/bulk-reprocess', null, { params })
    return response.data
  },
}
