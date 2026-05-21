import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'
import ConfirmModal from './ConfirmModal'

export default function MyWishlistTab({ authFetch }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    authFetch(`${API_URL}/api/users/me/wishlist`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authFetch])

  async function handleRemove(printingId) {
    await authFetch(`${API_URL}/api/users/me/wishlist/${printingId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.printing_id !== printingId))
  }

  async function handleAddToCollection(item) {
    await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: item.printing_id, quantity: 1 }),
    })
    await authFetch(`${API_URL}/api/users/me/wishlist/${item.printing_id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.printing_id !== item.printing_id))
  }

  async function handleClearAll() {
    await authFetch(`${API_URL}/api/users/me/wishlist`, { method: 'DELETE' })
    setItems([])
    setConfirm(null)
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading wishlist…</p>

  if (items.length === 0) return (
    <div className="text-center py-16">
      <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>Your wishlist is empty.</p>
      <p className="text-sm" style={{ color: '#9e836a' }}>Add cards to your wishlist from any card detail page.</p>
    </div>
  )

  return (
    <div>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{items.length}</strong> {items.length === 1 ? 'card' : 'cards'}
        </p>
        <button
          onClick={() => setConfirm({
            message: `Are you sure you want to clear your entire wishlist? (${items.length} ${items.length === 1 ? 'card' : 'cards'})`,
            onConfirm: handleClearAll,
          })}
          className="text-xs px-3 py-1.5 rounded"
          style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid #9e836a' }}
        >
          Clear Wishlist
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.id} className="relative rounded-xl overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <button
              onClick={() => navigate(`/cards/${item.card_id}`)}
              className="w-full text-left"
            >
              {item.image_url
                ? <img src={item.image_url} alt={item.card_name} className="w-full" />
                : <div className="aspect-[2.5/3.5] flex items-center justify-center p-2"
                    style={{ backgroundColor: 'var(--bg-chip)' }}>
                    <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{item.card_name}</span>
                  </div>
              }
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.card_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.set_name}</p>
              </div>
            </button>
            <button
              onClick={() => handleAddToCollection(item)}
              className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
              title="Add to collection"
            >
              +
            </button>
            <button
              onClick={() => handleRemove(item.printing_id)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-maroon)', color: '#fff' }}
              title="Remove from wishlist"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
