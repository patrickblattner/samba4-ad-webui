import { Client } from 'ldapts'
import type { SearchOptions } from 'ldapts'
import type { Entry } from 'ldapts'

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
        rejectUnauthorized: false,
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
 */
export const search = async (
  client: Client,
  baseDn: string,
  options: SearchOptions,
): Promise<Entry[]> => {
  const result = await client.search(baseDn, options)
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
