
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addCartItem } from '../services/cartService'
import { getProductById } from '../services/productService'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(1)
  const [successMessage, setSuccessMessage] = useState('')

  const isValidId = Boolean(id && UUID_PATTERN.test(id))

  const {
    data: product,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => getProductById(id!, signal),
    enabled: isValidId,
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: () => addCartItem(id!, quantity, token!),
    onSuccess: async () => {
      setSuccessMessage('Added to your cart.')
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  if (!isValidId) {
    return (
      <section>
        <h1>Invalid Product ID</h1>
        <p>The product URL is invalid.</p>
        <Link to="/">Back to products</Link>
      </section>
    )
  }

  if (isPending) {
    return <p role="status">Loading product details...</p>
  }

  if (isError) {
    const isNotFound =
      error instanceof Error && error.message === 'Product not found'

    return (
      <section>
        <h1>{isNotFound ? 'Product Not Found' : 'Unable to Load Product'}</h1>
        <p role="alert">
          {isNotFound
            ? 'This product does not exist or is no longer available.'
            : 'Something went wrong while loading this product. Please try again.'}
        </p>
        <Link to="/">Back to products</Link>
      </section>
    )
  }

  const isOutOfStock = product.stock_quantity <= 0

  return (
    <section>
      <Link to="/">← Back to products</Link>

      <h1>{product.name}</h1>
      <p>Price: ${Number(product.price).toFixed(2)}</p>
      <p>{product.description || 'No description available.'}</p>
      <p>In stock: {product.stock_quantity}</p>

      {token ? (
        <>
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={product.stock_quantity}
            value={quantity}
            disabled={isOutOfStock || addMutation.isPending}
            onChange={(event) => {
              const value = Number(event.target.value)
              setQuantity(value)
              setSuccessMessage('')
            }}
          />

          <button
            type="button"
            disabled={
              isOutOfStock ||
              addMutation.isPending ||
              !Number.isInteger(quantity) ||
              quantity < 1 ||
              quantity > product.stock_quantity
            }
            onClick={() => {
              setSuccessMessage('')
              addMutation.mutate()
            }}
          >
            {addMutation.isPending ? 'Adding...' : 'Add to Cart'}
          </button>

          {isOutOfStock && <p>This product is out of stock.</p>}

          {successMessage && <p role="status">{successMessage}</p>}

          {addMutation.isError && (
            <p role="alert">
              {addMutation.error instanceof Error
                ? addMutation.error.message
                : 'Unable to add this product to your cart.'}
            </p>
          )}

          {successMessage && <p><Link to="/cart">View Cart</Link></p>}
        </>
      ) : (
        <p>
          <Link to="/login">Log in</Link> to add this product to your cart.
        </p>
      )}
    </section>
  )
}

export default ProductDetailPage