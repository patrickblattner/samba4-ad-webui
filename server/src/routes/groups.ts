import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createGroupSchema, updateGroupSchema, membersSchema, moveSchema } from '../schemas.js'
import {
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMembers,
  moveGroup,
} from '../services/groups.js'

const router = Router()

/**
 * GET /api/groups?dn=<dn>
 * Fetch a single group by DN.
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

    const group = await getGroup(authReq.credentials, dn)
    res.json(group)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/groups
 * Create a new group.
 */
router.post('/', requireAuth, validateBody(createGroupSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = await createGroup(authReq.credentials, req.body)
    res.status(201).json({ dn })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/groups?dn=<dn>
 * Update group attributes.
 */
router.patch('/', requireAuth, validateBody(updateGroupSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await updateGroup(authReq.credentials, dn, req.body)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/groups?dn=<dn>
 * Delete a group.
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

    await deleteGroup(authReq.credentials, dn)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/groups/members?dn=<dn>
 * Add members to a group.
 */
router.post('/members', requireAuth, validateBody(membersSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await addMembers(authReq.credentials, dn, req.body.members)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/groups/members?dn=<dn>
 * Remove members from a group.
 */
router.delete('/members', requireAuth, validateBody(membersSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const dn = req.query.dn as string

    if (!dn) {
      res.status(400).json({
        error: { code: 'MISSING_DN', message: 'Query parameter "dn" is required' },
      })
      return
    }

    await removeMembers(authReq.credentials, dn, req.body.members)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/groups/move?dn=<dn>
 * Move a group to a different OU/container.
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

    const newDn = await moveGroup(authReq.credentials, dn, req.body.targetOu)
    res.json({ dn: newDn })
  } catch (err) {
    next(err)
  }
})

export default router
