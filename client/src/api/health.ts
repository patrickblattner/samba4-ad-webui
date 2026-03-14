import { apiGet } from './client'

interface HealthResponse {
  status: string
  timestamp: string
  ldapsConfigured: boolean
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/api/health')
}
