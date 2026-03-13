const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
    }

    const errorBody = await response.text()
    let message = `Request failed with status ${response.status}`
    try {
      const parsed = JSON.parse(errorBody)
      if (parsed.error?.message) message = parsed.error.message
      else if (typeof parsed.error === 'string') message = parsed.error
    } catch {
      // use default message
    }
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>('GET', url)
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>('POST', url, body)
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', url, body)
}

export function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  return request<T>('DELETE', url, body)
}
