
import { useState, type FormEvent } from 'react'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createProduct,
  type CreateProductInput,
} from '../services/productService'
import { useAuth } from '../contexts/AuthContext'

function CreateProductForm() {
  const { user, token } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const createProductMutation = useMutation({
    mutationFn: (input: CreateProductInput) => {
      if (!token) {
        throw new Error('Please log in again.')
      }

      return createProduct(input, token)
    },

    onSuccess: async () => {
      setName('')
      setDescription('')
      setPrice('')
      setStockQuantity('0')
      setSuccess('Product created successfully!')

      await queryClient.invalidateQueries({
        queryKey: ['products'],
      })
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!user || !token) {
      setError('Please log in again.')
      return
    }

    const numericPrice = Number(price)
    const numericStock = Number(stockQuantity)

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      Math.abs(
        numericPrice * 100 - Math.round(numericPrice * 100),
      ) > 1e-8
    ) {
      setError(
        'Enter a valid price with at most 2 decimal places.',
      )
      return
    }

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      setError(
        'Stock quantity must be a non-negative integer.',
      )
      return
    }

    const input: CreateProductInput = {
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      stock_quantity: numericStock,
    }

    try {
      await createProductMutation.mutateAsync(input)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to create product.',
      )
    }
  }

  if (!user) {
    return null
  }

  return (
    <section>
      <h2>Create a product</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="product-name">Product name</label>
          <input
            id="product-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div>
          <label htmlFor="product-description">
            Description
          </label>
          <textarea
            id="product-description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            maxLength={5000}
          />
        </div>

        <div>
          <label htmlFor="product-price">Price</label>
          <input
            id="product-price"
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="product-stock">Stock quantity</label>
          <input
            id="product-stock"
            type="number"
            min="0"
            step="1"
            value={stockQuantity}
            onChange={(event) =>
              setStockQuantity(event.target.value)
            }
            required
          />
        </div>

        <button
          type="submit"
          disabled={createProductMutation.isPending}
        >
          {createProductMutation.isPending
            ? 'Creating...'
            : 'Create product'}
        </button>

        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
      </form>
    </section>
  )
}

export default CreateProductForm