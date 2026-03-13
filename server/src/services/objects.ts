import type { ObjectSummary, PaginatedResponse } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'
import { objectListFilter } from '../utils/ldapFilters.js'
import { type Credentials, toStringArray, determineObjectType, isAccountEnabled } from '../utils/ldapHelpers.js'

/**
 * List AD objects in a container with pagination.
 */
export const listObjects = async (
  credentials: Credentials,
  baseDn: string,
  type: string = 'all',
  page: number = 1,
  pageSize: number = 50,
): Promise<PaginatedResponse<ObjectSummary>> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)

  try {
    const entries = await search(client, baseDn, {
      scope: 'one',
      filter: objectListFilter(type),
      attributes: ['dn', 'objectClass', 'name', 'sAMAccountName', 'description', 'userAccountControl'],
      sizeLimit: 5000,
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

      // Only set enabled for users and computers
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
