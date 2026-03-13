import type { AdGroup, CreateGroupRequest, UpdateGroupRequest } from '@samba-ad/shared'
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

export function getGroup(dn: string): Promise<AdGroup> {
  return apiGet<AdGroup>(`/api/groups?dn=${encodeURIComponent(dn)}`)
}

export function createGroup(data: CreateGroupRequest): Promise<{ dn: string }> {
  return apiPost<{ dn: string }>('/api/groups', data)
}

export function updateGroup(dn: string, data: UpdateGroupRequest): Promise<void> {
  return apiPatch<void>(`/api/groups?dn=${encodeURIComponent(dn)}`, data)
}

export function deleteGroup(dn: string): Promise<void> {
  return apiDelete<void>(`/api/groups?dn=${encodeURIComponent(dn)}`)
}

export function addGroupMembers(dn: string, members: string[]): Promise<void> {
  return apiPost<void>(`/api/groups/members?dn=${encodeURIComponent(dn)}`, { members })
}

export function removeGroupMembers(dn: string, members: string[]): Promise<void> {
  return apiDelete<void>(`/api/groups/members?dn=${encodeURIComponent(dn)}`, { members })
}

export function moveGroup(dn: string, targetOu: string): Promise<{ newDn: string }> {
  return apiPost<{ newDn: string }>(`/api/groups/move?dn=${encodeURIComponent(dn)}`, { targetOu })
}
