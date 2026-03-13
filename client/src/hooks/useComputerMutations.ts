import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateComputerRequest, UpdateComputerRequest } from '@samba-ad/shared'
import {
  createComputer,
  updateComputer,
  deleteComputer,
  moveComputer,
} from '@/api/computers'

export function useCreateComputer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateComputerRequest) => createComputer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useUpdateComputer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, data }: { dn: string; data: UpdateComputerRequest }) =>
      updateComputer(dn, data),
    onSuccess: (_result, { dn }) => {
      qc.invalidateQueries({ queryKey: ['computer', dn] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useDeleteComputer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dn: string) => deleteComputer(dn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useMoveComputer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, targetOu }: { dn: string; targetOu: string }) =>
      moveComputer(dn, targetOu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
      qc.invalidateQueries({ queryKey: ['tree'] })
    },
  })
}
