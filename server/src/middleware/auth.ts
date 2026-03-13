import type { RequestHandler, Request } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { decrypt } from '../services/crypto.js'
import type { JwtPayload } from '@samba-ad/shared'

export interface AuthenticatedRequest extends Request {
  user: {
    dn: string
    sAMAccountName: string
    displayName: string
  }
  credentials: {
    dn: string
    password: string
  }
}

/**
 * Express middleware that verifies a Bearer JWT token,
 * decrypts the embedded AD credentials, and attaches
 * user info + credentials to the request object.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required',
      },
    })
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

    // Decrypt AD credentials from JWT payload
    const credentialJson = decrypt(
      decoded.encryptedCredentials,
      config.crypto.encryptionKey,
    )
    const credentials = JSON.parse(credentialJson) as {
      dn: string
      password: string
    }

    // Attach to request
    const authReq = req as AuthenticatedRequest
    authReq.user = {
      dn: decoded.dn,
      sAMAccountName: decoded.sAMAccountName,
      displayName: decoded.displayName,
    }
    authReq.credentials = credentials

    next()
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'Token has expired'
        : 'Invalid token'

    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message,
      },
    })
  }
}
