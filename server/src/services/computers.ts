import { Attribute, Change } from 'ldapts'
import type { AdComputer, CreateComputerRequest, UpdateComputerRequest } from '@samba-ad/shared'
import { UAC_FLAGS, validateSamAccountName } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn } from '../utils/dnUtils.js'
import { type Credentials, str, strArr, num, ALLOWED_COMPUTER_ATTRS } from '../utils/ldapHelpers.js'

/**
 * Map an LDAP entry to an AdComputer object.
 */
const entryToAdComputer = (entry: Record<string, unknown>): AdComputer => {
  return {
    dn: str(entry.dn) || '',
    sAMAccountName: str(entry.sAMAccountName) || '',
    dNSHostName: str(entry.dNSHostName),
    description: str(entry.description),
    operatingSystem: str(entry.operatingSystem),
    operatingSystemVersion: str(entry.operatingSystemVersion),
    operatingSystemServicePack: str(entry.operatingSystemServicePack),
    location: str(entry.location),
    memberOf: strArr(entry.memberOf),
    primaryGroupID: num(entry.primaryGroupID),
    managedBy: str(entry.managedBy),
    userAccountControl: num(entry.userAccountControl) || UAC_FLAGS.WORKSTATION_TRUST_ACCOUNT,
  }
}

/** All computer attributes to fetch */
const COMPUTER_ATTRIBUTES = [
  'dn', 'sAMAccountName', 'dNSHostName', 'description',
  'operatingSystem', 'operatingSystemVersion', 'operatingSystemServicePack',
  'location', 'memberOf', 'primaryGroupID', 'managedBy', 'userAccountControl',
]

/**
 * Fetch a single computer by DN.
 */
export const getComputer = async (credentials: Credentials, dn: string): Promise<AdComputer> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=computer)',
      attributes: COMPUTER_ATTRIBUTES,
    })
    if (entries.length === 0) {
      const err = new Error(`Computer not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'COMPUTER_NOT_FOUND'
      throw err
    }
    return entryToAdComputer(entries[0] as unknown as Record<string, unknown>)
  } finally {
    await unbind(client)
  }
}

/**
 * Create (pre-stage) a new computer account in AD.
 * Sets objectClass hierarchy and WORKSTATION_TRUST_ACCOUNT + ACCOUNTDISABLE.
 */
export const createComputer = async (credentials: Credentials, request: CreateComputerRequest): Promise<string> => {
  const samResult = validateSamAccountName(request.sAMAccountName, 'computer')
  if (!samResult.valid) throw new Error(samResult.error)

  const dn = `CN=${request.name},${request.parentDn}`

  // Ensure sAMAccountName ends with $
  const sam = request.sAMAccountName.endsWith('$')
    ? request.sAMAccountName
    : `${request.sAMAccountName}$`

  // Pre-staged computer: disabled workstation trust account
  const uac = UAC_FLAGS.WORKSTATION_TRUST_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE // 4098

  const attributes: Record<string, string | string[]> = {
    objectClass: ['top', 'person', 'organizationalPerson', 'user', 'computer'],
    sAMAccountName: sam,
    userAccountControl: String(uac),
  }

  if (request.description) attributes.description = request.description

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.add(dn, attributes)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to create computer: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'COMPUTER_CREATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return dn
}

/**
 * Update computer attributes.
 * null values mean "delete this attribute", undefined means "don't touch".
 */
export const updateComputer = async (
  credentials: Credentials,
  dn: string,
  changes: UpdateComputerRequest,
): Promise<void> => {
  if (changes.sAMAccountName !== undefined) {
    const result = validateSamAccountName(changes.sAMAccountName, 'computer')
    if (!result.valid) throw new Error(result.error)
  }

  const modifications: Change[] = []

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue
    if (!ALLOWED_COMPUTER_ATTRS.has(key)) continue

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
    const wrappedErr = new Error(`Failed to update computer: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'COMPUTER_UPDATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Delete a computer by DN.
 */
export const deleteComputer = async (credentials: Credentials, dn: string): Promise<void> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.del(dn)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to delete computer: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'COMPUTER_DELETE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Move a computer to a different OU/container.
 */
export const moveComputer = async (
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
    const wrappedErr = new Error(`Failed to move computer: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'COMPUTER_MOVE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return newDn
}
