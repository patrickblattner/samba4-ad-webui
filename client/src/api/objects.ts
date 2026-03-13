import type { ObjectSummary, PaginatedResponse } from '@samba-ad/shared'
import { apiGet } from './client'

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
