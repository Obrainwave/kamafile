import api from './api'

export interface QuickReply {
  title: string
  payload: string
}

export interface OnboardingStartRequest {
  channel: 'web' | 'whatsapp'
  user_identifier: string
  user_id?: string
}

export interface OnboardingStepRequest {
  session_id: string
  step?: string  // Optional for active status questions
  response: string
  data?: Record<string, any>
}

export interface OnboardingStepResponse {
  session_id: string
  step: string | null
  message: string
  quick_replies: QuickReply[] | null
  completed: boolean
  status: string
}

export interface OnboardingStatusResponse {
  session_id: string
  status: string
  current_step: string | null
  channel: string
  user_identifier: string
  step_data: Record<string, any>
}

export const onboardingAPI = {
  // Start or resume onboarding session
  startOnboarding: async (data: OnboardingStartRequest): Promise<OnboardingStepResponse> => {
    const response = await api.post<OnboardingStepResponse>('/api/onboarding/start', data)
    return response.data
  },

  // Process onboarding step response
  processStep: async (data: OnboardingStepRequest): Promise<OnboardingStepResponse> => {
    const response = await api.post<OnboardingStepResponse>('/api/onboarding/step', data)
    return response.data
  },

  // Get onboarding status
  getStatus: async (sessionId: string): Promise<OnboardingStatusResponse> => {
    const response = await api.get<OnboardingStatusResponse>(`/api/onboarding/status/${sessionId}`)
    return response.data
  },
}
