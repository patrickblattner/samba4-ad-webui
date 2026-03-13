import { useQuery } from '@tanstack/react-query'
import { getTreeRoot, getTreeChildren } from '@/api/tree'

export function useTreeRoot() {
  return useQuery({
    queryKey: ['tree', 'root'],
    queryFn: getTreeRoot,
  })
}

export function useTreeChildren(dn: string, enabled: boolean) {
  return useQuery({
    queryKey: ['tree', 'children', dn],
    queryFn: () => getTreeChildren(dn),
    enabled,
  })
}
