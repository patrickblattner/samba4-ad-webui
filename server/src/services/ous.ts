import { Attribute, Change } from 'ldapts'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { type Credentials } from '../utils/ldapHelpers.js'
import { escapeDnValue, getParentDn } from '../utils/dnUtils.js'

/**
 * Create an Organizational Unit.
 * Returns the DN of the new OU.
 */
export const createOu = async (
  credentials: Credentials,
  name: string,
  parentDn: string,
  description?: string,
): Promise<string> => {
  const dn = `OU=${escapeDnValue(name)},${parentDn}`

  const attributes: Record<string, string | string[]> = {
    objectClass: ['top', 'organizationalUnit'],
  }

  if (description) {
    attributes.description = description
  }

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.add(dn, attributes)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to create OU: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'OU_CREATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return dn
}

/**
 * Update an OU's description.
 */
export const updateOu = async (
  credentials: Credentials,
  dn: string,
  description?: string,
): Promise<void> => {
  const modifications: Change[] = []

  if (description !== undefined) {
    if (description === '' || description === null) {
      modifications.push(new Change({
        operation: 'delete',
        modification: new Attribute({ type: 'description' }),
      }))
    } else {
      modifications.push(new Change({
        operation: 'replace',
        modification: new Attribute({
          type: 'description',
          values: [description],
        }),
      }))
    }
  }

  if (modifications.length === 0) return

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(dn, modifications)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to update OU: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'OU_UPDATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Delete an OU. If recursive is true, delete all children first.
 */
export const deleteOu = async (
  credentials: Credentials,
  dn: string,
  recursive: boolean,
): Promise<void> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    if (recursive) {
      // Find all children via subtree search, sorted deepest first
      const entries = await search(client, dn, {
        scope: 'sub',
        filter: '(objectClass=*)',
        attributes: ['dn'],
      })

      // Sort by DN component count descending (deepest entries first)
      const childDns = entries
        .map((e) => (e as unknown as Record<string, unknown>).dn as string)
        .filter((childDn) => childDn !== dn)
        .sort((a, b) => b.split(',').length - a.split(',').length)

      // Delete children first, then the OU itself
      for (const childDn of childDns) {
        await client.del(childDn)
      }
    }

    await client.del(dn)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to delete OU: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'OU_DELETE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Rename an OU via modifyDN.
 * Returns the new DN.
 */
export const renameOu = async (
  credentials: Credentials,
  dn: string,
  newName: string,
): Promise<string> => {
  const newRdn = `OU=${escapeDnValue(newName)}`
  const parentDn = getParentDn(dn)
  const newDn = `${newRdn},${parentDn}`

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modifyDN(dn, newDn)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to rename OU: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'OU_RENAME_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return newDn
}
