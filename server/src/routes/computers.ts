import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createComputerSchema, updateComputerSchema, moveSchema } from '../schemas.js'
import {
  getComputer,
  createComputer,
  updateComputer,
  deleteComputer,
  moveComputer,
} from '../services/computers.js'

const router = Router()

/**
 * GET /api/computers?dn=<dn>
 * Fetch a single computer by DN.
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

    const computer = await getComputer(authReq.credentials, dn)
    res.json(computer)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/computers
 * Create (pre-stage) a new computer account.
 */
router.post('/', requireAuth, validateBody(createComputerSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = await createComputer(authReq.credentials, req.body)
    res.status(201).json({ dn })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/computers?dn=<dn>
 * Update computer attributes.
 */
router.patch('/', requireAuth, validateBody(updateComputerSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await updateComputer(authReq.credentials, dn, req.body)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/computers?dn=<dn>
 * Delete a computer.
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

    await deleteComputer(authReq.credentials, dn)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/computers/move?dn=<dn>
 * Move a computer to a different OU/container.
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

    const newDn = await moveComputer(authReq.credentials, dn, req.body.targetOu)
    res.json({ dn: newDn })
  } catch (err) {
    next(err)
  }
})

export default router
