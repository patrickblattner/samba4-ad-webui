import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createOuSchema, updateOuSchema, renameOuSchema } from '../schemas.js'
import { createOu, updateOu, deleteOu, renameOu } from '../services/ous.js'

const router = Router()

/**
 * POST /api/ous
 * Create a new Organizational Unit.
 */
router.post('/', requireAuth, validateBody(createOuSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { name, parentDn, description } = req.body
    const dn = await createOu(authReq.credentials, name, parentDn, description)
    res.status(201).json({ dn })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/ous?dn=<dn>
 * Update an OU's attributes.
 */
router.patch('/', requireAuth, validateBody(updateOuSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await updateOu(authReq.credentials, dn, req.body.description)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/ous?dn=<dn>&recursive=false
 * Delete an OU.
 */
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string
    const recursive = req.query.recursive === 'true'

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await deleteOu(authReq.credentials, dn, recursive)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/ous/rename?dn=<dn>
 * Rename an OU.
 */
router.post('/rename', requireAuth, validateBody(renameOuSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    const newDn = await renameOu(authReq.credentials, dn, req.body.newName)
    res.json({ newDn })
  } catch (err) {
    next(err)
  }
})

export default router
