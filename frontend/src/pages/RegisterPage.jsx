import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(username, email, password)
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#0097a7' }}>Create Account</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-400">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 rounded text-white"
            style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8' }}
          />
        </div>
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
        <div>
          <label className="block text-sm mb-1 text-gray-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 rounded text-white"
            style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8' }}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-2 rounded font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#8b1a3a', color: '#f0e6d3' }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#0097a7' }}>Sign in</Link>
      </p>
    </div>
  )
}
