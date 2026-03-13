import type { AdUser, CreateUserRequest, UpdateUserRequest } from '@samba-ad/shared'
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

export function getUser(dn: string): Promise<AdUser> {
  return apiGet<AdUser>(`/api/users?dn=${encodeURIComponent(dn)}`)
}

export function createUser(data: CreateUserRequest): Promise<{ dn: string }> {
  return apiPost<{ dn: string }>('/api/users', data)
}

export function updateUser(dn: string, data: UpdateUserRequest): Promise<void> {
  return apiPatch<void>(`/api/users?dn=${encodeURIComponent(dn)}`, data)
}

export function deleteUser(dn: string): Promise<void> {
  return apiDelete<void>(`/api/users?dn=${encodeURIComponent(dn)}`)
}

export function resetPassword(dn: string, newPassword: string): Promise<void> {
  return apiPost<void>(`/api/users/password?dn=${encodeURIComponent(dn)}`, { newPassword })
}

export function enableUser(dn: string): Promise<void> {
  return apiPost<void>(`/api/users/enable?dn=${encodeURIComponent(dn)}`)
}

export function disableUser(dn: string): Promise<void> {
  return apiPost<void>(`/api/users/disable?dn=${encodeURIComponent(dn)}`)
}

export function moveUser(dn: string, targetOu: string): Promise<{ newDn: string }> {
  return apiPost<{ newDn: string }>(`/api/users/move?dn=${encodeURIComponent(dn)}`, { targetOu })
}
