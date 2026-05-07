import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { RARITY_COLORS, normalizeRarity } from '../theme'

export default function CollectionCardPage() {
  const { gameSlug, cardId } = useParams()
  const { authFetch } = useAuth()

  const [card, setCard] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [cardRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/api/cards/${cardId}`),
        authFetch(`${API_URL}/api/users/me/collection/card/${cardId}`),
      ])
      const cardData = await cardRes.json()
      const itemsData = await itemsRes.json()
      setCard(cardData)
      setItems(Array.isArray(itemsData) ? itemsData : [])
      setLoading(false)
    }
    load()
  }, [cardId, authFetch])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-muted)' }}>Card not found.</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link to="/profile" style={{ color: 'var(--accent)' }}>My Collection</Link>
        <span>›</span>
        <Link to={`/collection/${gameSlug}`} style={{ color: 'var(--accent)' }}>{card.game}</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{card.name}</span>
      </nav>

      {/* Card header */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>{card.game}</p>
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{card.name}</h1>
        <div className="flex items-center gap-4">
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>{card.card_type}</p>
          <Link
            to={`/cards/${card.id}`}
            className="text-sm"
            style={{ color: 'var(--accent)' }}
          >
            View full card details →
          </Link>
        </div>
      </div>

      {/* Owned printings */}
      {items.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p>This card is no longer in your collection.</p>
          <Link to={`/collection/${gameSlug}`} className="text-sm mt-2 block" style={{ color: 'var(--accent)' }}>
            ← Back to collection
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            In Your Collection
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {items.map(item => (
              <PrintingCard key={`${item.printing_id}-${item.finish}`} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PrintingCard({ item }) {
  const rarityColor = RARITY_COLORS[normalizeRarity(item.rarity)] || 'var(--text-muted)'

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: item.finish === 'foil' ? '#facc1544' : 'var(--border)' }}>
      {/* Card image */}
      {item.image_url ? (
        <img src={item.image_url} alt={item.set_name} className="w-full" />
      ) : (
        <div className="aspect-[2.5/3.5] flex items-center justify-center p-4"
          style={{ backgroundColor: '#2e2e38' }}>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{item.set_name}</span>
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}
          title={item.set_name}>{item.set_name}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.rarity && (
              <span className="text-xs capitalize" style={{ color: rarityColor }}>{item.rarity}</span>
            )}
            {item.finish === 'foil' && (
              <span className="text-xs font-semibold" style={{ color: '#facc15' }}>✦ Foil</span>
            )}
          </div>
          <span
            className={`text-sm font-bold px-2 py-0.5 rounded${item.finish === 'foil' ? ' foil-rainbow' : ''}`}
            style={{ backgroundColor: 'var(--bg-chip)', ...(item.finish === 'foil' ? {} : { color: 'var(--accent)' }) }}
          >
            ×{item.quantity}
          </span>
        </div>

        {item.collector_number && (
          <p className="text-xs" style={{ color: '#9e836a' }}>#{item.collector_number}</p>
        )}
      </div>
    </div>
  )
}
