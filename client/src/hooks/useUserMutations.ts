import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateUserRequest, UpdateUserRequest } from '@samba-ad/shared'
import {
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  enableUser,
  disableUser,
  moveUser,
} from '@/api/users'

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, data }: { dn: string; data: UpdateUserRequest }) =>
      updateUser(dn, data),
    onSuccess: (_result, { dn }) => {
      qc.invalidateQueries({ queryKey: ['user', dn] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dn: string) => deleteUser(dn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ dn, newPassword }: { dn: string; newPassword: string }) =>
      resetPassword(dn, newPassword),
  })
}

export function useEnableUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dn: string) => enableUser(dn),
    onSuccess: (_result, dn) => {
      qc.invalidateQueries({ queryKey: ['user', dn] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useDisableUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dn: string) => disableUser(dn),
    onSuccess: (_result, dn) => {
      qc.invalidateQueries({ queryKey: ['user', dn] })
      qc.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useMoveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, targetOu }: { dn: string; targetOu: string }) =>
      moveUser(dn, targetOu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects'] })
      qc.invalidateQueries({ queryKey: ['tree'] })
    },
  })
}
