import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { encrypt } from '../services/crypto.js'

// Mock config before importing the middleware
vi.mock('../config.js', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      expiry: '15m',
    },
    crypto: {
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  },
}))

// Import after mocks are set up
const { requireAuth } = await import('./auth.js')

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const TEST_SECRET = 'test-secret'

const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

const createMockRequest = (authHeader?: string) => {
  return {
    headers: {
      authorization: authHeader,
    },
  } as unknown as Request
}

const createValidToken = () => {
  const credentials = JSON.stringify({
    dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
    password: 'Admin1234!',
  })
  const encryptedCredentials = encrypt(credentials, TEST_KEY)

  return jwt.sign(
    {
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      sAMAccountName: 'Administrator',
      displayName: 'Administrator',
      encryptedCredentials,
    },
    TEST_SECRET,
    { expiresIn: '15m' },
  )
}

describe('requireAuth middleware', () => {
  let next: NextFunction

  beforeEach(() => {
    next = vi.fn()
  })

  it('should return 401 when no authorization header is present', () => {
    const req = createMockRequest()
    const res = createMockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required',
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 401 when authorization header does not start with Bearer', () => {
    const req = createMockRequest('Basic abc123')
    const res = createMockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 401 for an invalid token', () => {
    const req = createMockRequest('Bearer invalid-token')
    const res = createMockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 401 for an expired token', () => {
    const credentials = JSON.stringify({
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      password: 'Admin1234!',
    })
    const encryptedCredentials = encrypt(credentials, TEST_KEY)

    const expiredToken = jwt.sign(
      {
        dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
        sAMAccountName: 'Administrator',
        displayName: 'Administrator',
        encryptedCredentials,
      },
      TEST_SECRET,
      { expiresIn: '-1s' },
    )

    const req = createMockRequest(`Bearer ${expiredToken}`)
    const res = createMockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token has expired',
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next and attach user/credentials for a valid token', () => {
    const token = createValidToken()
    const req = createMockRequest(`Bearer ${token}`)
    const res = createMockResponse()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect((req as any).user).toEqual({
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      sAMAccountName: 'Administrator',
      displayName: 'Administrator',
    })
    expect((req as any).credentials).toEqual({
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      password: 'Admin1234!',
    })
  })
})
