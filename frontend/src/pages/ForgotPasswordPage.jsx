import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#0097a7' }}>Check your email</h2>
        <p className="text-gray-400 mb-6">
          If <strong style={{ color: '#1c1008' }}>{email}</strong> is registered, you'll receive a password reset link shortly.
        </p>
        <Link to="/login" style={{ color: '#0097a7' }} className="text-sm">← Back to login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#0097a7' }}>Forgot password</h2>
      <p className="text-gray-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded text-white"
            style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="py-2 rounded font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#8b1a3a', color: '#f0e6d3' }}
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        <Link to="/login" style={{ color: '#0097a7' }}>← Back to login</Link>
      </p>
    </div>
  )
}
