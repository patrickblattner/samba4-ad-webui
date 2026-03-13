import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60_000

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now >= entry.resetTime) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

// Allow Node to exit without waiting for this interval
cleanupInterval.unref()

/** Clear the rate limit store (for testing) */
export function clearRateLimitStore(): void {
  store.clear()
}

// Generous limit for unauthenticated/invalid-token requests per IP
const UNAUTH_MAX = 200
const UNAUTH_WINDOW_MS = 60_000

/**
 * Per-user rate limiting middleware.
 * Uses the user DN from a verified JWT to track request counts in separate
 * "read" and "write" buckets with fixed time windows.
 * Falls back to IP-based rate limiting for unauthenticated or invalid-token requests.
 */
export function rateLimitByUser(req: Request, res: Response, next: NextFunction): void {
  // Skip /auth paths
  if (req.path.startsWith('/auth')) {
    next()
    return
  }

  // Extract and verify user DN from JWT
  const authHeader = req.headers.authorization
  let userDn: string | null = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const verified = jwt.verify(token, config.jwt.secret) as { dn?: string }
      if (verified && verified.dn) {
        userDn = verified.dn
      }
    } catch {
      // Invalid/expired token — fall through to IP-based limiting
    }
  }

  const method = req.method.toUpperCase()
  const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE' || method === 'PUT'

  let key: string
  let windowMs: number
  let maxRequests: number

  if (userDn) {
    // Authenticated: per-user bucket
    const bucket = isWrite ? 'write' : 'read'
    key = `${userDn}:${bucket}`
    windowMs = isWrite ? config.rateLimit.writeWindowMs : config.rateLimit.readWindowMs
    maxRequests = isWrite ? config.rateLimit.writeMax : config.rateLimit.readMax
  } else {
    // Unauthenticated or invalid token: IP-based bucket
    const ip = req.ip || 'unknown'
    key = `${ip}:unauth`
    windowMs = UNAUTH_WINDOW_MS
    maxRequests = UNAUTH_MAX
  }

  const now = Date.now()
  let entry = store.get(key)

  // If no entry or window expired, start a new window
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, maxRequests - entry.count)
  const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests)
  res.setHeader('X-RateLimit-Remaining', remaining)
  res.setHeader('X-RateLimit-Reset', resetSeconds)

  if (entry.count > maxRequests) {
    res.setHeader('Retry-After', resetSeconds)
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    })
    return
  }

  next()
}
