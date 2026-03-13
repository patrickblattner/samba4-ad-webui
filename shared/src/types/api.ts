export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ObjectSummary {
  dn: string
  name: string
  type: 'user' | 'group' | 'computer' | 'contact' | 'unknown'
  sAMAccountName?: string
  description?: string
  enabled?: boolean
}
