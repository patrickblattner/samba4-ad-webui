import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
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
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { parentDn, name, sAMAccountName } = req.body

    if (!parentDn || !name || !sAMAccountName) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Fields parentDn, name, and sAMAccountName are required',
        },
      })
      return
    }

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
router.patch('/', requireAuth, async (req, res, next) => {
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
router.post('/move', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string
    const { targetOu } = req.body

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    if (!targetOu) {
      res.status(400).json({
        error: { code: 'MISSING_TARGET', message: 'Field "targetOu" is required' },
      })
      return
    }

    const newDn = await moveComputer(authReq.credentials, dn, targetOu)
    res.json({ dn: newDn })
  } catch (err) {
    next(err)
  }
})

export default router
