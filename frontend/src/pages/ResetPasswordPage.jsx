import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Something went wrong')
        return
      }
      navigate('/login?reset=1')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-red-400">Invalid reset link. Please request a new one.</p>
      </div>
    )
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--accent)' }}>Set new password</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-400">New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 rounded text-white"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-400">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
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
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
