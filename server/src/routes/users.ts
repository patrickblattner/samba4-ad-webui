import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createUserSchema, updateUserSchema, passwordResetSchema, moveSchema } from '../schemas.js'
import {
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  enableUser,
  disableUser,
  moveUser,
} from '../services/users.js'

const router = Router()

/**
 * GET /api/users?dn=<dn>
 * Fetch a single user by DN.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    const user = await getUser(authReq.credentials, dn)
    res.json(user)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/users
 * Create a new user.
 */
router.post('/', requireAuth, validateBody(createUserSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = await createUser(authReq.credentials, req.body)
    res.status(201).json({ dn })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/users?dn=<dn>
 * Update user attributes.
 */
router.patch('/', requireAuth, validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await updateUser(authReq.credentials, dn, req.body)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/users?dn=<dn>
 * Delete a user.
 */
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await deleteUser(authReq.credentials, dn)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/users/password?dn=<dn>
 * Reset a user's password.
 */
router.post('/password', requireAuth, validateBody(passwordResetSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await resetPassword(authReq.credentials, dn, req.body.newPassword)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/users/enable?dn=<dn>
 * Enable a user account.
 */
router.post('/enable', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await enableUser(authReq.credentials, dn)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/users/disable?dn=<dn>
 * Disable a user account.
 */
router.post('/disable', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await disableUser(authReq.credentials, dn)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/users/move?dn=<dn>
 * Move a user to a different OU/container.
 */
router.post('/move', requireAuth, validateBody(moveSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    const newDn = await moveUser(authReq.credentials, dn, req.body.targetOu)
    res.json({ dn: newDn })
  } catch (err) {
    next(err)
  }
})

export default router
