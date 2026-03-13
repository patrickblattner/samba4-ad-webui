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

/**
 * Per-user rate limiting middleware.
 * Uses the user DN from the JWT to track request counts in separate
 * "read" and "write" buckets with fixed time windows.
 */
export function rateLimitByUser(req: Request, res: Response, next: NextFunction): void {
  // Skip /auth paths
  if (req.path.startsWith('/auth')) {
    next()
    return
  }

  // Extract user DN from JWT (decode only, auth middleware handles verification)
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  let decoded: { dn?: string } | null = null
  try {
    decoded = jwt.decode(token) as { dn?: string } | null
  } catch {
    next()
    return
  }

  if (!decoded || !decoded.dn) {
    next()
    return
  }

  const userDn = decoded.dn
  const method = req.method.toUpperCase()

  // Determine bucket and limits
  const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE' || method === 'PUT'
  const bucket = isWrite ? 'write' : 'read'
  const windowMs = isWrite ? config.rateLimit.writeWindowMs : config.rateLimit.readWindowMs
  const maxRequests = isWrite ? config.rateLimit.writeMax : config.rateLimit.readMax

  const key = `${userDn}:${bucket}`
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
