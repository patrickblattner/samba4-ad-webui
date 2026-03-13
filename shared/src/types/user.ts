export interface AdUser {
  dn: string
  // General
  sAMAccountName: string
  givenName?: string
  sn?: string
  initials?: string
  displayName?: string
  description?: string
  physicalDeliveryOfficeName?: string
  telephoneNumber?: string
  otherTelephone?: string[]
  mail?: string
  wWWHomePage?: string
  url?: string[]
  // Address
  streetAddress?: string
  postOfficeBox?: string
  l?: string
  st?: string
  postalCode?: string
  c?: string
  co?: string
  countryCode?: number
  // Account
  userPrincipalName?: string
  userAccountControl: number
  accountExpires?: string
  pwdLastSet?: string
  // Profile
  profilePath?: string
  scriptPath?: string
  homeDrive?: string
  homeDirectory?: string
  // Telephones
  homePhone?: string
  otherHomePhone?: string[]
  pager?: string
  otherPager?: string[]
  mobile?: string
  otherMobile?: string[]
  facsimileTelephoneNumber?: string
  otherFacsimileTelephoneNumber?: string[]
  ipPhone?: string
  otherIpPhone?: string[]
  info?: string
  // Organization
  title?: string
  department?: string
  company?: string
  manager?: string
  directReports?: string[]
  // Member Of
  memberOf?: string[]
  primaryGroupID?: number
}

export interface CreateUserRequest {
  parentDn: string
  sAMAccountName: string
  givenName?: string
  sn?: string
  displayName?: string
  userPrincipalName: string
  password: string
  enabled?: boolean
}

export interface UpdateUserRequest {
  sAMAccountName?: string
  givenName?: string | null
  sn?: string | null
  initials?: string | null
  displayName?: string | null
  description?: string | null
  physicalDeliveryOfficeName?: string | null
  telephoneNumber?: string | null
  otherTelephone?: string[] | null
  mail?: string | null
  wWWHomePage?: string | null
  url?: string[] | null
  streetAddress?: string | null
  postOfficeBox?: string | null
  l?: string | null
  st?: string | null
  postalCode?: string | null
  c?: string | null
  co?: string | null
  countryCode?: number | null
  userPrincipalName?: string
  userAccountControl?: number
  accountExpires?: string | null
  profilePath?: string | null
  scriptPath?: string | null
  homeDrive?: string | null
  homeDirectory?: string | null
  homePhone?: string | null
  otherHomePhone?: string[] | null
  pager?: string | null
  otherPager?: string[] | null
  mobile?: string | null
  otherMobile?: string[] | null
  facsimileTelephoneNumber?: string | null
  otherFacsimileTelephoneNumber?: string[] | null
  ipPhone?: string | null
  otherIpPhone?: string[] | null
  info?: string | null
  title?: string | null
  department?: string | null
  company?: string | null
  manager?: string | null
}
