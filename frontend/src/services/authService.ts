
export interface User {
  id: string
  email: string
  display_name: string
}

export interface LoginResponse {
  token: string
  id: string
  email: string
  display_name: string
}

interface RegisterInput {
  email: string
  password: string
  displayName: string
}

interface LoginInput {
  email: string
  password: string
}

interface ApiError {
  message?: string
}

async function getErrorMessage(response: Response): Promise<string> {
  const data: ApiError = await response.json()
  return data.message ?? 'Request failed'
}

export async function register(input: RegisterInput): Promise<User> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.json() as Promise<User>
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.json() as Promise<LoginResponse>
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.json() as Promise<User>
}
