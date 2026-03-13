import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateGroupRequest, UpdateGroupRequest } from '@samba-ad/shared'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMembers,
  moveGroup,
} from '@/api/groups'

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupRequest) => createGroup(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, data }: { dn: string; data: UpdateGroupRequest }) =>
      updateGroup(dn, data),
    onSuccess: (_result, { dn }) => {
      qc.invalidateQueries({ queryKey: ['group', dn] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dn: string) => deleteGroup(dn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useAddGroupMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, members }: { dn: string; members: string[] }) =>
      addGroupMembers(dn, members),
    onSuccess: (_result, { dn }) => {
      qc.invalidateQueries({ queryKey: ['group', dn] })
    },
  })
}

export function useRemoveGroupMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, members }: { dn: string; members: string[] }) =>
      removeGroupMembers(dn, members),
    onSuccess: (_result, { dn }) => {
      qc.invalidateQueries({ queryKey: ['group', dn] })
    },
  })
}

export function useMoveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, targetOu }: { dn: string; targetOu: string }) =>
      moveGroup(dn, targetOu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
      qc.invalidateQueries({ queryKey: ['tree'] })
    },
  })
}
