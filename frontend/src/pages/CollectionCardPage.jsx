import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { RARITY_COLORS, normalizeRarity } from '../theme'

const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }
const CONDITION_COLORS = { NM: '#4ade80', LP: '#a3e635', MP: '#facc15', HP: '#fb923c', DM: '#f87171' }
const FINISHES = ['normal', 'foil', 'special foil']

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

  const handleIncrease = useCallback(async (item) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: item.printing_id, quantity: 1, finish: item.finish }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, quantity: result.quantity } : i
    ))
  }, [authFetch])

  const handleDecrease = useCallback(async (item) => {
    if (item.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}?finish=${item.finish}`, { method: 'DELETE' })
      if (!res.ok) return
      setItems(prev => prev.filter(i => !(i.printing_id === item.printing_id && i.finish === item.finish)))
      return
    }
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ quantity: item.quantity - 1, finish: item.finish, printing_id: item.printing_id }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, quantity: result.quantity } : i
    ))
  }, [authFetch])

  const handleConditionChange = useCallback(async (item, newCondition) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: item.printing_id, quantity: item.quantity, finish: item.finish, condition: newCondition }),
    })
    if (!res.ok) return
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, condition: newCondition } : i
    ))
  }, [authFetch])

  const handleFinishChange = useCallback(async (item, newFinish) => {
    if (newFinish === item.finish) return
    // Check if this finish already exists — if so, merge quantities
    const existing = items.find(i => i.printing_id === item.printing_id && i.finish === newFinish)
    await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}?finish=${item.finish}`, { method: 'DELETE' })
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({
        printing_id: item.printing_id,
        quantity: item.quantity + (existing?.quantity ?? 0),
        finish: newFinish,
        condition: item.condition,
      }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => {
      const without = prev.filter(i => !(i.printing_id === item.printing_id && (i.finish === item.finish || i.finish === newFinish)))
      return [...without, { ...item, finish: newFinish, quantity: result.quantity }]
    })
  }, [authFetch, items])

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
          <Link to={`/cards/${card.id}`} className="text-sm" style={{ color: 'var(--accent)' }}>
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
              <PrintingCard
                key={`${item.printing_id}-${item.finish}`}
                item={item}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                onConditionChange={handleConditionChange}
                onFinishChange={handleFinishChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PrintingCard({ item, onIncrease, onDecrease, onConditionChange, onFinishChange }) {
  const rarityColor = RARITY_COLORS[normalizeRarity(item.rarity)] || 'var(--text-muted)'
  const conditionColor = CONDITION_COLORS[item.condition] || CONDITION_COLORS.NM

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: item.finish === 'foil' ? '#facc1544' : 'var(--border)' }}>
      {/* Card image */}
      {item.image_url ? (
        <img src={item.image_url} alt={item.set_name} className="w-full" />
      ) : (
        <div className="aspect-[2.5/3.5] flex items-center justify-center p-4" style={{ backgroundColor: '#2e2e38' }}>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{item.set_name}</span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-2.5">
        {/* Set name + rarity */}
        <div>
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }} title={item.set_name}>
            {item.set_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.rarity && <span className="text-xs capitalize" style={{ color: rarityColor }}>{item.rarity}</span>}
            {item.collector_number && <span className="text-xs" style={{ color: '#9e836a' }}>#{item.collector_number}</span>}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Quantity</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDecrease(item)}
              className="w-6 h-6 rounded text-sm font-bold flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-chip)', color: '#e05c5c', border: '1px solid var(--border)' }}
            >−</button>
            <span className={`text-sm font-bold w-6 text-center${item.finish === 'foil' ? ' foil-rainbow' : ''}`}
              style={item.finish === 'foil' ? {} : { color: 'var(--text-primary)' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => onIncrease(item)}
              className="w-6 h-6 rounded text-sm font-bold flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            >+</button>
          </div>
        </div>

        {/* Finish */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Finish</span>
          <select
            value={item.finish || 'normal'}
            onChange={e => onFinishChange(item, e.target.value)}
            className="text-xs px-2 py-1 rounded capitalize"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
          >
            {FINISHES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Condition */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Condition</span>
          <select
            value={item.condition || 'NM'}
            onChange={e => onConditionChange(item, e.target.value)}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ backgroundColor: 'var(--bg-chip)', border: `1px solid ${conditionColor}55`, color: conditionColor, outline: 'none' }}
          >
            {Object.entries(CONDITION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{val} — {label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
