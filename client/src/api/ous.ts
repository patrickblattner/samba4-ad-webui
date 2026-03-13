import { apiPost, apiPatch, apiDelete } from './client'

export function createOu(data: { name: string; parentDn: string; description?: string }): Promise<{ dn: string }> {
  return apiPost<{ dn: string }>('/api/ous', data)
}

export function updateOu(dn: string, data: { description?: string }): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(`/api/ous?dn=${encodeURIComponent(dn)}`, data)
}

export function deleteOu(dn: string, recursive: boolean): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/ous?dn=${encodeURIComponent(dn)}&recursive=${recursive}`)
}

export function renameOu(dn: string, newName: string): Promise<{ newDn: string }> {
  return apiPost<{ newDn: string }>(`/api/ous/rename?dn=${encodeURIComponent(dn)}`, { newName })
}
