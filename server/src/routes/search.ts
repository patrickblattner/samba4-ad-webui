import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { searchObjects } from '../services/search.js'

const router = Router()

/**
 * GET /api/search
 * Search objects across the directory subtree.
 * Query: ?q=<term>&type=user|group|computer|all&page=1&pageSize=50
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const q = (req.query.q as string) || ''
    const type = (req.query.type as string) || 'all'
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50))

    if (!q.trim()) {
      res.json({ data: [], total: 0, page: 1, pageSize, totalPages: 0 })
      return
    }

    const result = await searchObjects(authReq.credentials, q.trim(), type, page, pageSize)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
