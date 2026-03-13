import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { listObjects } from '../services/objects.js'
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

export default router
