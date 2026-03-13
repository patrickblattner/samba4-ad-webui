import { useQuery } from '@tanstack/react-query'
import { searchObjects } from '@/api/search'

export function useSearch(query: string, type?: string) {
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: () => searchObjects(query, type, 1, 20),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  })
}
