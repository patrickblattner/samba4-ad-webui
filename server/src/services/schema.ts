import { Client } from 'ldapts'
import { search } from './ldap.js'
import { config } from '../config.js'

// Module-level cache: sorted objectClass key -> attribute names
const schemaCache = new Map<string, string[]>()

// Cache for attribute metadata: lDAPDisplayName (lowercase) -> isSingleValued
const attributeMetadataCache = new Map<string, boolean>()

export interface AttributeMetadata {
  name: string
  isSingleValued: boolean
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
 * Get isSingleValued metadata for a list of attribute names.
 * Queries attributeSchema objects from the schema partition.
 * Results are cached globally (schema is the same for all users).
 */
export async function getAttributeMetadata(
  client: Client,
  attributeNames: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
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

  // Query all attributeSchema objects with isSingleValued
  // We do a single broad search and filter client-side (more efficient than N individual searches)
  const entries = await search(client, schemaDn, {
    scope: 'sub',
    filter: '(objectClass=attributeSchema)',
    attributes: ['lDAPDisplayName', 'isSingleValued'],
  })

  // Build lookup from schema
  const schemaLookup = new Map<string, boolean>()
  for (const entry of entries) {
    const raw = entry as unknown as Record<string, unknown>
    const ldapName = raw['lDAPDisplayName']
    const singleValued = raw['isSingleValued']
    if (ldapName) {
      const isSingle = String(singleValued).toUpperCase() === 'TRUE'
      schemaLookup.set(String(ldapName).toLowerCase(), isSingle)
    }
  }

  // Populate cache and results for uncached attributes
  for (const name of uncached) {
    const isSingle = schemaLookup.get(name.toLowerCase()) ?? true // default to single-valued if unknown
    attributeMetadataCache.set(name.toLowerCase(), isSingle)
    result.set(name, isSingle)
  }

  return result
}
