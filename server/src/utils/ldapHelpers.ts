import type { ObjectSummary } from '@samba-ad/shared'

export interface Credentials {
  dn: string
  password: string
}

/** User Account Control flag for disabled accounts */
const UAC_ACCOUNTDISABLE = 0x0002

/**
 * Extract a single string from an LDAP attribute value.
 */
export const str = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined
  if (Array.isArray(v)) return v[0]?.toString()
  return v.toString()
}

/**
 * Extract a string array from an LDAP attribute value.
 */
export const strArr = (v: unknown): string[] | undefined => {
  if (v === undefined || v === null) return undefined
  if (Array.isArray(v)) return v.map(x => x.toString())
  return [v.toString()]
}

/**
 * Extract a number from an LDAP attribute value.
 */
export const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined
  const n = Number(Array.isArray(v) ? v[0] : v)
  return isNaN(n) ? undefined : n
}

/**
 * Convert an LDAP attribute value to a string array.
 */
export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  if (value instanceof Buffer) return [value.toString()]
  return []
}

/**
 * Determine the AD object type from objectClass values.
 */
export const determineObjectType = (objectClass: string[]): ObjectSummary['type'] => {
  const classes = objectClass.map(c => c.toLowerCase())
  if (classes.includes('computer')) return 'computer'
  if (classes.includes('group')) return 'group'
  if (classes.includes('person') && classes.includes('user')) return 'user'
  if (classes.includes('contact')) return 'contact'
  return 'unknown'
}

/**
 * Check if an AD account is enabled based on userAccountControl.
 */
export const isAccountEnabled = (uac: unknown): boolean => {
  const value = typeof uac === 'string' ? parseInt(uac, 10) : (uac as number)
  if (isNaN(value)) return true
  return (value & UAC_ACCOUNTDISABLE) === 0
}

/**
 * Allowlists of attributes that may be modified via update operations.
 * Attributes not on this list are silently dropped.
 */
export const ALLOWED_USER_ATTRS = new Set([
  'givenName', 'sn', 'displayName', 'description', 'mail', 'telephoneNumber',
  'mobile', 'facsimileTelephoneNumber', 'title', 'department', 'company',
  'physicalDeliveryOfficeName', 'streetAddress', 'l', 'st', 'postalCode', 'co',
  'c', 'wWWHomePage', 'userPrincipalName', 'sAMAccountName', 'initials',
  'homePhone', 'pager', 'ipPhone', 'info', 'manager', 'employeeID',
  'employeeNumber', 'userAccountControl', 'accountExpires', 'profilePath',
  'scriptPath', 'homeDirectory', 'homeDrive',
])

export const ALLOWED_GROUP_ATTRS = new Set([
  'description', 'mail', 'info', 'sAMAccountName', 'groupType',
  'managedBy', 'displayName',
])

export const ALLOWED_COMPUTER_ATTRS = new Set([
  'description', 'location', 'managedBy', 'operatingSystem',
  'operatingSystemVersion', 'operatingSystemServicePack',
  'sAMAccountName', 'userAccountControl', 'dNSHostName',
])
