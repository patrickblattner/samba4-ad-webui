import { useQuery } from '@tanstack/react-query'
import { getObjectInfo } from '@/api/objects'

export function useObjectInfo(dn: string | null) {
  return useQuery({
    queryKey: ['objectInfo', dn],
    queryFn: () => getObjectInfo(dn!),
    enabled: !!dn,
  })
}
