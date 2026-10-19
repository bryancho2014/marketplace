
export interface CartItem {
  product_id: string
  name: string
  description: string | null
  price: string | number
  quantity: number
  stock_quantity: number
  status: 'draft' | 'active' | 'archived'
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

async function cartRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.message ?? 'Cart request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getCart(token: string): Promise<Cart> {
  return cartRequest<Cart>('/api/cart', token)
}

export function addCartItem(
  productId: string,
  quantity: number,
  token: string,
): Promise<unknown> {
  return cartRequest('/api/cart/items', token, {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  })
}

export function updateCartItem(
  productId: string,
  quantity: number,
  token: string,
): Promise<unknown> {
  return cartRequest(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    },
  )
}

export function removeCartItem(
  productId: string,
  token: string,
): Promise<void> {
  return cartRequest<void>(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    token,
    { method: 'DELETE' },
  )
}