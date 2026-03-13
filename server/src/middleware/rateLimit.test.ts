import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

vi.mock('../config.js', () => ({
  config: {
    rateLimit: {
      writeWindowMs: 60_000,
      writeMax: 3,
      readWindowMs: 60_000,
      readMax: 5,
    },
  },
}))

const { rateLimitByUser, clearRateLimitStore } = await import('./rateLimit.js')

const TEST_DN = 'CN=Administrator,CN=Users,DC=lab,DC=dev'
const TEST_DN_2 = 'CN=TestUser,CN=Users,DC=lab,DC=dev'

function createToken(dn: string): string {
  return jwt.sign({ dn, sAMAccountName: 'testuser' }, 'test-secret', { expiresIn: '15m' })
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    method: 'GET',
    path: '/users',
    ...overrides,
  } as unknown as Request
}

function createMockResponse(): Response & { _headers: Record<string, string | number> } {
  const headers: Record<string, string | number> = {}
  const res = {
    _headers: headers,
    setHeader: vi.fn((name: string, value: string | number) => {
      headers[name] = value
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { _headers: Record<string, string | number> }
  return res
}

describe('rateLimitByUser middleware', () => {
  let next: NextFunction

  beforeEach(() => {
    vi.useFakeTimers()
    clearRateLimitStore()
    next = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests under the read limit', () => {
    const token = createToken(TEST_DN)
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'GET',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }
    expect(next).toHaveBeenCalledTimes(5)
  })

  it('should return 429 when exceeding the write limit', () => {
    const token = createToken(TEST_DN)
    // Exhaust the write limit (3)
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }
    expect(next).toHaveBeenCalledTimes(3)

    // 4th request should be rejected
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    })
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('should return 429 when exceeding the read limit', () => {
    const token = createToken(TEST_DN)
    // Exhaust the read limit (5)
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'GET',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }
    expect(next).toHaveBeenCalledTimes(5)

    // 6th request should be rejected
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'GET',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(next).toHaveBeenCalledTimes(5)
  })

  it('should not rate-limit requests without an authorization header', () => {
    const req = createMockRequest({ method: 'POST' })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should not rate-limit requests with an invalid token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer not-a-valid-jwt' } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should track read and write buckets separately', () => {
    const token = createToken(TEST_DN)

    // Use up all 3 write requests
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }
    expect(next).toHaveBeenCalledTimes(3)

    // Read requests should still work
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'GET',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(4)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should reset the window after windowMs elapses', () => {
    const token = createToken(TEST_DN)

    // Exhaust write limit
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }
    expect(next).toHaveBeenCalledTimes(3)

    // Verify 4th is blocked
    const blockedReq = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
    })
    const blockedRes = createMockResponse()
    rateLimitByUser(blockedReq, blockedRes, next)
    expect(blockedRes.status).toHaveBeenCalledWith(429)

    // Advance time past the window
    vi.advanceTimersByTime(60_001)

    // Should be allowed again
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)
    expect(next).toHaveBeenCalledTimes(4)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should track different users separately', () => {
    const token1 = createToken(TEST_DN)
    const token2 = createToken(TEST_DN_2)

    // Exhaust write limit for user 1
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token1}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }

    // User 2 should still be allowed
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token2}` } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(4)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should set rate limit headers correctly', () => {
    const token = createToken(TEST_DN)
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'GET',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5)
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4)
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number))
  })

  it('should set Retry-After header on 429 response', () => {
    const token = createToken(TEST_DN)

    // Exhaust write limit
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number))
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('should reset state when clearRateLimitStore is called', () => {
    const token = createToken(TEST_DN)

    // Exhaust write limit
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` } as any,
        method: 'POST',
      })
      const res = createMockResponse()
      rateLimitByUser(req, res, next)
    }

    // Clear store
    clearRateLimitStore()

    // Should be allowed again
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(4)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should skip /auth paths', () => {
    const token = createToken(TEST_DN)
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` } as any,
      method: 'POST',
      path: '/auth/login',
    })
    const res = createMockResponse()
    rateLimitByUser(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.setHeader).not.toHaveBeenCalled()
  })

  it('should treat DELETE and PATCH as write operations', () => {
    const token = createToken(TEST_DN)

    for (const method of ['DELETE', 'PATCH', 'PUT']) {
      clearRateLimitStore()
      const callsBefore = (next as any).mock.calls.length

      // Exhaust write limit (3)
      for (let i = 0; i < 4; i++) {
        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` } as any,
          method,
        })
        const res = createMockResponse()
        rateLimitByUser(req, res, next)

        if (i === 3) {
          expect(res.status).toHaveBeenCalledWith(429)
        }
      }

      // Only 3 should have passed through (not the 4th)
      expect((next as any).mock.calls.length - callsBefore).toBe(3)
    }
  })
})
