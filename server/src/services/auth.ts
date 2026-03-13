import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'
import { encrypt } from './crypto.js'
import { createClient, bindAsUser, search, unbind } from './ldap.js'
import type { LoginResponse, JwtPayload } from '@samba-ad/shared'

/**
 * Extract a string value from an LDAP entry attribute.
 * ldapts may return a string, string[], or undefined.
 */
const attrAsString = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  return fallback
}

/**
 * Extract the domain from the base DN (e.g. "DC=lab,DC=dev" → "lab.dev").
 */
const domainFromBaseDn = (baseDn: string): string => {
  return baseDn
    .split(',')
    .map((part) => part.replace(/^DC=/i, ''))
    .join('.')
}

/**
 * Resolve a username to a bind DN and verify credentials via LDAP bind.
 * Returns user attributes on success.
 */
export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const { url, baseDn } = config.ldap
  const domain = domainFromBaseDn(baseDn)

  // Try UPN bind first (user@domain)
  const upn = username.includes('@') ? username : `${username}@${domain}`
  const client = createClient(url)

  try {
    await bindAsUser(client, upn, password)
  } catch {
    await unbind(client).catch(() => {})
    throw Object.assign(new Error('Invalid credentials'), {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    })
  }

  // Fetch user attributes
  let dn: string
  let displayName: string
  let sAMAccountName: string

  try {
    const entries = await search(client, baseDn, {
      filter: `(userPrincipalName=${upn})`,
      scope: 'sub',
      attributes: ['dn', 'displayName', 'sAMAccountName'],
    })

    if (entries.length === 0) {
      // Fallback: search by sAMAccountName
      const samName = username.includes('@') ? username.split('@')[0] : username
      const fallbackEntries = await search(client, baseDn, {
        filter: `(sAMAccountName=${samName})`,
        scope: 'sub',
        attributes: ['dn', 'displayName', 'sAMAccountName'],
      })

      if (fallbackEntries.length === 0) {
        throw new Error('User not found after successful bind')
      }

      dn = fallbackEntries[0].dn
      displayName = attrAsString(fallbackEntries[0].displayName, samName)
      sAMAccountName = attrAsString(fallbackEntries[0].sAMAccountName, samName)
    } else {
      dn = entries[0].dn
      displayName = attrAsString(entries[0].displayName, username)
      sAMAccountName = attrAsString(entries[0].sAMAccountName, username)
    }
  } finally {
    await unbind(client).catch(() => {})
  }

  // Encrypt credentials for storage in JWT
  const credentialPayload = JSON.stringify({ dn, password })
  const encryptedCredentials = encrypt(credentialPayload, config.crypto.encryptionKey)

  // Build JWT payload
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    dn,
    sAMAccountName,
    displayName,
    encryptedCredentials,
  }

  const signOptions: SignOptions = {
    expiresIn: config.jwt.expiry as SignOptions['expiresIn'],
  }

  const token = jwt.sign(payload, config.jwt.secret, signOptions)

  return {
    token,
    user: { dn, displayName, sAMAccountName },
  }
}

/**
 * Refresh an existing (still valid) token — issue a new one with a fresh expiry.
 */
export const refreshToken = (existingToken: string): { token: string } => {
  const decoded = jwt.verify(existingToken, config.jwt.secret) as JwtPayload

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    dn: decoded.dn,
    sAMAccountName: decoded.sAMAccountName,
    displayName: decoded.displayName,
    encryptedCredentials: decoded.encryptedCredentials,
  }

  const signOptions: SignOptions = {
    expiresIn: config.jwt.expiry as SignOptions['expiresIn'],
  }

  const token = jwt.sign(payload, config.jwt.secret, signOptions)

  return { token }
}
