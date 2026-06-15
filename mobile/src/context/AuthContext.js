import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { API_URL } from '../api/config'

const TOKEN_KEY = 'ccgvault_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(async (stored) => {
        if (!stored) { setLoading(false); return }
        const me = await fetchMe(stored)
        if (me) { setToken(stored); setUser(me) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function fetchMe(t) {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Login failed')
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token)
    setToken(data.access_token)
    const me = await fetchMe(data.access_token)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const authFetch = useCallback((url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
