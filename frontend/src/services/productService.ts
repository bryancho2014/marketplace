
export interface Product {
  id: string
  name: string
  description: string | null
  price: string | number
  stock_quantity: number
  status: 'draft' | 'active' | 'archived'
  created_at: string
}

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'

export interface ProductQuery {
  search: string
  sort: ProductSort
  limit: number
  offset: number
}

export async function getProducts(
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<Product[]> {
  const params = new URLSearchParams({
    search: query.search,
    sort: query.sort,
    limit: String(query.limit),
    offset: String(query.offset),
  })

  const response = await fetch(`/api/products?${params}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  return response.json() as Promise<Product[]>
}

export async function getProductById(
  id: string,
  signal?: AbortSignal,
): Promise<Product> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(id)}`,
    { signal },
  )

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Product not found')
    }

    throw new Error('Failed to fetch product details')
  }

  return response.json() as Promise<Product>
}

export interface CreateProductInput {
  name: string
  description: string
  price: number
  stock_quantity: number
}

export async function createProduct(
  input: CreateProductInput,
  token: string,
): Promise<Product> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(
      errorData?.message ?? 'Failed to create product',
    )
  }

  return response.json() as Promise<Product>
}