/**
 * DN (Distinguished Name) parsing helpers.
 */

/**
 * Extract the first CN= or OU= value from a DN string.
 * e.g. "CN=Users,DC=lab,DC=dev" -> "Users"
 *      "OU=Marketing,DC=lab,DC=dev" -> "Marketing"
 */
export const extractCn = (dn: string): string => {
  // Match first RDN component (CN=, OU=, DC=, etc.)
  const match = dn.match(/^(?:CN|OU|DC)=([^,]+)/i)
  return match ? match[1] : dn
}

/**
 * Get the parent DN by removing the first RDN component.
 * e.g. "CN=Users,DC=lab,DC=dev" -> "DC=lab,DC=dev"
 *      "DC=lab,DC=dev" -> "DC=dev"
 */
export const getParentDn = (dn: string): string => {
  const commaIndex = dn.indexOf(',')
  if (commaIndex === -1) return dn
  return dn.substring(commaIndex + 1)
}

/**
 * Check if a DN is a domain root (only DC= components).
 * e.g. "DC=lab,DC=dev" -> true
 *      "CN=Users,DC=lab,DC=dev" -> false
 */
export const isDomainDn = (dn: string): boolean => {
  // Split by comma and check that every part starts with DC=
  const parts = dn.split(',').map(p => p.trim())
  return parts.every(p => p.toUpperCase().startsWith('DC='))
}
