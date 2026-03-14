import { Router } from 'express'
import type { TreeNode } from '@samba-ad/shared'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { getTreeChildren } from '../services/tree.js'
import { config } from '../config.js'

const router = Router()

/**
 * GET /api/tree
 * Get domain root node (synthetic node wrapping baseDn).
 * Query: ?base=<dn> (optional, defaults to config baseDn)
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const baseDn = (req.query.base as string) || config.ldap.baseDn

    // Extract domain name from baseDn (e.g. "DC=lab,DC=dev" -> "lab.dev")
    const domainName = baseDn
      .split(',')
      .filter(part => part.trim().toUpperCase().startsWith('DC='))
      .map(part => part.trim().substring(3))
      .join('.')

    const domainRoot: TreeNode = {
      dn: baseDn,
      name: domainName,
      type: 'domain',
      hasChildren: true,
    }

    res.json([domainRoot])
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
