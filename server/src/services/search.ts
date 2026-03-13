import type { ObjectSummary, PaginatedResponse } from '@samba-ad/shared'
import { UAC_FLAGS } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'

interface Credentials {
  dn: string
  password: string
}

/**
 * Normalize an ldapts attribute value to a string array.
 */
const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  if (value instanceof Buffer) return [value.toString()]
  return []
}

/**
 * Determine object type from objectClass array.
 */
const determineObjectType = (objectClass: string[]): ObjectSummary['type'] => {
  const classes = objectClass.map(c => c.toLowerCase())
  if (classes.includes('computer')) return 'computer'
  if (classes.includes('group')) return 'group'
  if (classes.includes('person') && classes.includes('user')) return 'user'
  if (classes.includes('contact')) return 'contact'
  return 'unknown'
}

/**
 * Check if a user account is enabled based on userAccountControl flags.
 */
const isAccountEnabled = (uac: unknown): boolean => {
  const value = typeof uac === 'string' ? parseInt(uac, 10) : (uac as number)
  if (isNaN(value)) return true
  return (value & UAC_FLAGS.ACCOUNTDISABLE) === 0
}

/**
 * Escape special LDAP filter characters in a search term.
 */
const escapeLdapFilter = (str: string): string =>
  str.replace(/[\\*()\\x00]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(2, '0')
    return `\\${hex}`
  })

/**
 * Build the LDAP search filter for a global search.
 * Combines a type filter with a term-matching filter.
 */
const buildSearchFilter = (term: string, type: string): string => {
  const escaped = escapeLdapFilter(term)
  const termFilter = `(|(cn=*${escaped}*)(sAMAccountName=*${escaped}*)(displayName=*${escaped}*)(description=*${escaped}*))`

  let typeFilter: string
  switch (type) {
    case 'user':
      typeFilter = '(&(objectClass=user)(objectCategory=person))'
      break
    case 'group':
      typeFilter = '(objectClass=group)'
      break
    case 'computer':
      typeFilter = '(objectClass=computer)'
      break
    case 'all':
    default:
      typeFilter = '(|(&(objectClass=user)(objectCategory=person))(objectClass=group)(objectClass=computer))'
      break
  }

  return `(&${typeFilter}${termFilter})`
}

/**
 * Search AD objects across the directory subtree.
 */
export const searchObjects = async (
  credentials: Credentials,
  term: string,
  type: string = 'all',
  page: number = 1,
  pageSize: number = 50,
): Promise<PaginatedResponse<ObjectSummary>> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)

  try {
    const filter = buildSearchFilter(term, type)

    const entries = await search(client, config.ldap.baseDn, {
      scope: 'sub',
      filter,
      attributes: ['dn', 'objectClass', 'name', 'sAMAccountName', 'description', 'userAccountControl'],
      sizeLimit: 200,
    })

    const objects: ObjectSummary[] = entries.map(entry => {
      const objectClass = toStringArray(entry['objectClass'])
      const objType = determineObjectType(objectClass)
      const name = (entry['name'] as string) || extractCn(entry.dn)
      const rawDesc = entry['description']
      const description = Array.isArray(rawDesc)
        ? (rawDesc.length > 0 ? String(rawDesc[0]) : undefined)
        : (rawDesc != null ? String(rawDesc) : undefined)

      const summary: ObjectSummary = {
        dn: entry.dn,
        name,
        type: objType,
        sAMAccountName: entry['sAMAccountName'] as string | undefined,
        description,
      }

      if (objType === 'user' || objType === 'computer') {
        summary.enabled = isAccountEnabled(entry['userAccountControl'])
      }

      return summary
    })

    // Sort by name
    objects.sort((a, b) => a.name.localeCompare(b.name))

    // Paginate
    const total = objects.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const data = objects.slice(start, start + pageSize)

    return { data, total, page, pageSize, totalPages }
  } finally {
    await unbind(client)
  }
}
