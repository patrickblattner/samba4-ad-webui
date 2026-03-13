import type { ObjectSummary, PaginatedResponse } from '@samba-ad/shared'
import { apiGet } from './client'

export function searchObjects(
  q: string,
  type?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResponse<ObjectSummary>> {
  const params = new URLSearchParams({ q })
  if (type) params.set('type', type)
  if (page !== undefined) params.set('page', String(page))
  if (pageSize !== undefined) params.set('pageSize', String(pageSize))
  return apiGet<PaginatedResponse<ObjectSummary>>(`/api/search?${params.toString()}`)
}
