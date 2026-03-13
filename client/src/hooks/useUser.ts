import { useQuery } from '@tanstack/react-query'
import { getUser } from '@/api/users'

export function useUser(dn: string | null) {
  return useQuery({
    queryKey: ['user', dn],
    queryFn: () => getUser(dn!),
    enabled: dn !== null && dn !== '',
  })
}
