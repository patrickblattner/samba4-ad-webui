import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { getTreeChildren } from '../services/tree.js'
import { config } from '../config.js'

const router = Router()

/**
 * GET /api/tree
 * Get root tree nodes (children of baseDn).
 * Query: ?base=<dn> (optional, defaults to config baseDn)
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const baseDn = (req.query.base as string) || config.ldap.baseDn
    const nodes = await getTreeChildren(authReq.credentials, baseDn)
    res.json(nodes)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/tree/children
 * Get children of a specific tree node.
 * Query: ?dn=<parentDn> (required)
 */
router.get('/children', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: {
          code: 'MISSING_DN',
          message: 'dn query parameter is required',
        },
      })
      return
    }

    const nodes = await getTreeChildren(authReq.credentials, dn)
    res.json(nodes)
  } catch (err) {
    next(err)
  }
})

export default router
