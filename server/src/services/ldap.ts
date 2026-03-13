import { Client } from 'ldapts'
import type { SearchOptions } from 'ldapts'
import type { Entry } from 'ldapts'
import { readFileSync } from 'fs'
import { config } from '../config.js'

export type { Entry, SearchOptions }

/**
 * Create a new ldapts Client for the given LDAP URL.
 */
export const createClient = (url: string): Client => {
  const isLdaps = url.startsWith('ldaps://')
  return new Client({
    url,
    ...(isLdaps && {
      tlsOptions: {
        rejectUnauthorized: config.ldap.tlsRejectUnauthorized,
        ...(config.ldap.caCertPath && {
          ca: [readFileSync(config.ldap.caCertPath)],
        }),
      },
    }),
  })
}

/**
 * Bind (authenticate) as the given DN with a password.
 */
export const bindAsUser = async (
  client: Client,
  dn: string,
  password: string,
): Promise<void> => {
  await client.bind(dn, password)
}

/**
 * Search the directory and return matching entries.
 * Uses LDAP paged results control by default to handle
 * directories with more entries than the server size limit.
 */
export const search = async (
  client: Client,
  baseDn: string,
  options: SearchOptions,
): Promise<Entry[]> => {
  // Enable paging by default for searches that may return many results.
  // 'base' scope returns at most 1 entry, so no paging needed.
  const shouldPage = options.scope !== 'base' && options.paged === undefined
  const searchOptions = shouldPage
    ? { ...options, paged: { pageSize: 200 } }
    : options

  const result = await client.search(baseDn, searchOptions)
  return result.searchEntries
}

/**
 * Unbind (close) the LDAP connection.
 */
export const unbind = async (client: Client): Promise<void> => {
  await client.unbind()
}

/**
 * Create a client, bind with credentials, and return it.
 * Caller is responsible for calling unbind when done.
 */
export const createBoundClient = async (
  url: string,
  dn: string,
  password: string,
): Promise<Client> => {
  const client = createClient(url)
  await bindAsUser(client, dn, password)
  return client
}
