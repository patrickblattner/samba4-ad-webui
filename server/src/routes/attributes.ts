import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { updateAttributesSchema } from '../schemas.js'
import { getAttributes, updateAttributes } from '../services/attributes.js'

const router = Router()

/**
 * GET /api/attributes?dn=<dn>
 * Fetch all attributes of an LDAP object.
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

    const attributes = await getAttributes(authReq.credentials, dn)
    res.json({ attributes })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/attributes?dn=<dn>
 * Apply attribute modifications to an LDAP object.
 */
router.patch('/', requireAuth, validateBody(updateAttributesSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await updateAttributes(authReq.credentials, dn, req.body.changes)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
