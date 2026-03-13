import type { TreeNode } from '@samba-ad/shared'
import { apiGet } from './client'

export function getTreeRoot(): Promise<TreeNode[]> {
  return apiGet<TreeNode[]>('/api/tree')
}

export function getTreeChildren(dn: string): Promise<TreeNode[]> {
  return apiGet<TreeNode[]>(`/api/tree/children?dn=${encodeURIComponent(dn)}`)
}
