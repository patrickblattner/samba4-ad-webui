import { Attribute, Change } from 'ldapts'
import type { LdapAttribute, AttributeChange } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { getSchemaAttributes } from './schema.js'
import { config } from '../config.js'
import { type Credentials } from '../utils/ldapHelpers.js'

/**
 * Decode a 16-byte objectGUID buffer to standard Microsoft GUID string.
 * Byte order: first 3 groups little-endian, last 2 groups big-endian.
 */
function decodeObjectGUID(buf: Buffer): string {
  if (buf.length !== 16) return buf.toString('hex')
  const hex = (b: number) => b.toString(16).padStart(2, '0')
  const p1 = [buf[3], buf[2], buf[1], buf[0]].map(hex).join('')
  const p2 = [buf[5], buf[4]].map(hex).join('')
  const p3 = [buf[7], buf[6]].map(hex).join('')
  const p4 = [buf[8], buf[9]].map(hex).join('')
  const p5 = [buf[10], buf[11], buf[12], buf[13], buf[14], buf[15]].map(hex).join('')
  return `{${p1}-${p2}-${p3}-${p4}-${p5}}`
}

/**
 * Decode a binary SID buffer to standard string format: S-1-5-21-...
 */
function decodeObjectSid(buf: Buffer): string {
  if (buf.length < 8) return buf.toString('hex')
  const revision = buf[0]
  const subAuthorityCount = buf[1]
  // 6-byte big-endian authority (bytes 2..7)
  const authority = buf.readUIntBE(2, 6)
  let sid = `S-${revision}-${authority}`
  for (let i = 0; i < subAuthorityCount; i++) {
    const offset = 8 + i * 4
    if (offset + 4 > buf.length) break
    sid += `-${buf.readUInt32LE(offset)}`
  }
  return sid
}

/** Attributes with dedicated decoders — not treated as opaque binary */
const DECODED_ATTRIBUTES: Record<string, (buf: Buffer) => string> = {
  objectGUID: decodeObjectGUID,
  objectSid: decodeObjectSid,
}

/** Attributes that contain binary data and should not be returned as strings */
const BINARY_ATTRIBUTES = new Set([
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
    const decoder = DECODED_ATTRIBUTES[name]
    if (decoder) return [decoder(value)]
    if (BINARY_ATTRIBUTES.has(name)) return ['<Binary>']
    return [value.toString('base64')]
  }

  if (Array.isArray(value)) {
    return value.map((v) => {
      if (Buffer.isBuffer(v)) {
        const decoder = DECODED_ATTRIBUTES[name]
        if (decoder) return decoder(v)
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

    // Extract objectClass for schema query
    const objectClasses: string[] = []
    const rawOc = entry['objectClass']
    if (Array.isArray(rawOc)) {
      objectClasses.push(...rawOc.map(String))
    } else if (rawOc) {
      objectClasses.push(String(rawOc))
    }

    for (const [name, value] of Object.entries(entry)) {
      if (name === 'dn' || name === 'controls') continue
      // Filter out LDAP request selectors that ldapts returns as properties
      if (name === '*' || name === '+') continue
      const values = toStringValues(name, value)
      attributes.push({ name, values })
    }

    // Get all schema attributes and add unset ones
    const schemaAttrs = await getSchemaAttributes(client, objectClasses)
    const presentNames = new Set(attributes.map(a => a.name.toLowerCase()))
    for (const schemaAttr of schemaAttrs) {
      if (!presentNames.has(schemaAttr.toLowerCase())) {
        attributes.push({ name: schemaAttr, values: [] })
      }
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
