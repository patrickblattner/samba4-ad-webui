/**
 * Binary parser for MS-DTYP SECURITY_DESCRIPTOR format.
 * Handles nTSecurityDescriptor attribute to detect and modify
 * "Protect from accidental deletion" ACEs.
 */

import { Control } from 'ldapts'
import asn1 from 'asn1'
const { BerWriter } = asn1

// Access mask constants
const DELETE = 0x00010000
const DELETE_TREE = 0x00000040 // ADS_RIGHT_DS_DELETE_TREE
const DELETE_CHILD = 0x00000002

// ACE types
const ACCESS_ALLOWED_ACE_TYPE = 0x00
const ACCESS_DENIED_ACE_TYPE = 0x01
const ACCESS_ALLOWED_OBJECT_ACE_TYPE = 0x05
const ACCESS_DENIED_OBJECT_ACE_TYPE = 0x06

// Everyone SID: S-1-1-0
const EVERYONE_SID = Buffer.from([
  0x01, // Revision
  0x01, // SubAuthorityCount
  0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // IdentifierAuthority (1, big-endian 6 bytes)
  0x00, 0x00, 0x00, 0x00, // SubAuthority[0] = 0
])

/**
 * LDAP control for requesting specific parts of nTSecurityDescriptor.
 * OID: 1.2.840.113556.1.4.801 (LDAP_SERVER_SD_FLAGS_OID)
 * Flags: 4 = DACL_SECURITY_INFORMATION
 */
export class SdFlagsControl extends Control {
  private flags: number

  constructor(flags: number, critical = false) {
    super('1.2.840.113556.1.4.801', { critical })
    this.flags = flags
  }

  writeControl(writer: InstanceType<typeof BerWriter>): void {
    const ber = new BerWriter()
    ber.writeInt(this.flags)
    writer.writeBuffer(ber.buffer, 0x04)
  }
}

/**
 * Parse a SID from a buffer at the given offset.
 * Returns the SID string (e.g., "S-1-1-0") and byte length.
 */
export const parseSid = (buf: Buffer, offset: number): { sid: string; length: number } => {
  const revision = buf.readUInt8(offset)
  const subAuthorityCount = buf.readUInt8(offset + 1)
  // IdentifierAuthority: 6 bytes big-endian
  const authorityHigh = buf.readUInt16BE(offset + 2)
  const authorityLow = buf.readUInt32BE(offset + 4)
  const authority = authorityHigh > 0
    ? BigInt(authorityHigh) * BigInt(0x100000000) + BigInt(authorityLow)
    : BigInt(authorityLow)

  const subAuthorities: number[] = []
  for (let i = 0; i < subAuthorityCount; i++) {
    subAuthorities.push(buf.readUInt32LE(offset + 8 + i * 4))
  }

  const sid = `S-${revision}-${authority}${subAuthorities.map(sa => `-${sa}`).join('')}`
  const length = 8 + subAuthorityCount * 4
  return { sid, length }
}

/**
 * Compare two SIDs in binary form.
 */
const sidEquals = (buf: Buffer, offset: number, targetSid: Buffer): boolean => {
  const sidLen = 8 + buf.readUInt8(offset + 1) * 4
  if (offset + sidLen > buf.length) return false
  if (sidLen !== targetSid.length) return false
  return buf.subarray(offset, offset + sidLen).equals(targetSid)
}

interface AceInfo {
  offset: number
  type: number
  flags: number
  size: number
  accessMask: number
  sidOffset: number
}

/**
 * Parse ACEs from a DACL.
 */
const parseAces = (buf: Buffer, daclOffset: number): AceInfo[] => {
  const aces: AceInfo[] = []
  // ACL header: AclRevision(1), Sbz1(1), AclSize(2), AceCount(2), Sbz2(2)
  const aceCount = buf.readUInt16LE(daclOffset + 4)
  let aceOffset = daclOffset + 8 // Skip ACL header

  for (let i = 0; i < aceCount; i++) {
    if (aceOffset + 4 > buf.length) break
    const aceType = buf.readUInt8(aceOffset)
    const aceFlags = buf.readUInt8(aceOffset + 1)
    const aceSize = buf.readUInt16LE(aceOffset + 2)
    let accessMask = 0
    let sidOffset = 0

    if (aceType === ACCESS_DENIED_ACE_TYPE && aceSize >= 8) {
      accessMask = buf.readUInt32LE(aceOffset + 4)
      sidOffset = aceOffset + 8
    }

    aces.push({ offset: aceOffset, type: aceType, flags: aceFlags, size: aceSize, accessMask, sidOffset })
    aceOffset += aceSize
  }

  return aces
}

/**
 * Get the DACL offset from a self-relative security descriptor.
 * Returns 0 if no DACL is present.
 */
const getDaclOffset = (buf: Buffer): number => {
  if (buf.length < 20) return 0
  // SD header: Revision(1), Sbz1(1), Control(2 LE), OffsetOwner(4), OffsetGroup(4), OffsetSacl(4), OffsetDacl(4)
  const offsetDacl = buf.readUInt32LE(16)
  if (offsetDacl === 0 || offsetDacl >= buf.length) return 0
  return offsetDacl
}

/**
 * Check if the security descriptor contains a DENY ACE for Everyone
 * with DELETE and DELETE_TREE access mask (protection from accidental deletion).
 */
export const isProtectedFromDeletion = (sdBuffer: Buffer): boolean => {
  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return false

  const aces = parseAces(sdBuffer, daclOffset)
  for (const ace of aces) {
    if (ace.type !== ACCESS_DENIED_ACE_TYPE) continue
    if ((ace.accessMask & (DELETE | DELETE_TREE)) !== (DELETE | DELETE_TREE)) continue
    if (sidEquals(sdBuffer, ace.sidOffset, EVERYONE_SID)) return true
  }
  return false
}

/**
 * Build an ACCESS_DENIED_ACE for Everyone with the given access mask.
 */
const buildDenyAce = (accessMask: number): Buffer => {
  const aceSize = 4 + 4 + EVERYONE_SID.length // header + mask + SID
  const ace = Buffer.alloc(aceSize)
  ace.writeUInt8(ACCESS_DENIED_ACE_TYPE, 0) // AceType
  ace.writeUInt8(0x00, 1) // AceFlags
  ace.writeUInt16LE(aceSize, 2) // AceSize
  ace.writeUInt32LE(accessMask, 4) // AccessMask
  EVERYONE_SID.copy(ace, 8) // SID
  return ace
}

/**
 * Add protection DENY ACEs (DELETE | DELETE_TREE for Everyone) to the DACL.
 * Returns a new buffer with the modified security descriptor.
 */
export const addProtectionAces = (sdBuffer: Buffer): Buffer => {
  if (isProtectedFromDeletion(sdBuffer)) return sdBuffer

  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return sdBuffer

  const newAce = buildDenyAce(DELETE | DELETE_TREE)
  return insertAceIntoDacl(sdBuffer, daclOffset, newAce)
}

/**
 * Remove protection DENY ACEs (DELETE | DELETE_TREE for Everyone) from the DACL.
 * Returns a new buffer with the modified security descriptor.
 */
export const removeProtectionAces = (sdBuffer: Buffer): Buffer => {
  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return sdBuffer

  return removeMatchingAces(sdBuffer, daclOffset, (ace) =>
    ace.type === ACCESS_DENIED_ACE_TYPE &&
    (ace.accessMask & (DELETE | DELETE_TREE)) === (DELETE | DELETE_TREE) &&
    sidEquals(sdBuffer, ace.sidOffset, EVERYONE_SID),
  )
}

/**
 * Check if a DACL contains a DENY DELETE_CHILD ACE for Everyone.
 */
const hasChildProtectionAce = (sdBuffer: Buffer): boolean => {
  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return false

  const aces = parseAces(sdBuffer, daclOffset)
  for (const ace of aces) {
    if (ace.type !== ACCESS_DENIED_ACE_TYPE) continue
    if ((ace.accessMask & DELETE_CHILD) !== DELETE_CHILD) continue
    if (sidEquals(sdBuffer, ace.sidOffset, EVERYONE_SID)) return true
  }
  return false
}

/**
 * Add a DENY DELETE_CHILD ACE for Everyone to the parent container's DACL.
 */
export const addChildProtectionAce = (sdBuffer: Buffer): Buffer => {
  if (hasChildProtectionAce(sdBuffer)) return sdBuffer

  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return sdBuffer

  const newAce = buildDenyAce(DELETE_CHILD)
  return insertAceIntoDacl(sdBuffer, daclOffset, newAce)
}

/**
 * Remove the DENY DELETE_CHILD ACE for Everyone from the parent container's DACL.
 */
export const removeChildProtectionAce = (sdBuffer: Buffer): Buffer => {
  const daclOffset = getDaclOffset(sdBuffer)
  if (daclOffset === 0) return sdBuffer

  return removeMatchingAces(sdBuffer, daclOffset, (ace) =>
    ace.type === ACCESS_DENIED_ACE_TYPE &&
    (ace.accessMask & DELETE_CHILD) === DELETE_CHILD &&
    sidEquals(sdBuffer, ace.sidOffset, EVERYONE_SID),
  )
}

/**
 * Insert an ACE at the beginning of the DACL (DENY ACEs should come first).
 */
const insertAceIntoDacl = (sdBuffer: Buffer, daclOffset: number, newAce: Buffer): Buffer => {
  const oldAclSize = sdBuffer.readUInt16LE(daclOffset + 2)
  const oldAceCount = sdBuffer.readUInt16LE(daclOffset + 4)

  // Build new buffer: SD before DACL + new ACL header + new ACE + existing ACEs + SD after DACL
  const beforeDacl = sdBuffer.subarray(0, daclOffset)
  const existingAces = sdBuffer.subarray(daclOffset + 8, daclOffset + oldAclSize)
  const afterDacl = sdBuffer.subarray(daclOffset + oldAclSize)

  const newAclSize = oldAclSize + newAce.length
  const newAclHeader = Buffer.alloc(8)
  newAclHeader.writeUInt8(sdBuffer.readUInt8(daclOffset), 0) // AclRevision
  newAclHeader.writeUInt8(0, 1) // Sbz1
  newAclHeader.writeUInt16LE(newAclSize, 2) // AclSize
  newAclHeader.writeUInt16LE(oldAceCount + 1, 4) // AceCount
  newAclHeader.writeUInt16LE(0, 6) // Sbz2

  const result = Buffer.concat([beforeDacl, newAclHeader, newAce, existingAces, afterDacl])

  // Update offsets in SD header for anything after the DACL
  updateOffsetsAfterDacl(result, daclOffset, newAce.length)

  return result
}

/**
 * Remove ACEs matching a predicate from the DACL.
 */
const removeMatchingAces = (
  sdBuffer: Buffer,
  daclOffset: number,
  predicate: (ace: AceInfo) => boolean,
): Buffer => {
  const aces = parseAces(sdBuffer, daclOffset)
  const toRemove = aces.filter(predicate)
  if (toRemove.length === 0) return sdBuffer

  const removedSize = toRemove.reduce((sum, ace) => sum + ace.size, 0)
  const oldAclSize = sdBuffer.readUInt16LE(daclOffset + 2)
  const oldAceCount = sdBuffer.readUInt16LE(daclOffset + 4)

  // Build new ACE data excluding removed ACEs
  const removeOffsets = new Set(toRemove.map(a => a.offset))
  const keptAceBuffers: Buffer[] = []
  for (const ace of aces) {
    if (!removeOffsets.has(ace.offset)) {
      keptAceBuffers.push(sdBuffer.subarray(ace.offset, ace.offset + ace.size))
    }
  }

  const beforeDacl = sdBuffer.subarray(0, daclOffset)
  const afterDacl = sdBuffer.subarray(daclOffset + oldAclSize)

  const newAclSize = oldAclSize - removedSize
  const newAclHeader = Buffer.alloc(8)
  newAclHeader.writeUInt8(sdBuffer.readUInt8(daclOffset), 0)
  newAclHeader.writeUInt8(0, 1)
  newAclHeader.writeUInt16LE(newAclSize, 2)
  newAclHeader.writeUInt16LE(oldAceCount - toRemove.length, 4)
  newAclHeader.writeUInt16LE(0, 6)

  const result = Buffer.concat([beforeDacl, newAclHeader, ...keptAceBuffers, afterDacl])

  // Update offsets in SD header for anything after the DACL
  updateOffsetsAfterDacl(result, daclOffset, -removedSize)

  return result
}

/**
 * Update SD header offsets when the DACL size changes.
 * Offsets for Owner, Group, and SACL that point after the DACL need adjustment.
 */
const updateOffsetsAfterDacl = (buf: Buffer, daclOffset: number, sizeDelta: number): void => {
  // Offsets at positions: Owner(4), Group(8), Sacl(12), Dacl(16)
  const offsetPositions = [4, 8, 12] // Owner, Group, Sacl
  for (const pos of offsetPositions) {
    const offset = buf.readUInt32LE(pos)
    if (offset > daclOffset) {
      buf.writeUInt32LE(offset + sizeDelta, pos)
    }
  }
}

// --- Full security descriptor parsing for Security tab ---

export interface ParsedAce {
  type: number
  flags: number
  accessMask: number
  sid: string
  objectType: string | null
  inheritedObjectType: string | null
}

export interface ParsedSecurityDescriptor {
  ownerSid: string
  controlFlags: number
  aces: ParsedAce[]
}

/**
 * Parse a GUID from a buffer at the given offset.
 * Reads 16 bytes in mixed-endian format (LE for first 3 groups, BE for last 2).
 */
export const parseGuid = (buf: Buffer, offset: number): string => {
  const d1 = buf.readUInt32LE(offset).toString(16).padStart(8, '0')
  const d2 = buf.readUInt16LE(offset + 4).toString(16).padStart(4, '0')
  const d3 = buf.readUInt16LE(offset + 6).toString(16).padStart(4, '0')
  const d4 = buf.subarray(offset + 8, offset + 10).toString('hex')
  const d5 = buf.subarray(offset + 10, offset + 16).toString('hex')
  return `${d1}-${d2}-${d3}-${d4}-${d5}`
}

/**
 * Parse a full security descriptor from binary format.
 * Returns owner SID, control flags, and all ACEs with full detail.
 */
export const parseSecurityDescriptorFull = (buf: Buffer): ParsedSecurityDescriptor => {
  if (buf.length < 20) {
    return { ownerSid: '', controlFlags: 0, aces: [] }
  }

  const controlFlags = buf.readUInt16LE(2)
  const offsetOwner = buf.readUInt32LE(4)

  // Parse owner SID
  let ownerSid = ''
  if (offsetOwner > 0 && offsetOwner < buf.length) {
    const result = parseSid(buf, offsetOwner)
    ownerSid = result.sid
  }

  // Parse DACL
  const daclOffset = getDaclOffset(buf)
  if (daclOffset === 0) {
    return { ownerSid, controlFlags, aces: [] }
  }

  const aceCount = buf.readUInt16LE(daclOffset + 4)
  let aceOffset = daclOffset + 8
  const aces: ParsedAce[] = []

  for (let i = 0; i < aceCount; i++) {
    if (aceOffset + 4 > buf.length) break
    const aceType = buf.readUInt8(aceOffset)
    const aceFlags = buf.readUInt8(aceOffset + 1)
    const aceSize = buf.readUInt16LE(aceOffset + 2)

    if (aceOffset + aceSize > buf.length) break

    let accessMask = 0
    let sid = ''
    let objectType: string | null = null
    let inheritedObjectType: string | null = null

    if (
      (aceType === ACCESS_ALLOWED_ACE_TYPE || aceType === ACCESS_DENIED_ACE_TYPE) &&
      aceSize >= 8
    ) {
      // Standard ACE: header(4) + AccessMask(4) + SID
      accessMask = buf.readUInt32LE(aceOffset + 4)
      const sidResult = parseSid(buf, aceOffset + 8)
      sid = sidResult.sid
    } else if (
      (aceType === ACCESS_ALLOWED_OBJECT_ACE_TYPE || aceType === ACCESS_DENIED_OBJECT_ACE_TYPE) &&
      aceSize >= 12
    ) {
      // Object ACE: header(4) + AccessMask(4) + ObjectFlags(4) + optional GUIDs + SID
      accessMask = buf.readUInt32LE(aceOffset + 4)
      const objectFlags = buf.readUInt32LE(aceOffset + 8)
      let sidPos = aceOffset + 12

      if (objectFlags & 0x01) {
        // ACE_OBJECT_TYPE_PRESENT
        objectType = parseGuid(buf, sidPos)
        sidPos += 16
      }
      if (objectFlags & 0x02) {
        // ACE_INHERITED_OBJECT_TYPE_PRESENT
        inheritedObjectType = parseGuid(buf, sidPos)
        sidPos += 16
      }

      const sidResult = parseSid(buf, sidPos)
      sid = sidResult.sid
    } else {
      // Unknown ACE type — skip but still record with minimal info
      if (aceSize >= 8) {
        accessMask = buf.readUInt32LE(aceOffset + 4)
      }
    }

    aces.push({ type: aceType, flags: aceFlags, accessMask, sid, objectType, inheritedObjectType })
    aceOffset += aceSize
  }

  return { ownerSid, controlFlags, aces }
}

/**
 * Map an access mask to human-readable right names.
 */
export const accessMaskToRights = (mask: number): string[] => {
  // GENERIC_ALL
  if (mask & 0x10000000) return ['Full Control']

  // Full Control via combination of all specific rights
  if ((mask & 0x000F01FF) === 0x000F01FF) return ['Full Control']

  const rights: string[] = []

  if (mask & 0x80000000) rights.push('Read')
  if (mask & 0x40000000) rights.push('Write')
  if (mask & 0x00010000) rights.push('Delete')
  if (mask & 0x00020000) rights.push('Read Permissions')
  if (mask & 0x00040000) rights.push('Modify Permissions')
  if (mask & 0x00080000) rights.push('Modify Owner')
  if (mask & 0x00000001) rights.push('Create All Child Objects')
  if (mask & 0x00000002) rights.push('Delete All Child Objects')
  if (mask & 0x00000004) rights.push('List Contents')
  if (mask & 0x00000008) rights.push('Read All Properties')
  if (mask & 0x00000010) rights.push('Write All Properties')
  if (mask & 0x00000020) rights.push('All Validated Writes')
  if (mask & 0x00000040) rights.push('Delete Subtree')
  if (mask & 0x00000100) rights.push('All Extended Rights')

  return rights.length > 0 ? rights : ['Special']
}

/**
 * Map ACE flags to a human-readable "applies to" description.
 */
export const aceFlagsToAppliesTo = (flags: number): string => {
  // Mask out INHERITED_ACE (0x10) before checking inheritance scope
  const scope = flags & ~0x10

  switch (scope) {
    case 0x00: return 'This object only'
    case 0x02: return 'This object and all child objects'
    case 0x03: return 'This object and all descendant objects'
    case 0x0A: return 'All child objects'
    case 0x0B: return 'All descendant objects'
    default: return 'This object only'
  }
}

// Well-known SIDs
const WELL_KNOWN_SIDS: Record<string, string> = {
  'S-1-0-0': 'Nobody',
  'S-1-1-0': 'Everyone',
  'S-1-3-0': 'CREATOR OWNER',
  'S-1-3-1': 'CREATOR GROUP',
  'S-1-5-7': 'Anonymous Logon',
  'S-1-5-9': 'Enterprise Domain Controllers',
  'S-1-5-10': 'SELF',
  'S-1-5-11': 'Authenticated Users',
  'S-1-5-18': 'SYSTEM',
  'S-1-5-32-544': 'BUILTIN\\Administrators',
  'S-1-5-32-545': 'BUILTIN\\Users',
  'S-1-5-32-548': 'BUILTIN\\Account Operators',
  'S-1-5-32-549': 'BUILTIN\\Server Operators',
  'S-1-5-32-550': 'BUILTIN\\Print Operators',
  'S-1-5-32-551': 'BUILTIN\\Backup Operators',
}

// Well-known domain RIDs
const WELL_KNOWN_RIDS: Record<number, string> = {
  500: 'Administrator',
  501: 'Guest',
  502: 'krbtgt',
  512: 'Domain Admins',
  513: 'Domain Users',
  514: 'Domain Guests',
  515: 'Domain Computers',
  516: 'Domain Controllers',
  517: 'Cert Publishers',
  518: 'Schema Admins',
  519: 'Enterprise Admins',
  520: 'Group Policy Creator Owners',
  526: 'Key Admins',
  527: 'Enterprise Key Admins',
}

/**
 * Resolve a well-known SID to its display name.
 * Returns null if the SID is not well-known.
 */
export const resolveWellKnownSid = (sid: string): string | null => {
  if (WELL_KNOWN_SIDS[sid]) return WELL_KNOWN_SIDS[sid]

  // Check domain SIDs (S-1-5-21-*) for well-known RIDs
  if (sid.startsWith('S-1-5-21-')) {
    const parts = sid.split('-')
    const rid = parseInt(parts[parts.length - 1], 10)
    if (WELL_KNOWN_RIDS[rid]) return WELL_KNOWN_RIDS[rid]
  }

  return null
}

/**
 * Convert a SID string (e.g., "S-1-5-21-123-456-789") back to binary format.
 */
export const sidStringToBytes = (sid: string): Buffer => {
  const parts = sid.split('-')
  // S-{revision}-{authority}-{sub1}-{sub2}-...
  const revision = parseInt(parts[1], 10)
  const authority = BigInt(parts[2])
  const subAuthorities = parts.slice(3).map(s => parseInt(s, 10))

  const buf = Buffer.alloc(8 + subAuthorities.length * 4)
  buf.writeUInt8(revision, 0)
  buf.writeUInt8(subAuthorities.length, 1)

  // IdentifierAuthority: 6 bytes big-endian
  const authHigh = Number(authority >> BigInt(32))
  const authLow = Number(authority & BigInt(0xFFFFFFFF))
  buf.writeUInt16BE(authHigh, 2)
  buf.writeUInt32BE(authLow, 4)

  for (let i = 0; i < subAuthorities.length; i++) {
    buf.writeUInt32LE(subAuthorities[i], 8 + i * 4)
  }

  return buf
}
