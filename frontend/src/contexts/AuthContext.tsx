import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { User } from '../services/authService'
import { getCurrentUser } from '../services/authService'

const AUTH_STORAGE_KEY = 'marketplace_auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  loginUser: (user: User, token: string) => void
  logout: () => void
}

interface StoredAuth {
  user: User
  token: string
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

function loadStoredAuth(): StoredAuth | null {
  try {
    const storedValue = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const parsed: unknown = JSON.parse(storedValue)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('user' in parsed) ||
      !('token' in parsed) ||
      typeof parsed.token !== 'string' ||
      parsed.token.length === 0 ||
      typeof parsed.user !== 'object' ||
      parsed.user === null
    ) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    return parsed as StoredAuth
  } catch {
    return null
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [initialAuth] = useState(loadStoredAuth)

  const [user, setUser] = useState<User | null>(
    () => initialAuth?.user ?? null,
  )

  const [token, setToken] = useState<string | null>(
    () => initialAuth?.token ?? null,
  )

  useEffect(() => {
    if (!initialAuth?.token) {
      return
    }

    let cancelled = false

    async function validateSession() {
      try {
        const currentUser = await getCurrentUser(initialAuth.token)

        if (cancelled) {
          return
        }

        const updatedAuth: StoredAuth = {
          user: currentUser,
          token: initialAuth.token,
        }

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(updatedAuth),
        )

        setUser(currentUser)
      } catch {
        if (cancelled) {
          return
        }

        localStorage.removeItem(AUTH_STORAGE_KEY)
        setUser(null)
        setToken(null)
      }
    }

    void validateSession()

    return () => {
      cancelled = true
    }
  }, [initialAuth])

  function loginUser(user: User, token: string) {
    const auth: StoredAuth = { user, token }

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(auth),
    )

    setUser(user)
    setToken(token)
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loginUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}