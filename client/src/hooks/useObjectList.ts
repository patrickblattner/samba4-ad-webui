import { useQuery } from '@tanstack/react-query'
import { listObjects } from '@/api/objects'

export function useObjectList(
  baseDn: string | null,
  type?: string,
  page?: number,
) {
  return useQuery({
    queryKey: ['objects', baseDn, type, page],
    queryFn: () => listObjects(baseDn!, type, page),
    enabled: baseDn !== null,
  })
}
