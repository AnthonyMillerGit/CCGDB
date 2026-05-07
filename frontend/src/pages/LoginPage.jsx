import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }

  return (
    <div className="max-w-md mx-auto mt-16">
      {searchParams.get('reset') === '1' && (
        <div className="mb-4 px-4 py-3 rounded text-sm" style={{ backgroundColor: '#1a3a2a', border: '1px solid #2d6a4f', color: 'var(--accent)' }}>
          Password updated successfully. Sign in with your new password.
        </div>
      )}
      {/* Tab toggle */}
      <div className="flex mb-6 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <button
          onClick={() => switchMode('login')}
          className="flex-1 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: mode === 'login' ? 'var(--accent)' : 'var(--bg-surface)',
            color: mode === 'login' ? 'var(--bg-page)' : 'var(--text-muted)',
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => switchMode('register')}
          className="flex-1 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: mode === 'register' ? 'var(--accent)' : 'var(--bg-surface)',
            color: mode === 'register' ? 'var(--bg-page)' : 'var(--text-muted)',
          }}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div>
            <label className="block text-sm mb-1 text-gray-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 rounded text-white"
              style={inputStyle}
            />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1 text-gray-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded text-white"
            style={inputStyle}
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="block text-sm text-gray-400">Password</label>
            {mode === 'login' && (
              <Link to="/forgot-password" className="text-xs" style={{ color: 'var(--accent)' }}>
                Forgot password?
              </Link>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            className="w-full px-3 py-2 rounded text-white"
            style={inputStyle}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-2 rounded font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
        >
          {loading
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
      </form>
    </div>
  )
}
