
import { useState } from 'react'
import { register } from '../services/authService'

function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setMessage('Registering...')

    try {
      const user = await register({
        email,
        password,
        displayName,
      })

      setMessage(`Account created for ${user.email}`)
      setPassword('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Registration failed',
      )
    }
  }

  return (
    <section>
      <h2>Create an account</h2>

      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="register-displayName">Display name</label>
          <input
            id="register-displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <button type="submit">Register</button>
      </form>

      <p role="status">{message}</p>
    </section>
  )
}

export default RegisterForm