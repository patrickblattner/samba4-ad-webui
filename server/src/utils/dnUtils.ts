/**
 * DN (Distinguished Name) parsing and escaping helpers.
 * Follows RFC 4514 for DN string representation.
 */

/**
 * Escape a value for use in a DN component per RFC 4514.
 * e.g. "Last, First" -> "Last\, First"
 *      "#admin" -> "\#admin"
 */
export const escapeDnValue = (value: string): string => {
  if (value === '') return value

  // Escape backslash first to avoid double-escaping
  let escaped = value.replace(/\\/g, '\\\\')

  // Escape special characters: , = + " < > ;
  escaped = escaped.replace(/[,=+"<>;]/g, (ch) => `\\${ch}`)

  // Escape leading #
  if (escaped.startsWith('#')) {
    escaped = `\\${escaped}`
  }

  // Escape leading space
  if (escaped.startsWith(' ')) {
    escaped = `\\ ${escaped.substring(1)}`
  }

  // Escape trailing space (only if not already escaped)
  if (escaped.length > 0 && escaped.endsWith(' ') && !escaped.endsWith('\\ ')) {
    escaped = `${escaped.substring(0, escaped.length - 1)}\\ `
  }

  return escaped
}

/**
 * Unescape an RFC 4514 escaped DN value.
 * e.g. "Last\, First" -> "Last, First"
 */
const unescapeDnValue = (value: string): string => {
  return value.replace(/\\(.)/g, '$1')
}

/**
 * Split a DN string into its RDN components, respecting escaped commas.
 * e.g. "CN=Last\, First,DC=lab,DC=dev" -> ["CN=Last\, First", "DC=lab", "DC=dev"]
 */
export const splitDnComponents = (dn: string): string[] => {
  const components: string[] = []
  let current = ''

  for (let i = 0; i < dn.length; i++) {
    if (dn[i] === '\\' && i + 1 < dn.length) {
      // Escaped character — consume both chars
      current += dn[i] + dn[i + 1]
      i++
    } else if (dn[i] === ',') {
      components.push(current)
      current = ''
    } else {
      current += dn[i]
    }
  }

  if (current !== '') {
    components.push(current)
  }

  return components
}

/**
 * Extract the first CN= or OU= value from a DN string.
 * Handles escaped commas correctly.
 * e.g. "CN=Users,DC=lab,DC=dev" -> "Users"
 *      "CN=Last\, First,DC=lab,DC=dev" -> "Last, First"
 */
export const extractCn = (dn: string): string => {
  // Match first RDN component, handling escaped characters
  const match = dn.match(/^(?:CN|OU|DC)=((?:[^,\\]|\\.)*)/i)
  if (!match) return dn
  return unescapeDnValue(match[1])
}

/**
 * Get the parent DN by removing the first RDN component.
 * Handles escaped commas correctly.
 * e.g. "CN=Users,DC=lab,DC=dev" -> "DC=lab,DC=dev"
 *      "CN=Last\, First,DC=lab,DC=dev" -> "DC=lab,DC=dev"
 */
export const getParentDn = (dn: string): string => {
  // Find the first unescaped comma
  for (let i = 0; i < dn.length; i++) {
    if (dn[i] === '\\' && i + 1 < dn.length) {
      i++ // skip escaped character
    } else if (dn[i] === ',') {
      return dn.substring(i + 1)
    }
  }
  return dn
}

/**
 * Check if a DN is a domain root (only DC= components).
 * e.g. "DC=lab,DC=dev" -> true
 *      "CN=Users,DC=lab,DC=dev" -> false
 */
export const isDomainDn = (dn: string): boolean => {
  const parts = splitDnComponents(dn).map(p => p.trim())
  return parts.every(p => p.toUpperCase().startsWith('DC='))
}
