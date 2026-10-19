import { Router, type Request, type Response } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

interface AuthenticatedRequest extends Request {
  userId?: string
}

interface ShippingAddress {
  shipping_recipient: string
  shipping_address_line1: string
  shipping_address_line2?: string | null
  shipping_city: string
  shipping_state?: string | null
  shipping_postal_code: string
  shipping_country_code: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

router.post(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    const body = req.body as Partial<ShippingAddress>

    const requiredFields = [
      'shipping_recipient',
      'shipping_address_line1',
      'shipping_city',
      'shipping_postal_code',
      'shipping_country_code',
    ] as const

    for (const field of requiredFields) {
      if (!isNonEmptyString(body[field])) {
        res.status(400).json({ message: `${field} is required` })
        return
      }
    }

    if (
      body.shipping_country_code!.trim().length !== 2 ||
      (body.shipping_address_line2 != null &&
        typeof body.shipping_address_line2 !== 'string') ||
      (body.shipping_state != null &&
        typeof body.shipping_state !== 'string')
    ) {
      res.status(400).json({ message: 'Invalid shipping address' })
      return
    }

    let client

    try {
      client = await pool.connect()
      await client.query('BEGIN')

      const cartResult = await client.query(
        'SELECT id FROM carts WHERE user_id = $1 FOR UPDATE',
        [userId],
      )

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(400).json({ message: 'Your cart is empty' })
        return
      }

      const cartId = cartResult.rows[0].id

      const itemsResult = await client.query(
        `
          SELECT
            ci.product_id,
            ci.quantity,
            p.name,
            p.price,
            p.stock_quantity,
            p.status
          FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = $1
          ORDER BY ci.product_id
          FOR UPDATE OF p
        `,
        [cartId],
      )

      if (itemsResult.rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(400).json({ message: 'Your cart is empty' })
        return
      }

      for (const item of itemsResult.rows) {
        if (item.status !== 'active') {
          await client.query('ROLLBACK')
          res.status(400).json({
            message: `Product "${item.name}" is no longer available`,
          })
          return
        }

        if (Number(item.stock_quantity) < Number(item.quantity)) {
          await client.query('ROLLBACK')
          res.status(409).json({
            message: `Insufficient stock for "${item.name}"`,
          })
          return
        }
      }

      const total = itemsResult.rows.reduce(
        (sum, item) =>
          sum + Number(item.price) * Number(item.quantity),
        0,
      )

      const orderResult = await client.query(
        `
          INSERT INTO orders (
            user_id,
            status,
            total_amount,
            shipping_recipient,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country_code
          )
          VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [
          userId,
          total.toFixed(2),
          body.shipping_recipient!.trim(),
          body.shipping_address_line1!.trim(),
          body.shipping_address_line2?.trim() || null,
          body.shipping_city!.trim(),
          body.shipping_state?.trim() || null,
          body.shipping_postal_code!.trim(),
          body.shipping_country_code!.trim().toUpperCase(),
        ],
      )

      const order = orderResult.rows[0]

      for (const item of itemsResult.rows) {
        await client.query(
          `
            UPDATE products
            SET stock_quantity = stock_quantity - $1,
                updated_at = NOW()
            WHERE id = $2
          `,
          [item.quantity, item.product_id],
        )

        await client.query(
          `
            INSERT INTO order_items (
              order_id,
              product_id,
              product_name_at_purchase,
              unit_price_at_purchase,
              quantity
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            order.id,
            item.product_id,
            item.name,
            item.price,
            item.quantity,
          ],
        )
      }

      await client.query(
        'DELETE FROM cart_items WHERE cart_id = $1',
        [cartId],
      )

      await client.query(
        'UPDATE carts SET updated_at = NOW() WHERE id = $1',
        [cartId],
      )

      await client.query('COMMIT')

      res.status(201).json({
        order: {
          ...order,
          total_amount: Number(order.total_amount),
        },
        items: itemsResult.rows.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          unit_price: Number(item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.price) * Number(item.quantity),
        })),
      })
    } catch (error) {
      await client?.query('ROLLBACK').catch(() => undefined)
      console.error('Order creation failed:', error)
      res.status(500).json({ message: 'Failed to create order' })
    } finally {
      client?.release()
    }
  },
)

router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    try {
      const result = await pool.query(
        `
          SELECT
            o.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'product_id', oi.product_id,
                  'name', oi.product_name_at_purchase,
                  'unit_price', oi.unit_price_at_purchase,
                  'quantity', oi.quantity,
                  'subtotal',
                    oi.unit_price_at_purchase * oi.quantity
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.user_id = $1
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `,
        [userId],
      )

      res.json(
        result.rows.map((order) => ({
          ...order,
          total_amount: Number(order.total_amount),
          items: order.items.map((item: {
            unit_price: string | number
            subtotal: string | number
          }) => ({
            ...item,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal),
          })),
        })),
      )
    } catch (error) {
      console.error('Order retrieval failed:', error)
      res.status(500).json({ message: 'Failed to retrieve orders' })
    }
  },
)

export default router