import { useQuery } from '@tanstack/react-query'
import { getComputer } from '@/api/computers'

export function useComputer(dn: string | null) {
  return useQuery({
    queryKey: ['computer', dn],
    queryFn: () => getComputer(dn!),
    enabled: dn !== null && dn !== '',
  })
}
