/**
 * Escape special characters in an LDAP filter value (RFC 4515).
 *
 * Characters that must be escaped: \ * ( ) \0 (NUL)
 * Each is replaced with a backslash followed by its two-digit hex code.
 */
export const escapeLdapFilterValue = (str: string): string =>
  str.replace(/[\\*()\x00]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(2, '0')
    return `\\${hex}`
  })

/**
 * Validate that a string looks like a valid Distinguished Name.
 * Accepts standard RDN components (CN=, OU=, DC=, etc.) separated by commas.
 * Rejects empty strings, strings with control characters, and obvious injection attempts.
 */
const DN_PATTERN = /^(?:[A-Za-z]+=.+?)(?:,\s*[A-Za-z]+=.+?)*$/

export function isValidDn(dn: string): boolean {
  if (!dn || typeof dn !== 'string') return false
  if (dn.length > 2048) return false
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(dn)) return false
  return DN_PATTERN.test(dn)
}
