import { Attribute, Change } from 'ldapts'
import type { AdUser, CreateUserRequest, UpdateUserRequest } from '@samba-ad/shared'
import { UAC_FLAGS } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { encodePassword } from '../utils/password.js'
import { hasFlag, setFlag, clearFlag } from '../utils/uac.js'
import { extractCn } from '../utils/dnUtils.js'
import { type Credentials, str, strArr, num, ALLOWED_USER_ATTRS } from '../utils/ldapHelpers.js'

/**
 * Map an LDAP entry to an AdUser object.
 * Handles both string and string[] values from ldapts.
 */
const entryToAdUser = (entry: Record<string, unknown>): AdUser => {
  return {
    dn: str(entry.dn) || '',
    sAMAccountName: str(entry.sAMAccountName) || '',
    givenName: str(entry.givenName),
    sn: str(entry.sn),
    initials: str(entry.initials),
    displayName: str(entry.displayName),
    description: str(entry.description),
    physicalDeliveryOfficeName: str(entry.physicalDeliveryOfficeName),
    telephoneNumber: str(entry.telephoneNumber),
    otherTelephone: strArr(entry.otherTelephone),
    mail: str(entry.mail),
    wWWHomePage: str(entry.wWWHomePage),
    url: strArr(entry.url),
    streetAddress: str(entry.streetAddress),
    postOfficeBox: str(entry.postOfficeBox),
    l: str(entry.l),
    st: str(entry.st),
    postalCode: str(entry.postalCode),
    c: str(entry.c),
    co: str(entry.co),
    countryCode: num(entry.countryCode),
    userPrincipalName: str(entry.userPrincipalName),
    userAccountControl: num(entry.userAccountControl) || UAC_FLAGS.NORMAL_ACCOUNT,
    accountExpires: str(entry.accountExpires),
    pwdLastSet: str(entry.pwdLastSet),
    profilePath: str(entry.profilePath),
    scriptPath: str(entry.scriptPath),
    homeDrive: str(entry.homeDrive),
    homeDirectory: str(entry.homeDirectory),
    homePhone: str(entry.homePhone),
    otherHomePhone: strArr(entry.otherHomePhone),
    pager: str(entry.pager),
    otherPager: strArr(entry.otherPager),
    mobile: str(entry.mobile),
    otherMobile: strArr(entry.otherMobile),
    facsimileTelephoneNumber: str(entry.facsimileTelephoneNumber),
    otherFacsimileTelephoneNumber: strArr(entry.otherFacsimileTelephoneNumber),
    ipPhone: str(entry.ipPhone),
    otherIpPhone: strArr(entry.otherIpPhone),
    info: str(entry.info),
    title: str(entry.title),
    department: str(entry.department),
    company: str(entry.company),
    manager: str(entry.manager),
    directReports: strArr(entry.directReports),
    memberOf: strArr(entry.memberOf),
    primaryGroupID: num(entry.primaryGroupID),
  }
}

/** All user attributes to fetch */
const USER_ATTRIBUTES = [
  'dn', 'sAMAccountName', 'givenName', 'sn', 'initials', 'displayName',
  'description', 'physicalDeliveryOfficeName', 'telephoneNumber', 'otherTelephone',
  'mail', 'wWWHomePage', 'url', 'streetAddress', 'postOfficeBox', 'l', 'st',
  'postalCode', 'c', 'co', 'countryCode', 'userPrincipalName', 'userAccountControl',
  'accountExpires', 'pwdLastSet', 'profilePath', 'scriptPath', 'homeDrive',
  'homeDirectory', 'homePhone', 'otherHomePhone', 'pager', 'otherPager',
  'mobile', 'otherMobile', 'facsimileTelephoneNumber', 'otherFacsimileTelephoneNumber',
  'ipPhone', 'otherIpPhone', 'info', 'title', 'department', 'company',
  'manager', 'directReports', 'memberOf', 'primaryGroupID',
]

/**
 * Fetch a single user by DN.
 */
export const getUser = async (credentials: Credentials, dn: string): Promise<AdUser> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=user)',
      attributes: USER_ATTRIBUTES,
    })
    if (entries.length === 0) {
      const err = new Error(`User not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }
    return entryToAdUser(entries[0] as unknown as Record<string, unknown>)
  } finally {
    await unbind(client)
  }
}

/**
 * Create a new user in AD.
 * 1. Add the LDAP entry
 * 2. Set password via LDAPS
 * 3. Optionally enable the account
 */
export const createUser = async (credentials: Credentials, request: CreateUserRequest): Promise<string> => {
  const cn = request.displayName || request.sAMAccountName
  const dn = `CN=${cn},${request.parentDn}`

  // Build attributes for the new user entry
  const attributes: Record<string, string | string[]> = {
    objectClass: ['top', 'person', 'organizationalPerson', 'user'],
    sAMAccountName: request.sAMAccountName,
    userPrincipalName: request.userPrincipalName,
    // NORMAL_ACCOUNT + ACCOUNTDISABLE — password must be set before enabling
    userAccountControl: String(UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE),
  }

  if (request.displayName) attributes.displayName = request.displayName
  if (request.givenName) attributes.givenName = request.givenName
  if (request.sn) attributes.sn = request.sn

  // Step 1: Create the user entry via LDAP
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.add(dn, attributes)
  } catch (err) {
    const error = err as Error & { statusCode?: number; code?: string }
    const wrappedErr = new Error(`Failed to create user: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'USER_CREATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  // Step 2: Set password via LDAPS
  try {
    await resetPassword(credentials, dn, request.password)
  } catch (err) {
    // Clean up: delete the user if password set fails
    const cleanupClient = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
    try {
      await cleanupClient.del(dn)
    } finally {
      await unbind(cleanupClient)
    }
    const error = err as Error
    const wrappedErr = new Error(`Failed to set password for new user: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'PASSWORD_SET_FAILED'
    throw wrappedErr
  }

  // Step 3: Enable the account if requested
  if (request.enabled !== false) {
    await enableUser(credentials, dn)
  }

  return dn
}

/**
 * Update user attributes.
 * null values mean "delete this attribute", undefined means "don't touch".
 */
export const updateUser = async (
  credentials: Credentials,
  dn: string,
  changes: UpdateUserRequest,
): Promise<void> => {
  const modifications: Change[] = []

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue
    if (!ALLOWED_USER_ATTRS.has(key)) continue

    if (value === null) {
      // Delete the attribute
      modifications.push(new Change({
        operation: 'delete',
        modification: new Attribute({ type: key }),
      }))
    } else if (Array.isArray(value)) {
      // Replace with array value
      modifications.push(new Change({
        operation: 'replace',
        modification: new Attribute({
          type: key,
          values: value.map(String),
        }),
      }))
    } else {
      // Replace with single value
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
    const wrappedErr = new Error(`Failed to update user: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'USER_UPDATE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Delete a user by DN.
 */
export const deleteUser = async (credentials: Credentials, dn: string): Promise<void> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.del(dn)
  } catch (err) {
    const error = err as Error & { statusCode?: number }
    const wrappedErr = new Error(`Failed to delete user: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = error.statusCode || 400
    wrappedErr.code = 'USER_DELETE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Reset a user's password via LDAPS.
 * Password changes require a secure (LDAPS) connection.
 */
export const resetPassword = async (
  credentials: Credentials,
  dn: string,
  newPassword: string,
): Promise<void> => {
  const client = await createBoundClient(config.ldap.ldapsUrl, credentials.dn, credentials.password)
  try {
    await client.modify(dn, [
      new Change({
        operation: 'replace',
        modification: new Attribute({
          type: 'unicodePwd',
          values: [encodePassword(newPassword)],
        }),
      }),
    ])
  } catch (err) {
    const error = err as Error
    const wrappedErr = new Error(`Failed to reset password: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'PASSWORD_RESET_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Enable a user account by clearing the ACCOUNTDISABLE flag.
 */
export const enableUser = async (credentials: Credentials, dn: string): Promise<void> => {
  const user = await getUser(credentials, dn)
  const newUac = clearFlag(user.userAccountControl, UAC_FLAGS.ACCOUNTDISABLE)

  if (newUac === user.userAccountControl) return // already enabled

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(dn, [
      new Change({
        operation: 'replace',
        modification: new Attribute({
          type: 'userAccountControl',
          values: [String(newUac)],
        }),
      }),
    ])
  } finally {
    await unbind(client)
  }
}

/**
 * Disable a user account by setting the ACCOUNTDISABLE flag.
 */
export const disableUser = async (credentials: Credentials, dn: string): Promise<void> => {
  const user = await getUser(credentials, dn)
  const newUac = setFlag(user.userAccountControl, UAC_FLAGS.ACCOUNTDISABLE)

  if (newUac === user.userAccountControl) return // already disabled

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    await client.modify(dn, [
      new Change({
        operation: 'replace',
        modification: new Attribute({
          type: 'userAccountControl',
          values: [String(newUac)],
        }),
      }),
    ])
  } finally {
    await unbind(client)
  }
}

/**
 * Move a user to a different OU/container.
 * Uses LDAP modifyDN to change the user's location.
 */
export const moveUser = async (
  credentials: Credentials,
  dn: string,
  targetOu: string,
): Promise<string> => {
  const cn = extractCn(dn)
  const newRdn = `CN=${cn}`
  const newDn = `${newRdn},${targetOu}`

  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    // ldapts modifyDN: newDN is the full new DN when moving
    await client.modifyDN(dn, newDn)
  } catch (err) {
    const error = err as Error
    const wrappedErr = new Error(`Failed to move user: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'USER_MOVE_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }

  return newDn
}
