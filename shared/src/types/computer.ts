export interface AdComputer {
  dn: string
  sAMAccountName: string
  dNSHostName?: string
  description?: string
  operatingSystem?: string
  operatingSystemVersion?: string
  operatingSystemServicePack?: string
  location?: string
  memberOf?: string[]
  primaryGroupID?: number
  managedBy?: string
  userAccountControl: number
}

export interface CreateComputerRequest {
  parentDn: string
  name: string
  sAMAccountName: string
  description?: string
}

export interface UpdateComputerRequest {
  description?: string | null
  location?: string | null
  managedBy?: string | null
}
