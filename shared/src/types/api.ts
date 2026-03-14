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

export interface ObjectInfo {
  canonicalName: string
  objectClass: string
  whenCreated: string
  whenChanged: string
  uSNCreated: string
  uSNChanged: string
  isProtected: boolean
}

export interface SecurityPrincipal {
  name: string
  sid: string
}

export interface AceEntry {
  type: 'allow' | 'deny'
  principalName: string
  principalSid: string
  accessMask: number
  rights: string[]
  objectType: string | null
  inheritedObjectType: string | null
  isInherited: boolean
  inheritedFrom: string
  appliesTo: string
  aceFlags: number
}

export interface SecurityDescriptorInfo {
  owner: SecurityPrincipal
  dacl: AceEntry[]
  isInheritanceEnabled: boolean
}
