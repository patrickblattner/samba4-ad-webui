import { Attribute, Change } from 'ldapts'
import type { AdGroup, CreateGroupRequest, UpdateGroupRequest } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'
import { type Credentials, str, strArr, num } from '../utils/ldapHelpers.js'

/**
 * Map an LDAP entry to an AdGroup object.
 */
const entryToAdGroup = (entry: Record<string, unknown>): AdGroup => {
  return {
    dn: str(entry.dn) || '',
    sAMAccountName: str(entry.sAMAccountName) || '',
    description: str(entry.description),
    mail: str(entry.mail),
    groupType: num(entry.groupType) || 0,
    info: str(entry.info),
    member: strArr(entry.member),
    memberOf: strArr(entry.memberOf),
    managedBy: str(entry.managedBy),
  }
}

/** All group attributes to fetch */
const GROUP_ATTRIBUTES = [
  'dn', 'sAMAccountName', 'description', 'mail', 'groupType',
  'info', 'member', 'memberOf', 'managedBy',
]

/**
 * Fetch a single group by DN.
 */
export const getGroup = async (credentials: Credentials, dn: string): Promise<AdGroup> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=group)',
      attributes: GROUP_ATTRIBUTES,
    })
    if (entries.length === 0) {
      const err = new Error(`Group not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'GROUP_NOT_FOUND'
      throw err
    }
    return entryToAdGroup(entries[0] as unknown as Record<string, unknown>)
  } finally {
    await unbind(client)
  }
}

/**
 * Create a new group in AD.
 */
export const createGroup = async (credentials: Credentials, request: CreateGroupRequest): Promise<string> => {
  const dn = `CN=${request.name},${request.parentDn}`

  const attributes: Record<string, string | string[]> = {
    objectClass: ['top', 'group'],
    sAMAccountName: request.sAMAccountName,
    groupType: String(request.groupType),
  }

  if (request.description) attributes.description = request.description

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.add(dn, attributes)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to create group: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'GROUP_CREATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return dn
}

/**
 * Update group attributes.
 * null values mean "delete this attribute", undefined means "don't touch".
 */
export const updateGroup = async (
  credentials: Credentials,
  dn: string,
  changes: UpdateGroupRequest,
): Promise<void> => {
  const modifications: Change[] = []

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue

    if (value === null) {
      modifications.push(new Change({
        operation: 'delete',
        modification: new Attribute({ type: key }),
      }))
    } else if (Array.isArray(value)) {
      modifications.push(new Change({
        operation: 'replace',
        modification: new Attribute({
          type: key,
          values: value.map(String),
        }),
      }))
    } else {
      modifications.push(new Change({
        operation: 'replace',
        modification: new Attribute({
          type: key,
          values: [String(value)],
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
    const wrappedErr = new Error(`Failed to update group: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'GROUP_UPDATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Delete a group by DN.
 */
export const deleteGroup = async (credentials: Credentials, dn: string): Promise<void> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.del(dn)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to delete group: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'GROUP_DELETE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Add members to a group.
 */
export const addMembers = async (
  credentials: Credentials,
  groupDn: string,
  memberDns: string[],
): Promise<void> => {
  if (memberDns.length === 0) return

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(groupDn, [
      new Change({
        operation: 'add',
        modification: new Attribute({
          type: 'member',
          values: memberDns,
        }),
      }),
    ])
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to add members: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'GROUP_ADD_MEMBERS_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Remove members from a group.
 */
export const removeMembers = async (
  credentials: Credentials,
  groupDn: string,
  memberDns: string[],
): Promise<void> => {
  if (memberDns.length === 0) return

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(groupDn, [
      new Change({
        operation: 'delete',
        modification: new Attribute({
          type: 'member',
          values: memberDns,
        }),
      }),
    ])
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to remove members: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'GROUP_REMOVE_MEMBERS_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Move a group to a different OU/container.
 */
export const moveGroup = async (
  credentials: Credentials,
  dn: string,
  targetOu: string,
): Promise<string> => {
  const cn = extractCn(dn)
  const newRdn = `CN=${cn}`
  const newDn = `${newRdn},${targetOu}`

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modifyDN(dn, newDn)
  } catch (err) {
    const error = err as Error
    const wrappedErr = new Error(`Failed to move group: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'GROUP_MOVE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return newDn
}
