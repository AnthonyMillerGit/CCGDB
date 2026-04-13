import { createContext, useContext, useState, useCallback } from 'react'
import { API_URL } from '../config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ccgdb_token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ccgdb_user'))
    } catch {
      return null
    }
  })

  const saveSession = (token, user) => {
    localStorage.setItem('ccgdb_token', token)
    localStorage.setItem('ccgdb_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('ccgdb_token')
    localStorage.removeItem('ccgdb_user')
    setToken(null)
    setUser(null)
  }, [])

  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Registration failed')
    }
    const data = await res.json()
    saveSession(data.token, data.user)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    saveSession(data.token, data.user)
  }, [])

  const authFetch = useCallback((url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
