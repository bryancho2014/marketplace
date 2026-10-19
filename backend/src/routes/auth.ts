
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import type { Request } from 'express'

import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

interface AuthenticatedRequest extends Request {
  userId?: string
}

const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof displayName !== 'string'
    ) {
      res.status(400).json({
        message: 'email, password, and displayName are required',
      })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedDisplayName = displayName.trim()

    if (
      !normalizedEmail ||
      !normalizedDisplayName ||
      password.length < 8
    ) {
      res.status(400).json({
        message:
          'Email and display name are required; password must be at least 8 characters',
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [normalizedEmail, passwordHash, normalizedDisplayName],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      res.status(409).json({
        message: 'An account with this email already exists',
      })
      return
    }

    console.error('Registration failed:', error)
    res.status(500).json({
      message: 'Registration failed',
    })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: 'Email and password are required',
      })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    const result = await pool.query(
      `SELECT id, email, display_name, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    )

    const user = result.rows[0]

    if (!user) {
      res.status(401).json({
        message: 'Invalid email or password',
      })
      return
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    )

    if (!passwordMatches) {
      res.status(401).json({
        message: 'Invalid email or password',
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured')
    }

    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: '1h' },
    )

    res.status(200).json({
      token,
      id: user.id,
      email: user.email,
      display_name: user.display_name,
    })
  } catch (error) {
    console.error('Login failed:', error)
    res.status(500).json({
      message: 'Login failed',
    })
  }
})

authRouter.get(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, display_name, created_at
         FROM users
         WHERE id = $1`,
        [req.userId],
      )

      const user = result.rows[0]

      if (!user) {
        res.status(401).json({
          message: 'User no longer exists',
        })
        return
      }

      res.json(user)
    } catch (error) {
      console.error('Failed to fetch authenticated user:', error)
      res.status(500).json({
        message: 'Failed to fetch user',
      })
    }
  },
)

export default authRouter