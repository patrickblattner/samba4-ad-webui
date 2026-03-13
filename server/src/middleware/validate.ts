import type { Request, Response, NextFunction } from 'express'
import { ZodError, type ZodSchema } from 'zod'

/**
 * Express middleware factory that validates req.body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: err.issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`).join('; '),
          },
        })
        return
      }
      next(err)
    }
  }
}
