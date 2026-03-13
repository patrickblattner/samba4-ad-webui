import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, refreshToken } from '../services/auth.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { loginSchema, refreshSchema } from '../schemas.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts, please try again after 15 minutes',
    },
  },
})

/**
 * POST /api/auth/login
 * Authenticate with username + password, returns JWT token + user info.
 */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body
    const result = await login(username, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/refresh
 * Issue a new token from an existing valid token.
 */
router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const { token } = req.body
    const result = await refreshToken(token)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/auth/me
 * Returns user info from the JWT (protected route).
 */
router.get('/me', requireAuth, (req, res) => {
  const authReq = req as AuthenticatedRequest
  res.json({ user: authReq.user })
})

export default router
