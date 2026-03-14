import { Attribute, Change } from 'ldapts'
import type { ObjectSummary, ObjectInfo, PaginatedResponse, SecurityDescriptorInfo, AceEntry } from '@samba-ad/shared'
import { createBoundClient, search, unbind } from './ldap.js'
import { config } from '../config.js'
import { extractCn, splitDnComponents, getParentDn } from '../utils/dnUtils.js'
import { objectListFilter } from '../utils/ldapFilters.js'
import { type Credentials, str, toStringArray, determineObjectType, isAccountEnabled } from '../utils/ldapHelpers.js'
import {
  SdFlagsControl,
  isProtectedFromDeletion,
  addProtectionAces,
  removeProtectionAces,
  addChildProtectionAce,
  removeChildProtectionAce,
  parseSecurityDescriptorFull,
  parseSid,
  accessMaskToRights,
  aceFlagsToAppliesTo,
  resolveWellKnownSid,
  sidStringToBytes,
} from '../utils/securityDescriptor.js'

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

/**
 * Compute a canonical name from a DN.
 * DN "CN=John,OU=Users,DC=lab,DC=dev" -> "lab.dev/Users/John"
 */
const dnToCanonicalName = (dn: string): string => {
  const components = splitDnComponents(dn)
  const dcParts: string[] = []
  const pathParts: string[] = []

  for (const comp of components) {
    const eqIdx = comp.indexOf('=')
    if (eqIdx === -1) continue
    const type = comp.substring(0, eqIdx).trim().toUpperCase()
    const value = comp.substring(eqIdx + 1).trim()
    // Unescape DN value
    const unescaped = value.replace(/\\(.)/g, '$1')

    if (type === 'DC') {
      dcParts.push(unescaped)
    } else {
      pathParts.push(unescaped)
    }
  }

  const domain = dcParts.join('.')
  const path = pathParts.reverse().join('/')
  return path ? `${domain}/${path}` : domain
}

/**
 * Fetch object info for the Object tab (canonical name, dates, protection status).
 */
export const getObjectInfo = async (credentials: Credentials, dn: string): Promise<ObjectInfo> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    // Fetch basic attributes
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['canonicalName', 'objectClass', 'whenCreated', 'whenChanged', 'uSNCreated', 'uSNChanged'],
    })

    if (entries.length === 0) {
      const err = new Error(`Object not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'OBJECT_NOT_FOUND'
      throw err
    }

    const entry = entries[0] as unknown as Record<string, unknown>

    // Fetch nTSecurityDescriptor with SD_FLAGS control (DACL only = 4)
    const sdEntries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['nTSecurityDescriptor'],
      explicitBufferAttributes: ['nTSecurityDescriptor'],
    }, new SdFlagsControl(4))

    let isProtected = false
    if (sdEntries.length > 0) {
      const sdEntry = sdEntries[0] as unknown as Record<string, unknown>
      const sdValue = sdEntry['nTSecurityDescriptor']
      if (sdValue instanceof Buffer) {
        isProtected = isProtectedFromDeletion(sdValue)
      }
    }

    // Extract structural objectClass (last element)
    const objectClasses = toStringArray(entry['objectClass'])
    const structuralClass = objectClasses.length > 0
      ? objectClasses[objectClasses.length - 1]
      : 'top'

    // Canonical name: use attribute if available, otherwise compute from DN
    const canonicalName = str(entry['canonicalName']) || dnToCanonicalName(dn)

    return {
      canonicalName,
      objectClass: structuralClass,
      whenCreated: str(entry['whenCreated']) || '',
      whenChanged: str(entry['whenChanged']) || '',
      uSNCreated: str(entry['uSNCreated']) || '',
      uSNChanged: str(entry['uSNChanged']) || '',
      isProtected,
    }
  } finally {
    await unbind(client)
  }
}

/**
 * Set or remove accidental deletion protection on an object.
 * Modifies both the object's own DACL and the parent's DACL.
 */
export const setObjectProtection = async (
  credentials: Credentials,
  dn: string,
  protect: boolean,
): Promise<void> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    // Read current nTSecurityDescriptor for the object
    const sdControl = new SdFlagsControl(4)
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['nTSecurityDescriptor'],
      explicitBufferAttributes: ['nTSecurityDescriptor'],
    }, sdControl)

    if (entries.length === 0) {
      const err = new Error(`Object not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'OBJECT_NOT_FOUND'
      throw err
    }

    const entry = entries[0] as unknown as Record<string, unknown>
    const sdValue = entry['nTSecurityDescriptor']
    if (!(sdValue instanceof Buffer)) {
      const err = new Error('Could not read security descriptor') as Error & { statusCode: number; code: string }
      err.statusCode = 500
      err.code = 'SD_READ_FAILED'
      throw err
    }

    // Modify the object's DACL
    const newSd = protect ? addProtectionAces(sdValue) : removeProtectionAces(sdValue)
    if (!newSd.equals(sdValue)) {
      await client.modify(dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({
            type: 'nTSecurityDescriptor',
            values: [newSd],
          }),
        }),
      ], sdControl)
    }

    // Modify the parent's DACL (add/remove DELETE_CHILD ACE)
    const parentDn = getParentDn(dn)
    if (parentDn !== dn) {
      const parentEntries = await search(client, parentDn, {
        scope: 'base',
        filter: '(objectClass=*)',
        attributes: ['nTSecurityDescriptor'],
        explicitBufferAttributes: ['nTSecurityDescriptor'],
      }, sdControl)

      if (parentEntries.length > 0) {
        const parentEntry = parentEntries[0] as unknown as Record<string, unknown>
        const parentSd = parentEntry['nTSecurityDescriptor']
        if (parentSd instanceof Buffer) {
          const newParentSd = protect
            ? addChildProtectionAce(parentSd)
            : removeChildProtectionAce(parentSd)
          if (!newParentSd.equals(parentSd)) {
            await client.modify(parentDn, [
              new Change({
                operation: 'replace',
                modification: new Attribute({
                  type: 'nTSecurityDescriptor',
                  values: [newParentSd],
                }),
              }),
            ], sdControl)
          }
        }
      }
    }
  } catch (err) {
    const error = err as Error & { statusCode?: number; code?: string }
    if (error.code && error.statusCode) throw err
    const wrappedErr = new Error(`Failed to set object protection: ${error.message}`) as Error & { statusCode: number; code: string }
    wrappedErr.statusCode = 400
    wrappedErr.code = 'PROTECTION_SET_FAILED'
    throw wrappedErr
  } finally {
    await unbind(client)
  }
}

/**
 * Fetch the security descriptor for an object (read-only Security tab).
 * Resolves SIDs to display names via well-known SID table and LDAP lookup.
 */
export const getObjectSecurity = async (
  credentials: Credentials,
  dn: string,
): Promise<SecurityDescriptorInfo> => {
  const client = await createBoundClient(config.ldap.url, credentials.dn, credentials.password)
  try {
    // Fetch nTSecurityDescriptor with OWNER (1) + DACL (4) = 5
    const sdControl = new SdFlagsControl(5)
    const entries = await search(client, dn, {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['nTSecurityDescriptor'],
      explicitBufferAttributes: ['nTSecurityDescriptor'],
    }, sdControl)

    if (entries.length === 0) {
      const err = new Error(`Object not found: ${dn}`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'OBJECT_NOT_FOUND'
      throw err
    }

    const entry = entries[0] as unknown as Record<string, unknown>
    const sdValue = entry['nTSecurityDescriptor']
    if (!(sdValue instanceof Buffer)) {
      const err = new Error('Could not read security descriptor') as Error & { statusCode: number; code: string }
      err.statusCode = 500
      err.code = 'SD_READ_FAILED'
      throw err
    }

    const sd = parseSecurityDescriptorFull(sdValue)

    // Collect all unique SIDs that need resolution
    const allSids = new Set<string>()
    if (sd.ownerSid) allSids.add(sd.ownerSid)
    for (const ace of sd.aces) {
      if (ace.sid) allSids.add(ace.sid)
    }

    // Resolve SIDs: first try well-known, then LDAP
    const sidToName = new Map<string, string>()
    const unresolvedSids: string[] = []

    for (const sid of allSids) {
      const name = resolveWellKnownSid(sid)
      if (name) {
        sidToName.set(sid, name)
      } else {
        unresolvedSids.push(sid)
      }
    }

    // Build domain prefix from baseDN (first DC component uppercased)
    const dcMatch = config.ldap.baseDn.match(/DC=([^,]+)/i)
    const domainPrefix = dcMatch ? dcMatch[1].toUpperCase() : 'DOMAIN'

    // Resolve remaining SIDs via LDAP batch lookup
    if (unresolvedSids.length > 0) {
      const sidFilters = unresolvedSids.map(sid => {
        const sidBytes = sidStringToBytes(sid)
        const escaped = Array.from(sidBytes).map(b => `\\${b.toString(16).padStart(2, '0')}`).join('')
        return `(objectSid=${escaped})`
      })
      const filter = sidFilters.length === 1 ? sidFilters[0] : `(|${sidFilters.join('')})`

      try {
        const resolved = await search(client, config.ldap.baseDn, {
          scope: 'sub',
          filter,
          attributes: ['sAMAccountName', 'objectSid'],
          explicitBufferAttributes: ['objectSid'],
          sizeLimit: unresolvedSids.length,
        })

        for (const resolvedEntry of resolved) {
          const re = resolvedEntry as unknown as Record<string, unknown>
          const objectSid = re['objectSid']
          if (objectSid instanceof Buffer) {
            const { sid: resolvedSid } = parseSid(objectSid, 0)
            const samName = re['sAMAccountName'] as string
            if (samName) {
              sidToName.set(resolvedSid, `${domainPrefix}\\${samName}`)
            }
          }
        }
      } catch {
        // If LDAP lookup fails, we'll just show the SID string
      }
    }

    // Build parent DN for inherited ACEs
    const parentDn = getParentDn(dn)

    // Compute isInheritanceEnabled: SE_DACL_PROTECTED = 0x1000
    const isInheritanceEnabled = !(sd.controlFlags & 0x1000)

    // Resolve owner
    const ownerName = sidToName.get(sd.ownerSid) || sd.ownerSid

    // Build ACE entries
    const dacl: AceEntry[] = sd.aces.map(ace => {
      const isAllow = ace.type === 0x00 || ace.type === 0x05
      const isInherited = !!(ace.flags & 0x10)

      return {
        type: isAllow ? 'allow' : 'deny',
        principalName: sidToName.get(ace.sid) || ace.sid,
        principalSid: ace.sid,
        accessMask: ace.accessMask,
        rights: accessMaskToRights(ace.accessMask),
        objectType: ace.objectType,
        inheritedObjectType: ace.inheritedObjectType,
        isInherited,
        inheritedFrom: isInherited ? parentDn : '<not inherited>',
        appliesTo: aceFlagsToAppliesTo(ace.flags),
        aceFlags: ace.flags,
      }
    })

    return {
      owner: { name: ownerName, sid: sd.ownerSid },
      dacl,
      isInheritanceEnabled,
    }
  } finally {
    await unbind(client)
  }
}
