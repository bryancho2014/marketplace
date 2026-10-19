import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getOrders } from '../services/orderService'

function formatPrice(price: number | string) {
  return `$${Number(price).toFixed(2)}`
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

function OrdersPage() {
  const { token } = useAuth()

  const {
    data: orders,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(token!),
    enabled: Boolean(token),
  })

  if (!token) {
    return (
      <section>
        <h1>My Orders</h1>
        <p>Please log in to view your orders.</p>
        <Link to="/login">Log in</Link>
      </section>
    )
  }

  if (isPending) {
    return <p role="status">Loading your orders...</p>
  }

  if (isError) {
    return (
      <section>
        <h1>My Orders</h1>
        <p role="alert">
          {error instanceof Error
            ? error.message
            : 'Unable to load your orders.'}
        </p>
      </section>
    )
  }

  return (
    <section>
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <>
          <p>You have not placed any orders yet.</p>
          <Link to="/">Browse products</Link>
        </>
      ) : (
        orders.map((order) => (
          <article key={order.id}>
            <h2>Order #{order.id}</h2>

            <p>Placed: {formatDate(order.created_at)}</p>
            <p>Status: {order.status}</p>
            <p>Total: {formatPrice(order.total_amount)}</p>

            <h3>Shipping Address</h3>
            <p>{order.shipping_recipient}</p>
            <p>{order.shipping_address_line1}</p>

            {order.shipping_address_line2 && (
              <p>{order.shipping_address_line2}</p>
            )}

            <p>
              {order.shipping_city}
              {order.shipping_state
                ? `, ${order.shipping_state}`
                : ''}{' '}
              {order.shipping_postal_code}
            </p>
            <p>{order.shipping_country_code}</p>

            <h3>Items</h3>

            {order.items.map((item, index) => (
              <div key={`${item.product_id}-${index}`}>
                <p>{item.name}</p>
                <p>Unit price: {formatPrice(item.unit_price)}</p>
                <p>Quantity: {item.quantity}</p>
                <p>Subtotal: {formatPrice(item.subtotal)}</p>
              </div>
            ))}

            <hr />
          </article>
        ))
      )}

      <Link to="/cart">Go to cart</Link>
    </section>
  )
}

export default OrdersPage