import { Client } from 'ldapts'
import type { AttributeSyntaxType } from '@samba-ad/shared'
import { search } from './ldap.js'
import { config } from '../config.js'

// Module-level cache: sorted objectClass key -> attribute names
const schemaCache = new Map<string, string[]>()

export interface FullAttributeMetadata {
  isSingleValued: boolean
  syntax: AttributeSyntaxType
  isSystemOnly: boolean
  isConstructed: boolean
}

// Cache for attribute metadata: lDAPDisplayName (lowercase) -> FullAttributeMetadata
const attributeMetadataCache = new Map<string, FullAttributeMetadata>()

/** Non-editable syntax types */
const NON_EDITABLE_SYNTAXES = new Set<AttributeSyntaxType>([
  'securityDescriptor', 'sid', 'dnBinary',
])

/** Map attributeSyntax OID + oMSyntax to our syntax type */
function resolveAttributeSyntax(attributeSyntax: string, oMSyntax: number): AttributeSyntaxType {
  // For oMSyntax 127, the OID distinguishes the subtypes
  if (oMSyntax === 127) {
    if (attributeSyntax === '2.5.5.1') return 'dn'
    if (attributeSyntax === '2.5.5.7') return 'dnBinary'
    if (attributeSyntax === '2.5.5.14') return 'dnString'
    return 'dn' // fallback for unknown 127 variants
  }

  const key = `${attributeSyntax}|${oMSyntax}`
  const map: Record<string, AttributeSyntaxType> = {
    '2.5.5.12|64': 'string',       // Unicode String
    '2.5.5.4|20': 'string',        // Case-Insensitive String
    '2.5.5.5|19': 'string',        // Printable String
    '2.5.5.5|22': 'string',        // IA5 String
    '2.5.5.6|18': 'numericString', // Numeric String
    '2.5.5.9|2': 'integer',        // Integer
    '2.5.5.16|65': 'largeInteger', // Large Integer (Int8)
    '2.5.5.8|1': 'boolean',        // Boolean
    '2.5.5.10|4': 'octetString',   // Octet String
    '2.5.5.15|66': 'securityDescriptor', // NT Security Descriptor
    '2.5.5.11|23': 'generalizedTime',   // Generalized Time
    '2.5.5.11|24': 'generalizedTime',   // UTC Time
    '2.5.5.17|4': 'sid',           // SID
  }
  return map[key] ?? 'string'
}

export function isAttributeReadOnly(meta: FullAttributeMetadata): boolean {
  return meta.isSystemOnly || meta.isConstructed || NON_EDITABLE_SYNTAXES.has(meta.syntax)
}

/**
 * Get all allowed attribute names for a set of objectClasses by querying the AD schema.
 * Results are cached per process (schema is the same for all users).
 */
export async function getSchemaAttributes(client: Client, objectClasses: string[]): Promise<string[]> {
  const cacheKey = objectClasses.map(c => c.toLowerCase()).sort().join(',')
  const cached = schemaCache.get(cacheKey)
  if (cached) return cached

  const schemaDn = `CN=Schema,CN=Configuration,${config.ldap.baseDn}`
  const visited = new Set<string>()
  const allAttributes = new Set<string>()

  for (const className of objectClasses) {
    const attrs = await resolveClassAttributes(client, schemaDn, className, visited)
    for (const attr of attrs) {
      allAttributes.add(attr)
    }
  }

  const result = Array.from(allAttributes).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  schemaCache.set(cacheKey, result)
  return result
}

async function resolveClassAttributes(
  client: Client,
  schemaDn: string,
  className: string,
  visited: Set<string>,
): Promise<string[]> {
  const classLower = className.toLowerCase()
  if (visited.has(classLower) || !className) return []
  visited.add(classLower)

  const entries = await search(client, schemaDn, {
    scope: 'sub',
    filter: `(&(objectClass=classSchema)(lDAPDisplayName=${className}))`,
    attributes: [
      'mustContain', 'systemMustContain',
      'mayContain', 'systemMayContain',
      'subClassOf',
      'auxiliaryClass', 'systemAuxiliaryClass',
    ],
  })

  if (entries.length === 0) return []

  const entry = entries[0] as unknown as Record<string, unknown>
  const attributes: string[] = []

  // Collect attribute names from must/may contain
  for (const field of ['mustContain', 'systemMustContain', 'mayContain', 'systemMayContain']) {
    const val = entry[field]
    if (!val) continue
    if (Array.isArray(val)) {
      attributes.push(...val.map(String))
    } else {
      attributes.push(String(val))
    }
  }

  // Walk superclass chain
  const superClass = entry['subClassOf']
  if (superClass && String(superClass).toLowerCase() !== classLower) {
    const inherited = await resolveClassAttributes(client, schemaDn, String(superClass), visited)
    attributes.push(...inherited)
  }

  // Walk auxiliary classes
  for (const auxField of ['auxiliaryClass', 'systemAuxiliaryClass']) {
    const auxVal = entry[auxField]
    if (!auxVal) continue
    const auxClasses = Array.isArray(auxVal) ? auxVal.map(String) : [String(auxVal)]
    for (const auxClass of auxClasses) {
      const auxAttrs = await resolveClassAttributes(client, schemaDn, auxClass, visited)
      attributes.push(...auxAttrs)
    }
  }

  return attributes
}

/**
 * Get full attribute metadata for a list of attribute names.
 * Queries attributeSchema objects from the schema partition.
 * Results are cached globally (schema is the same for all users).
 */
export async function getAttributeMetadata(
  client: Client,
  attributeNames: string[],
): Promise<Map<string, FullAttributeMetadata>> {
  const result = new Map<string, FullAttributeMetadata>()
  const uncached: string[] = []

  // Check cache first
  for (const name of attributeNames) {
    const cached = attributeMetadataCache.get(name.toLowerCase())
    if (cached !== undefined) {
      result.set(name, cached)
    } else {
      uncached.push(name)
    }
  }

  if (uncached.length === 0) return result

  // Batch query: fetch all attributeSchema objects at once
  const schemaDn = `CN=Schema,CN=Configuration,${config.ldap.baseDn}`

  // Query all attributeSchema objects with full metadata
  // We do a single broad search and filter client-side (more efficient than N individual searches)
  const entries = await search(client, schemaDn, {
    scope: 'sub',
    filter: '(objectClass=attributeSchema)',
    attributes: ['lDAPDisplayName', 'isSingleValued', 'attributeSyntax', 'oMSyntax', 'systemOnly', 'searchFlags'],
  })

  // Build lookup from schema
  const schemaLookup = new Map<string, FullAttributeMetadata>()
  for (const entry of entries) {
    const raw = entry as unknown as Record<string, unknown>
    const ldapName = raw['lDAPDisplayName']
    if (!ldapName) continue

    const isSingle = String(raw['isSingleValued']).toUpperCase() === 'TRUE'
    const attrSyntaxOid = String(raw['attributeSyntax'] ?? '2.5.5.12')
    const omSyntax = parseInt(String(raw['oMSyntax'] ?? '64'), 10) || 64
    const systemOnly = String(raw['systemOnly']).toUpperCase() === 'TRUE'
    const searchFlagsVal = parseInt(String(raw['searchFlags'] ?? '0'), 10) || 0
    const isConstructed = (searchFlagsVal & 0x10) !== 0

    const syntax = resolveAttributeSyntax(attrSyntaxOid, omSyntax)
    const meta: FullAttributeMetadata = { isSingleValued: isSingle, syntax, isSystemOnly: systemOnly, isConstructed }
    schemaLookup.set(String(ldapName).toLowerCase(), meta)
  }

  // Populate cache and results for uncached attributes
  const defaultMeta: FullAttributeMetadata = { isSingleValued: true, syntax: 'string', isSystemOnly: false, isConstructed: false }
  for (const name of uncached) {
    const meta = schemaLookup.get(name.toLowerCase()) ?? defaultMeta
    attributeMetadataCache.set(name.toLowerCase(), meta)
    result.set(name, meta)
  }

  return result
}
