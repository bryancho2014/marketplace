import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getCart,
  updateCartItem,
  removeCartItem,
} from '../services/cartService'
import {
  createOrder,
  type ShippingAddress,
} from '../services/orderService'

function formatPrice(price: number | string) {
  return `$${Number(price).toFixed(2)}`
}

function CartPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [recipient, setRecipient] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [orderSuccess, setOrderSuccess] = useState('')

  const {
    data: cart,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: () => getCart(token!),
    enabled: Boolean(token),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string
      quantity: number
    }) => updateCartItem(productId, quantity, token!),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      removeCartItem(productId, token!),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const orderMutation = useMutation({
    mutationFn: (shippingAddress: ShippingAddress) =>
      createOrder(shippingAddress, token!),
    onSuccess: async (result) => {
      setOrderSuccess(
        `Order placed successfully! Order ID: ${result.order.id}`,
      )

      setRecipient('')
      setAddressLine1('')
      setAddressLine2('')
      setCity('')
      setState('')
      setPostalCode('')
      setCountryCode('US')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ])
    },
  })

  if (!token) {
    return (
      <section>
        <h1>Shopping Cart</h1>
        <p>Please log in to view your shopping cart.</p>
        <Link to="/login">Log in</Link>
      </section>
    )
  }

  if (isPending) {
    return <p role="status">Loading your cart...</p>
  }

  if (isError) {
    return (
      <section>
        <h1>Shopping Cart</h1>
        <p role="alert">
          {error instanceof Error
            ? error.message
            : 'Unable to load your cart.'}
        </p>
      </section>
    )
  }

  const isBusy =
    updateMutation.isPending ||
    removeMutation.isPending ||
    orderMutation.isPending

  function handlePlaceOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOrderSuccess('')

    const shippingAddress: ShippingAddress = {
      shipping_recipient: recipient.trim(),
      shipping_address_line1: addressLine1.trim(),
      shipping_address_line2: addressLine2.trim() || null,
      shipping_city: city.trim(),
      shipping_state: state.trim() || null,
      shipping_postal_code: postalCode.trim(),
      shipping_country_code: countryCode.trim().toUpperCase(),
    }

    orderMutation.mutate(shippingAddress)
  }

  return (
    <section>
      <h1>Shopping Cart</h1>

      {orderSuccess && (
        <div role="status">
          <p>{orderSuccess}</p>
          <p>
            <Link to="/orders">View your orders</Link>
          </p>
        </div>
      )}

      {cart.items.length === 0 ? (
        <>
          <p>Your cart is empty.</p>
          <Link to="/">Browse products</Link>
        </>
      ) : (
        <>
          {cart.items.map((item) => (
            <article key={item.product_id}>
              <h2>
                <Link to={`/products/${item.product_id}`}>
                  {item.name}
                </Link>
              </h2>

              <p>Price: {formatPrice(item.price)}</p>
              <p>Available: {item.stock_quantity}</p>
              <p>Subtotal: {formatPrice(item.subtotal)}</p>

              <div>
                <button
                  type="button"
                  disabled={item.quantity <= 1 || isBusy}
                  onClick={() =>
                    updateMutation.mutate({
                      productId: item.product_id,
                      quantity: item.quantity - 1,
                    })
                  }
                >
                  −
                </button>

                <span aria-label="Quantity">
                  {' '}{item.quantity}{' '}
                </span>

                <button
                  type="button"
                  disabled={
                    item.quantity >= item.stock_quantity || isBusy
                  }
                  onClick={() =>
                    updateMutation.mutate({
                      productId: item.product_id,
                      quantity: item.quantity + 1,
                    })
                  }
                >
                  +
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    removeMutation.mutate(item.product_id)
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          ))}

          <hr />

          <h2>Total: {formatPrice(cart.total)}</h2>

          <Link to="/">Continue shopping</Link>

          <hr />

          <h2>Checkout</h2>

          <form onSubmit={handlePlaceOrder}>
            <div>
              <label htmlFor="shipping-recipient">
                Recipient
              </label>
              <input
                id="shipping-recipient"
                name="shipping_recipient"
                autoComplete="name"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="shipping-address-line1">
                Address line 1
              </label>
              <input
                id="shipping-address-line1"
                name="shipping_address_line1"
                autoComplete="address-line1"
                required
                value={addressLine1}
                onChange={(event) =>
                  setAddressLine1(event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="shipping-address-line2">
                Address line 2 (optional)
              </label>
              <input
                id="shipping-address-line2"
                name="shipping_address_line2"
                autoComplete="address-line2"
                value={addressLine2}
                onChange={(event) =>
                  setAddressLine2(event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="shipping-city">City</label>
              <input
                id="shipping-city"
                name="shipping_city"
                autoComplete="address-level2"
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="shipping-state">
                State / Province (optional)
              </label>
              <input
                id="shipping-state"
                name="shipping_state"
                autoComplete="address-level1"
                value={state}
                onChange={(event) => setState(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="shipping-postal-code">
                Postal code
              </label>
              <input
                id="shipping-postal-code"
                name="shipping_postal_code"
                autoComplete="postal-code"
                required
                value={postalCode}
                onChange={(event) =>
                  setPostalCode(event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="shipping-country-code">
                Country code (2 letters)
              </label>
              <input
                id="shipping-country-code"
                name="shipping_country_code"
                autoComplete="country"
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                required
                value={countryCode}
                onChange={(event) =>
                  setCountryCode(event.target.value.toUpperCase())
                }
              />
            </div>

            <button
              type="submit"
              disabled={isBusy || cart.items.length === 0}
            >
              {orderMutation.isPending
                ? 'Placing order...'
                : 'Place Order'}
            </button>
          </form>
        </>
      )}

      {updateMutation.isError && (
        <p role="alert">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : 'Unable to update quantity.'}
        </p>
      )}

      {removeMutation.isError && (
        <p role="alert">
          {removeMutation.error instanceof Error
            ? removeMutation.error.message
            : 'Unable to remove item.'}
        </p>
      )}

      {orderMutation.isError && (
        <p role="alert">
          {orderMutation.error instanceof Error
            ? orderMutation.error.message
            : 'Unable to place order.'}
        </p>
      )}
    </section>
  )
}

export default CartPage