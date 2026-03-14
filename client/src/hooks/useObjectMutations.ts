import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setObjectProtection } from '@/api/objects'

export function useSetObjectProtection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dn, protect }: { dn: string; protect: boolean }) =>
      setObjectProtection(dn, protect),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['objectInfo', variables.dn] })
    },
  })
}
