import type { TreeNode } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'
import { treeChildrenFilter } from '../utils/ldapFilters.js'
import { type Credentials, toStringArray } from '../utils/ldapHelpers.js'

/**
 * Determine TreeNode type from objectClass array.
 */
const determineNodeType = (objectClass: string[]): TreeNode['type'] => {
  const classes = objectClass.map(c => c.toLowerCase())
  if (classes.includes('organizationalunit')) return 'ou'
  if (classes.includes('builtindomain')) return 'builtinDomain'
  if (classes.includes('container')) return 'systemContainer'
  return 'systemContainer'
}

/**
 * Get tree children (OUs/containers) for a given base DN.
 * Returns TreeNode[] sorted by name.
 */
export const getTreeChildren = async (
  credentials: Credentials,
  baseDn: string,
): Promise<TreeNode[]> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)

  try {
    const entries = await search(client, baseDn, {
      scope: 'one',
      filter: treeChildrenFilter(),
      attributes: ['dn', 'objectClass', 'name', 'ou'],
    })

    const nodes: TreeNode[] = entries.map(entry => {
      const objectClass = toStringArray(entry['objectClass'])
      const name = (entry['name'] as string) || (entry['ou'] as string) || extractCn(entry.dn)
      const type = determineNodeType(objectClass)

      return {
        dn: entry.dn,
        name,
        type,
        hasChildren: true, // assume true for performance; client will lazy-load
      }
    })

    return nodes.sort((a, b) => a.name.localeCompare(b.name))
  } finally {
    await unbind(client)
  }
}
