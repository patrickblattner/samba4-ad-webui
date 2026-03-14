import type { ObjectSummary, ObjectInfo, PaginatedResponse, SecurityDescriptorInfo } from '@samba-ad/shared'
import { apiGet, apiPost } from './client'

export function listObjects(
  base: string,
  type?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResponse<ObjectSummary>> {
  const params = new URLSearchParams({ base })
  if (type) params.set('type', type)
  if (page !== undefined) params.set('page', String(page))
  if (pageSize !== undefined) params.set('pageSize', String(pageSize))
  return apiGet<PaginatedResponse<ObjectSummary>>(`/api/objects?${params.toString()}`)
}

export function getObjectInfo(dn: string): Promise<ObjectInfo> {
  return apiGet<ObjectInfo>(`/api/objects/info?dn=${encodeURIComponent(dn)}`)
}

export function setObjectProtection(dn: string, protect: boolean): Promise<void> {
  return apiPost(`/api/objects/protection?dn=${encodeURIComponent(dn)}`, { protected: protect })
}

export function getObjectSecurity(dn: string): Promise<SecurityDescriptorInfo> {
  return apiGet<SecurityDescriptorInfo>(`/api/objects/security?dn=${encodeURIComponent(dn)}`)
}
