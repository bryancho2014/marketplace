
import { useState } from 'react'
import { login, getCurrentUser } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const { loginUser, logout, user } = useAuth()

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setMessage('Logging in...')

    try {
      const data = await login({ email, password })
      const currentUser = await getCurrentUser(data.token)

      loginUser(currentUser, data.token)

      setMessage(`Logged in as ${currentUser.email}`)
      setPassword('')
    } catch (error) {
      logout()
      setMessage(
        error instanceof Error ? error.message : 'Login failed',
      )
    }
  }

  if (user) {
    return null
  }

  return (
    <section>
      <h2>Log in</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button type="submit">Log in</button>
      </form>

      <p role="status">{message}</p>
    </section>
  )
}

export default LoginForm