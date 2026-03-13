import { useQuery } from '@tanstack/react-query'
import { getGroup } from '@/api/groups'

export function useGroup(dn: string | null) {
  return useQuery({
    queryKey: ['group', dn],
    queryFn: () => getGroup(dn!),
    enabled: dn !== null && dn !== '',
  })
}
