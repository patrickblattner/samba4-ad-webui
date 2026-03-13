import { apiGet, apiPost } from './client'

export interface User {
  dn: string
  displayName: string
  sAMAccountName: string
}

export interface LoginResponse {
  token: string
  user: User
}

export function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth/login', { username, password })
}

export function refreshToken(token: string): Promise<{ token: string }> {
  return apiPost<{ token: string }>('/api/auth/refresh', { token })
}

export function getMe(): Promise<User> {
  return apiGet<User>('/api/auth/me')
}
