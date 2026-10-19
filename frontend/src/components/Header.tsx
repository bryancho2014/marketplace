
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header>
      <h1>
        <Link
          to="/"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Marketplace
        </Link>
      </h1>

      <nav aria-label="Main navigation">
        <Link to="/">Products</Link>
        {' | '}
        <Link to="/cart">Cart</Link>
        {' | '}

        {user ? (
          <>
            <Link to="/sell/products/new">Sell a product</Link>
            {' | '}
            <Link to="/orders">My orders</Link>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            {' | '}
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>

      <div>
        {user ? (
          <>
            <span>Welcome, {user.display_name}!</span>
            {' '}
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <p>Welcome! Please log in.</p>
        )}
      </div>
    </header>
  )
}

export default Header