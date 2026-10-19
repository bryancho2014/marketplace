export interface ShippingAddress {
  shipping_recipient: string
  shipping_address_line1: string
  shipping_address_line2?: string | null
  shipping_city: string
  shipping_state?: string | null
  shipping_postal_code: string
  shipping_country_code: string
}

export interface OrderItem {
  product_id: string
  name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id: string
  user_id: string
  status: string
  total_amount: number
  shipping_recipient: string
  shipping_address_line1: string
  shipping_address_line2: string | null
  shipping_city: string
  shipping_state: string | null
  shipping_postal_code: string
  shipping_country_code: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

interface CreateOrderResponse {
  order: Omit<Order, 'items'>
  items: OrderItem[]
}

async function orderRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? 'Order request failed',
    )
  }

  return response.json() as Promise<T>
}

export function createOrder(
  shippingAddress: ShippingAddress,
  token: string,
): Promise<CreateOrderResponse> {
  return orderRequest<CreateOrderResponse>(
    '/api/orders',
    token,
    {
      method: 'POST',
      body: JSON.stringify(shippingAddress),
    },
  )
}

export function getOrders(token: string): Promise<Order[]> {
  return orderRequest<Order[]>('/api/orders', token)
}