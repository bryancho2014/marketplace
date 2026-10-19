
import express from 'express'

import { pool } from './db.js'

import authRouter from './routes/auth.js'
import productsRouter from './routes/products.js'
import cartRouter from './routes/cart.js'
import ordersRouter from './routes/orders.js'

const app = express()

const PORT = Number(process.env.PORT) || 3001

app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', ordersRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/db-health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')

    res.json({
      status: 'ok',
      databaseTime: result.rows[0].now,
    })
  } catch (error) {
    console.error('Database connection failed:', error)

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})