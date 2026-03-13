export interface AdGroup {
  dn: string
  sAMAccountName: string
  description?: string
  mail?: string
  groupType: number
  info?: string
  member?: string[]
  memberOf?: string[]
  managedBy?: string
}

export interface CreateGroupRequest {
  parentDn: string
  name: string
  sAMAccountName: string
  groupType: number
  description?: string
}

export interface UpdateGroupRequest {
  sAMAccountName?: string
  description?: string | null
  mail?: string | null
  info?: string | null
  managedBy?: string | null
}
