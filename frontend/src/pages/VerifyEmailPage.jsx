import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { API_URL } from '../config'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.ok) {
          setStatus('success')
        } else {
          const err = await res.json()
          setError(err.detail || 'Verification failed')
          setStatus('error')
        }
      })
      .catch(() => { setError('Network error'); setStatus('error') })
  }, [token])

  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-gray-400">Verifying your email…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#0097a7' }}>Email verified!</h2>
        <p className="text-gray-400 mb-6">Your email address has been confirmed.</p>
        <Link
          to="/profile"
          className="px-4 py-2 rounded font-semibold text-sm"
          style={{ backgroundColor: '#8b1a3a', color: '#f0e6d3' }}
        >
          Go to Profile
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <h2 className="text-2xl font-bold mb-4 text-red-400">Verification failed</h2>
      <p className="text-gray-400 mb-6">{error}</p>
      <Link to="/login" style={{ color: '#0097a7' }} className="text-sm">Back to login</Link>
    </div>
  )
}
