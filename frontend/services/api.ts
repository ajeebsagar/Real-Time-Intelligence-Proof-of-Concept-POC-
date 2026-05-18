// API Service

import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '@/types'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      timeout: 30000,
      // No default Content-Type: axios sets application/json for JS objects
      // and the proper multipart/form-data;boundary=... for FormData.
      // Setting it here would override FormData detection and break uploads.
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post<ApiResponse>('/api/auth/login', {
      email,
      password,
    })
    if (response.data.data?.token) {
      this.setToken(response.data.data.token)
    }
    return response.data
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post<ApiResponse>('/api/auth/register', {
      email,
      password,
      name,
    })
    if (response.data.data?.token) {
      this.setToken(response.data.data.token)
    }
    return response.data
  }

  logout() {
    this.clearToken()
  }

  // Sessions
  async createSession(title: string, description?: string) {
    const response = await this.client.post<ApiResponse>('/api/sessions', {
      title,
      description,
    })
    return response.data
  }

  async getSessions() {
    const response = await this.client.get<ApiResponse>('/api/sessions')
    return response.data
  }

  async getSession(id: string) {
    const response = await this.client.get<ApiResponse>(`/api/sessions/${id}`)
    return response.data
  }

  async updateSessionStatus(id: string, status: string) {
    const response = await this.client.patch<ApiResponse>(
      `/api/sessions/${id}/status`,
      { status }
    )
    return response.data
  }

  async deleteSession(id: string) {
    const response = await this.client.delete<ApiResponse>(`/api/sessions/${id}`)
    return response.data
  }

  // Documents
  async uploadDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    // Don't set Content-Type — axios needs to add the multipart boundary itself.
    const response = await this.client.post<ApiResponse>(
      '/api/documents',
      formData
    )
    return response.data
  }

  async getDocuments() {
    const response = await this.client.get<ApiResponse>('/api/documents')
    return response.data
  }

  async deleteDocument(id: string) {
    const response = await this.client.delete<ApiResponse>(`/api/documents/${id}`)
    return response.data
  }

  // Realtime
  async sendTextInput(sessionId: string, inputText: string) {
    const response = await this.client.post<ApiResponse>('/api/input/text', {
      sessionId,
      inputText,
    })
    return response.data
  }

  async sendAudioInput(sessionId: string, audioFile: File) {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('sessionId', sessionId)

    // Don't set Content-Type — axios needs to add the multipart boundary itself.
    const response = await this.client.post<ApiResponse>(
      '/api/input/audio',
      formData
    )
    return response.data
  }

  async getInteractionHistory(sessionId: string, limit?: number) {
    const response = await this.client.get<ApiResponse>(
      `/api/input/history/${sessionId}`,
      { params: { limit } }
    )
    return response.data
  }

  // Analytics
  async getSessionAnalytics(sessionId: string) {
    const response = await this.client.get<ApiResponse>(
      `/api/analytics/session/${sessionId}`
    )
    return response.data
  }

  async getUserAnalytics() {
    const response = await this.client.get<ApiResponse>('/api/analytics/user')
    return response.data
  }

  async getGlobalAnalytics() {
    const response = await this.client.get<ApiResponse>('/api/analytics/global')
    return response.data
  }
}

export const apiService = new ApiService()
