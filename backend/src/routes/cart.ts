
import { Router, type Request, type Response } from 'express'

import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

interface AuthenticatedRequest extends Request {
  userId?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidQuantity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function getUserId(req: AuthenticatedRequest): string | undefined {
  return req.userId
}

// GET /api/cart
router.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req)

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    try {
      const result = await pool.query(
        `
          SELECT
            ci.product_id,
            ci.quantity,
            p.name,
            p.description,
            p.price,
            p.stock_quantity,
            p.status
          FROM carts c
          JOIN cart_items ci ON ci.cart_id = c.id
          JOIN products p ON p.id = ci.product_id
          WHERE c.user_id = $1
          ORDER BY p.name ASC
        `,
        [userId],
      )

      const items = result.rows.map((row) => ({
        product_id: row.product_id,
        name: row.name,
        description: row.description,
        price: row.price,
        quantity: row.quantity,
        stock_quantity: row.stock_quantity,
        status: row.status,
        subtotal: Number(row.price) * Number(row.quantity),
      }))

      const total = items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      )

      res.json({ items, total })
    } catch (error) {
      console.error('Failed to retrieve cart:', error)
      res.status(500).json({ message: 'Failed to retrieve cart' })
    }
  },
)

// POST /api/cart/items
router.post(
  '/items',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req)

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    const { product_id: productId, quantity = 1 } = req.body ?? {}

    if (
      typeof productId !== 'string' ||
      !UUID_PATTERN.test(productId)
    ) {
      res.status(400).json({ message: 'Invalid product ID' })
      return
    }

    if (!isValidQuantity(quantity)) {
      res.status(400).json({
        message: 'Quantity must be a positive integer',
      })
      return
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const productResult = await client.query(
        `
          SELECT id, stock_quantity
          FROM products
          WHERE id = $1 AND status = 'active'
          FOR UPDATE
        `,
        [productId],
      )

      if (productResult.rowCount === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({
          message: 'Product not found or unavailable',
        })
        return
      }

      const product = productResult.rows[0]

      await client.query(
        `
          INSERT INTO carts (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [userId],
      )

      const cartResult = await client.query(
        'SELECT id FROM carts WHERE user_id = $1',
        [userId],
      )

      const cartId = cartResult.rows[0].id

      const existingResult = await client.query(
        `
          SELECT quantity
          FROM cart_items
          WHERE cart_id = $1 AND product_id = $2
        `,
        [cartId, productId],
      )

      const currentQuantity =
        existingResult.rows.length > 0
          ? Number(existingResult.rows[0].quantity)
          : 0

      const newQuantity = currentQuantity + quantity

      if (newQuantity > Number(product.stock_quantity)) {
        await client.query('ROLLBACK')
        res.status(400).json({
          message: 'Requested quantity exceeds available stock',
        })
        return
      }

      await client.query(
        `
          INSERT INTO cart_items (cart_id, product_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (cart_id, product_id)
          DO UPDATE SET quantity = EXCLUDED.quantity
        `,
        [cartId, productId, newQuantity],
      )

      await client.query('COMMIT')

      res.status(200).json({
        message: 'Product added to cart',
        product_id: productId,
        quantity: newQuantity,
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      console.error('Failed to add product to cart:', error)
      res.status(500).json({ message: 'Failed to add product to cart' })
    } finally {
      client.release()
    }
  },
)

// PATCH /api/cart/items/:productId
router.patch(
  '/items/:productId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req)
    const productId = req.params.productId
    const { quantity } = req.body ?? {}

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (
      typeof productId !== 'string' ||
      !UUID_PATTERN.test(productId)
    ) {
      res.status(400).json({ message: 'Invalid product ID' })
      return
    }

    if (!isValidQuantity(quantity)) {
      res.status(400).json({
        message: 'Quantity must be a positive integer',
      })
      return
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const productResult = await client.query(
        `
          SELECT stock_quantity
          FROM products
          WHERE id = $1 AND status = 'active'
          FOR UPDATE
        `,
        [productId],
      )

      if (productResult.rowCount === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({
          message: 'Product not found or unavailable',
        })
        return
      }

      if (quantity > Number(productResult.rows[0].stock_quantity)) {
        await client.query('ROLLBACK')
        res.status(400).json({
          message: 'Requested quantity exceeds available stock',
        })
        return
      }

      const result = await client.query(
        `
          UPDATE cart_items ci
          SET quantity = $1
          FROM carts c
          WHERE ci.cart_id = c.id
            AND c.user_id = $2
            AND ci.product_id = $3
          RETURNING ci.product_id, ci.quantity
        `,
        [quantity, userId, productId],
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({ message: 'Cart item not found' })
        return
      }

      await client.query('COMMIT')
      res.json(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      console.error('Failed to update cart item:', error)
      res.status(500).json({ message: 'Failed to update cart item' })
    } finally {
      client.release()
    }
  },
)

// DELETE /api/cart/items/:productId
router.delete(
  '/items/:productId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req)
    const productId = req.params.productId

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (
      typeof productId !== 'string' ||
      !UUID_PATTERN.test(productId)
    ) {
      res.status(400).json({ message: 'Invalid product ID' })
      return
    }

    try {
      await pool.query(
        `
          DELETE FROM cart_items ci
          USING carts c
          WHERE ci.cart_id = c.id
            AND c.user_id = $1
            AND ci.product_id = $2
        `,
        [userId, productId],
      )

      res.status(204).end()
    } catch (error) {
      console.error('Failed to remove cart item:', error)
      res.status(500).json({ message: 'Failed to remove cart item' })
    }
  },
)

export default router