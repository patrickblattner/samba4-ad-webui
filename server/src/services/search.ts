import type { ObjectSummary, PaginatedResponse } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'
import { escapeLdapFilterValue } from '../utils/ldapEscape.js'
import { type Credentials, toStringArray, determineObjectType, isAccountEnabled } from '../utils/ldapHelpers.js'

/**
 * Build the LDAP search filter for a global search.
 * Combines a type filter with a term-matching filter.
 */
const buildSearchFilter = (term: string, type: string): string => {
  const escaped = escapeLdapFilterValue(term)
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
