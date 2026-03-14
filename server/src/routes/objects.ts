import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { protectionSchema } from '../schemas.js'
import { listObjects, getObjectInfo, setObjectProtection, getObjectSecurity } from '../services/objects.js'
import { config } from '../config.js'

const router = Router()

/**
 * GET /api/objects
 * List objects in a container with pagination.
 * Query: ?base=<dn>&type=user|group|computer|all&page=1&pageSize=50
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const baseDn = (req.query.base as string) || config.ldap.baseDn
    const type = (req.query.type as string) || 'all'
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50))

    const result = await listObjects(authReq.credentials, baseDn, type, page, pageSize)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/objects/info?dn=<dn>
 * Fetch object info for the Object tab.
 */
router.get('/info', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    const info = await getObjectInfo(authReq.credentials, dn)
    res.json(info)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/objects/security?dn=<dn>
 * Fetch security descriptor for the Security tab.
 */
router.get('/security', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    const security = await getObjectSecurity(authReq.credentials, dn)
    res.json(security)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/objects/protection?dn=<dn>
 * Set or remove accidental deletion protection.
 */
router.post('/protection', requireAuth, validateBody(protectionSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await setObjectProtection(authReq.credentials, dn, req.body.protected)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
