
import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import {
  getProducts,
  type Product,
  type ProductSort,
} from '../services/productService'

import './ProductList.css'

const PAGE_SIZE = 20

function ProductList() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ProductSort>('newest')
  const [offset, setOffset] = useState(0)

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['products', { search, sort, offset }],
    queryFn: ({ signal }) =>
      getProducts(
        {
          search,
          sort,
          limit: PAGE_SIZE + 1,
          offset,
        },
        signal,
      ),
    staleTime: 30_000,
  })

  const products: Product[] = data?.slice(0, PAGE_SIZE) ?? []
  const hasNextPage = (data?.length ?? 0) > PAGE_SIZE

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchInput.trim())
  }

  function handleSortChange(value: ProductSort) {
    setSort(value)
    setOffset(0)
  }

  return (
    <section>
      <h2>Products</h2>

      <form onSubmit={handleSearch}>
        <label htmlFor="product-search">Search products</label>
        <input
          id="product-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by product name"
        />
        <button type="submit">Search</button>
      </form>

      <div>
        <label htmlFor="product-sort">Sort by</label>
        <select
          id="product-sort"
          value={sort}
          onChange={(event) =>
            handleSortChange(event.target.value as ProductSort)
          }
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      {isError && (
        <p role="alert">
          {error instanceof Error
            ? error.message
            : 'Failed to load products'}
        </p>
      )}

      {isPending && <p role="status">Loading products...</p>}

      {!isPending && !isError && products.length === 0 && (
        <p>No products available yet.</p>
      )}

      {!isError && products.length > 0 && (
        <>
          <ul className="product-grid">
            {products.map((product) => (
              <li className="product-card" key={product.id}>
                <div className="product-image-placeholder">
                  No image
                </div>

                <div className="product-card-content">
                  <h3>
                    <Link to={`/products/${product.id}`}>
                      {product.name}
                    </Link>
                  </h3>

                  <p className="product-price">
                    ${Number(product.price).toFixed(2)}
                  </p>

                  <p>
                    {product.description ||
                      'No description available.'}
                  </p>

                  <p>In stock: {product.stock_quantity}</p>
                </div>
              </li>
            ))}
          </ul>

          <nav aria-label="Product pages">
            <button
              type="button"
              disabled={offset === 0 || isPending}
              onClick={() =>
                setOffset(Math.max(0, offset - PAGE_SIZE))
              }
            >
              Previous
            </button>

            <span>
              {' '}Page {Math.floor(offset / PAGE_SIZE) + 1}{' '}
            </span>

            <button
              type="button"
              disabled={!hasNextPage || isPending}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  )
}

export default ProductList