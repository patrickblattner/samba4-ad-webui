import { Attribute, Change } from 'ldapts'
import type { LdapAttribute, AttributeChange } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { type Credentials } from '../utils/ldapHelpers.js'

/** Attributes that contain binary data and should not be returned as strings */
const BINARY_ATTRIBUTES = new Set([
  'objectGUID',
  'objectSid',
  'logonHours',
  'thumbnailPhoto',
  'jpegPhoto',
  'msExchMailboxGuid',
  'msExchMailboxSecurityDescriptor',
  'userCertificate',
  'cACertificate',
  'nTSecurityDescriptor',
  'replPropertyMetaData',
  'replUpToDateVector',
  'repsFrom',
  'repsTo',
  'dSASignature',
  'auditingPolicy',
  'msDS-RevealedUsers',
])

/**
 * Convert a raw LDAP attribute value to string array.
 * Handles Buffer values by marking them as binary.
 */
const toStringValues = (name: string, value: unknown): string[] => {
  if (value === undefined || value === null) return []

  if (Buffer.isBuffer(value)) {
    if (BINARY_ATTRIBUTES.has(name)) return ['<Binary>']
    return [value.toString('base64')]
  }

  if (Array.isArray(value)) {
    return value.map((v) => {
      if (Buffer.isBuffer(v)) {
        if (BINARY_ATTRIBUTES.has(name)) return '<Binary>'
        return v.toString('base64')
      }
      return String(v)
    })
  }

  return [String(value)]
}

/**
 * Fetch ALL attributes of an LDAP object by DN.
 */
export const getAttributes = async (
  credentials: Credentials,
  dn: string,
): Promise<LdapAttribute[]> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['*', '+'], // * = all user attrs, + = all operational attrs
    })

    if (entries.length === 0) {
      const err = new Error(`Object not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'OBJECT_NOT_FOUND'
      throw err
    }

    const entry = entries[0] as unknown as Record<string, unknown>
    const attributes: LdapAttribute[] = []

    for (const [name, value] of Object.entries(entry)) {
      if (name === 'dn' || name === 'controls') continue
      // Filter out LDAP request selectors that ldapts returns as properties
      if (name === '*' || name === '+') continue
      const values = toStringValues(name, value)
      attributes.push({ name, values })
    }

    // Sort alphabetically by attribute name
    attributes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return attributes
  } finally {
    await unbind(client)
  }
}

/**
 * Apply attribute modifications to an LDAP object.
 */
export const updateAttributes = async (
  credentials: Credentials,
  dn: string,
  changes: AttributeChange[],
): Promise<void> => {
  if (changes.length === 0) return

  const modifications = changes.map((change) => {
    if (change.operation === 'delete' && change.values.length === 0) {
      // Delete entire attribute
      return new Change({
        operation: 'delete',
        modification: new Attribute({ type: change.name }),
      })
    }

    return new Change({
      operation: change.operation,
      modification: new Attribute({
        type: change.name,
        values: change.values,
      }),
    })
  })

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(dn, modifications)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to update attributes: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'ATTRIBUTE_UPDATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}
