import type { AdComputer, CreateComputerRequest, UpdateComputerRequest } from '@samba-ad/shared'
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

export function getComputer(dn: string): Promise<AdComputer> {
  return apiGet<AdComputer>(`/api/computers?dn=${encodeURIComponent(dn)}`)
}

export function createComputer(data: CreateComputerRequest): Promise<{ dn: string }> {
  return apiPost<{ dn: string }>('/api/computers', data)
}

export function updateComputer(dn: string, data: UpdateComputerRequest): Promise<void> {
  return apiPatch<void>(`/api/computers?dn=${encodeURIComponent(dn)}`, data)
}

export function deleteComputer(dn: string): Promise<void> {
  return apiDelete<void>(`/api/computers?dn=${encodeURIComponent(dn)}`)
}

export function moveComputer(dn: string, targetOu: string): Promise<{ newDn: string }> {
  return apiPost<{ newDn: string }>(`/api/computers/move?dn=${encodeURIComponent(dn)}`, { targetOu })
}
