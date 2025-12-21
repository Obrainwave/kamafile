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
}
