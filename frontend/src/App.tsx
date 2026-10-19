
import { Route, Routes } from 'react-router-dom'

import Header from './components/Header'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NewProductPage from './pages/NewProductPage'
import OrdersPage from './pages/OrdersPage'

function App() {
  return (
    <>
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/products/:id"
            element={<ProductDetailPage />}
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/sell/products/new"
            element={<NewProductPage />}
          />
          <Route path="/orders" element={<OrdersPage />} />

          <Route
            path="*"
            element={
              <section>
                <h1>404 - Page Not Found</h1>
                <p>The page you requested does not exist.</p>
              </section>
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default App