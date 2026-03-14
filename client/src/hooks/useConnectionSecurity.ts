import { useQuery } from '@tanstack/react-query'
import { getHealth } from '@/api/health'

/**
 * Returns whether the backend has LDAPS configured.
 * Cached for the session lifetime (staleTime: Infinity).
 */
export function useConnectionSecurity() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    staleTime: Infinity,
  })

  return {
    ldapsConfigured: data?.ldapsConfigured ?? true, // assume safe until loaded
  }
}
