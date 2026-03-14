import { useQuery } from '@tanstack/react-query'
import { getObjectInfo, getObjectSecurity } from '@/api/objects'

export function useObjectInfo(dn: string | null) {
  return useQuery({
    queryKey: ['objectInfo', dn],
    queryFn: () => getObjectInfo(dn!),
    enabled: !!dn,
  })
}

export function useObjectSecurity(dn: string | null) {
  return useQuery({
    queryKey: ['objectSecurity', dn],
    queryFn: () => getObjectSecurity(dn!),
    enabled: !!dn,
  })
}
