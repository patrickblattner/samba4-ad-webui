import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { createElement } from 'react'
import { getToken, setToken, clearToken } from '@/api/client'
import {
  login as apiLogin,
  refreshToken,
  getMe,
  type User,
} from '@/api/auth'

/** Seconds before expiry to trigger a refresh */
const REFRESH_MARGIN = 120

/** Decode JWT payload to get expiry timestamp (seconds since epoch) */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ?? null
  } catch {
    return null
  }
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const logout = useCallback(() => {
    clearRefreshTimer()
    clearToken()
    setUser(null)
  }, [clearRefreshTimer])

  const scheduleRefresh = useCallback(
    (token: string) => {
      clearRefreshTimer()

      const exp = getTokenExpiry(token)
      if (!exp) return

      const now = Math.floor(Date.now() / 1000)
      const delay = Math.max((exp - now - REFRESH_MARGIN) * 1000, 0)

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const currentToken = getToken()
          if (!currentToken) return

          const response = await refreshToken(currentToken)
          setToken(response.token)
          scheduleRefresh(response.token)
        } catch {
          // Refresh failed — session expired or account invalid
          logout()
        }
      }, delay)
    },
    [clearRefreshTimer, logout],
  )

  // On mount, check if we have a valid token
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    getMe()
      .then((u) => {
        setUser(u)
        scheduleRefresh(token)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      clearRefreshTimer()
    }
  }, [scheduleRefresh, clearRefreshTimer])

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await apiLogin(username, password)
      setToken(response.token)
      setUser(response.user)
      scheduleRefresh(response.token)
    },
    [scheduleRefresh],
  )

  const value: AuthState = {
    isAuthenticated: user !== null,
    isLoading,
    user,
    login,
    logout,
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
