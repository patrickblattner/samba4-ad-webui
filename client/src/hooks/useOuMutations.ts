import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOu, updateOu, deleteOu, renameOu, moveOu } from '@/api/ous'

export function useCreateOu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; parentDn: string; description?: string }) =>
      createOu(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useUpdateOu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, data }: { dn: string; data: { description?: string } }) =>
      updateOu(dn, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] })
    },
  })
}

export function useDeleteOu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, recursive }: { dn: string; recursive: boolean }) =>
      deleteOu(dn, recursive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useRenameOu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, newName }: { dn: string; newName: string }) =>
      renameOu(dn, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useMoveOu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, targetOu }: { dn: string; targetOu: string }) =>
      moveOu(dn, targetOu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}
