
import { Router, type Request } from 'express'

import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const productsRouter = Router()

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const allowedSortOptions = {
  newest: 'created_at DESC, id DESC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id DESC',
} as const

type SortOption = keyof typeof allowedSortOptions

// GET /api/products
// Public endpoint: retrieve active products.
productsRouter.get('/', async (req, res) => {
  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : ''

  const sortValue =
    typeof req.query.sort === 'string'
      ? req.query.sort
      : 'newest'

  if (!Object.hasOwn(allowedSortOptions, sortValue)) {
    res.status(400).json({
      message: 'Invalid sort option',
      allowedValues: Object.keys(allowedSortOptions),
    })
    return
  }

  const sort = sortValue as SortOption

  const limitValue =
    typeof req.query.limit === 'string'
      ? Number(req.query.limit)
      : DEFAULT_LIMIT

  const offsetValue =
    typeof req.query.offset === 'string'
      ? Number(req.query.offset)
      : 0

  if (
    !Number.isInteger(limitValue) ||
    limitValue < 1 ||
    limitValue > MAX_LIMIT
  ) {
    res.status(400).json({
      message: `limit must be an integer between 1 and ${MAX_LIMIT}`,
    })
    return
  }

  if (!Number.isInteger(offsetValue) || offsetValue < 0) {
    res.status(400).json({
      message: 'offset must be a non-negative integer',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          name,
          description,
          price,
          stock_quantity,
          status,
          created_at
        FROM products
        WHERE status = 'active'
          AND name ILIKE $1
        ORDER BY ${allowedSortOptions[sort]}
        LIMIT $2 OFFSET $3
      `,
      [`%${search}%`, limitValue, offsetValue],
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch products:', error)

    res.status(500).json({
      message: 'Failed to fetch products',
    })
  }
})

// GET /api/products/:id
// Public endpoint: retrieve one active product.
productsRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  // Validate the UUID before querying PostgreSQL.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(id)) {
    res.status(400).json({
      message: 'Invalid product ID',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          name,
          description,
          price,
          stock_quantity,
          status,
          created_at
        FROM products
        WHERE id = $1
          AND status = 'active'
      `,
      [id],
    )

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Product not found',
      })
      return
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Failed to fetch product:', error)

    res.status(500).json({
      message: 'Failed to fetch product',
    })
  }
})

// POST /api/products
// Protected endpoint: authenticated users can create products.
productsRouter.post('/', requireAuth, async (req, res) => {
  const sellerId = (
    req as Request & { userId?: string }
  ).userId

  // requireAuth should set userId before this handler runs.
  if (!sellerId) {
    res.status(401).json({
      message: 'Authentication is required',
    })
    return
  }

  const {
    name,
    description,
    price,
    stock_quantity,
  } = req.body ?? {}

  // Validate the product name.
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.trim().length > 200
  ) {
    res.status(400).json({
      message:
        'name must be a non-empty string of at most 200 characters',
    })
    return
  }

  // Description is optional; if provided, it must be a string.
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({
      message: 'description must be a string or null',
    })
    return
  }

  if (
    typeof description === 'string' &&
    description.length > 5000
  ) {
    res.status(400).json({
      message: 'description must be at most 5000 characters',
    })
    return
  }

  // Validate the price.
  if (
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 9_999_999_999.99 ||
    Math.abs(
      price * 100 - Math.round(price * 100),
    ) > 1e-8
  ) {
    res.status(400).json({
      message:
        'price must be a positive number with at most 2 decimal places',
    })
    return
  }

  // Validate inventory quantity.
  if (
    !Number.isInteger(stock_quantity) ||
    stock_quantity < 0
  ) {
    res.status(400).json({
      message:
        'stock_quantity must be a non-negative integer',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO products (
          seller_id,
          name,
          description,
          price,
          stock_quantity,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING
          id,
          seller_id,
          name,
          description,
          price,
          stock_quantity,
          status,
          created_at
      `,
      [
        sellerId,
        name.trim(),
        description?.trim() || null,
        price,
        stock_quantity,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Failed to create product:', error)

    res.status(500).json({
      message: 'Failed to create product',
    })
  }
})

export default productsRouter