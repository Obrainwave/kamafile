import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      window.location.href = "/signin"
    }
    return Promise.reject(error)
  }
)

export interface LoginRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  full_name: string
  password: string
  confirm_password: string
  phone_number?: string
  user_type?: string
}

export interface User {
  id: string
  email: string
  full_name: string
  phone_number?: string
  user_type: string
  is_active: boolean
  is_verified: boolean
  role?: string
  last_login?: string
  login_count?: number
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/api/auth/login", data)
    return response.data
  },

  signup: async (data: SignUpRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/api/auth/signup", data)
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>("/api/auth/me")
    return response.data
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
  },
}

export default api
