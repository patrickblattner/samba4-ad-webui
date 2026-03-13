import type { Request, Response, NextFunction } from 'express'
import { isValidDn } from '../utils/ldapEscape.js'

/**
 * Express middleware that validates DN parameters from query string.
 * Checks `dn` and `base` query parameters if present.
 */
export function validateDn(req: Request, res: Response, next: NextFunction): void {
  const dn = req.query.dn as string | undefined
  const base = req.query.base as string | undefined

  if (dn !== undefined && !isValidDn(dn)) {
    res.status(400).json({
      error: {
        code: 'INVALID_DN',
        message: 'Invalid Distinguished Name format',
      },
    })
    return
  }

  if (base !== undefined && !isValidDn(base)) {
    res.status(400).json({
      error: {
        code: 'INVALID_DN',
        message: 'Invalid Distinguished Name format for base parameter',
      },
    })
    return
  }

  next()
}
