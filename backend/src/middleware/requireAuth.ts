
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthenticatedRequest extends Request {
  userId?: string
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      message: 'Authentication token is required',
    })
    return
  }

  const token = authHeader.slice('Bearer '.length)
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    res.status(500).json({
      message: 'Authentication is not configured',
    })
    return
  }

  try {
    const payload = jwt.verify(token, jwtSecret)

    if (
      typeof payload === 'string' ||
      typeof payload.userId !== 'string'
    ) {
      res.status(401).json({
        message: 'Invalid authentication token',
      })
      return
    }

    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({
      message: 'Invalid or expired authentication token',
    })
  }
}