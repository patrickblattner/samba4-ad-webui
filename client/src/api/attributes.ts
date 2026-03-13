import type { LdapAttribute, AttributeChange } from '@samba-ad/shared'
import { apiGet, apiPatch } from './client'

export function getAttributes(dn: string): Promise<{ attributes: LdapAttribute[] }> {
  return apiGet<{ attributes: LdapAttribute[] }>(`/api/attributes?dn=${encodeURIComponent(dn)}`)
}

export function updateAttributes(dn: string, changes: AttributeChange[]): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(`/api/attributes?dn=${encodeURIComponent(dn)}`, { changes })
}
