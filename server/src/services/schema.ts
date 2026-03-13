import { Client } from 'ldapts'
import { search } from './ldap.js'
import { config } from '../config.js'

// Module-level cache: sorted objectClass key -> attribute names
const schemaCache = new Map<string, string[]>()

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
