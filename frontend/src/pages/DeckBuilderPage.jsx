import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

// ── Deck card row (left panel) ────────────────────────────────────────────────

function DeckCardRow({ card, onIncrease, onDecrease }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5"
      style={{ borderBottom: '1px solid #252A34' }}>
      {card.image_url
        ? <img src={card.image_url} alt={card.card_name} className="w-7 rounded flex-shrink-0" />
        : <div className="w-7 h-10 rounded flex-shrink-0" style={{ backgroundColor: '#363d52' }} />
      }
      <div className="flex-1 min-w-0">
        <Link to={`/cards/${card.card_id}`} target="_blank"
          className="text-xs font-medium truncate block hover:underline"
          style={{ color: '#EAEAEA' }} title={card.card_name}>
          {card.card_name}
        </Link>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onDecrease}
          className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#363d52', color: card.quantity === 1 ? '#FF2E63' : '#EAEAEA' }}>
          −
        </button>
        <span className="w-6 text-center text-xs font-bold" style={{ color: '#08D9D6' }}>
          {card.quantity}
        </span>
        <button onClick={onIncrease}
          className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#363d52', color: '#EAEAEA' }}>
          +
        </button>
      </div>
    </div>
  )
}

// ── Search result card (right panel grid) ─────────────────────────────────────

function SearchCard({ card, deckQty, onAdd, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-150"
      style={{ backgroundColor: '#2d3243', borderColor: deckQty > 0 ? '#08D9D6' : '#363d52' }}
      onClick={onAdd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {deckQty > 0 && (
        <div className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: '#08D9D6', color: '#252A34' }}>
          ×{deckQty}
        </div>
      )}
      {card.image_url
        ? <img src={card.image_url} alt={card.name} className="w-full" />
        : <div className="aspect-[2.5/3.5] flex items-center justify-center p-2"
            style={{ backgroundColor: '#363d52' }}>
            <span className="text-xs text-center" style={{ color: '#8892a4' }}>{card.name}</span>
          </div>
      }
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium truncate" style={{ color: '#EAEAEA' }}>{card.name}</p>
        <p className="text-xs truncate" style={{ color: '#8892a4' }}>{card.card_type}</p>
      </div>
    </div>
  )
}

const isTouchDevice = window.matchMedia('(hover: none)').matches

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DeckBuilderPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const { authFetch } = useAuth()

  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editingFormat, setEditingFormat] = useState(false)
  const [formatInput, setFormatInput] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)
  const searchInputRef = useRef(null)

  // Hover tooltip
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    authFetch(`${API_URL}/api/decks/${deckId}`)
      .then(r => r.json())
      .then(data => { setDeck(data); setNameInput(data.name); setLoading(false) })
  }, [deckId, authFetch])

  useEffect(() => {
    if (!deck) return
    clearTimeout(searchTimer.current)
    if (searchQuery.trim().length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(
        `${API_URL}/api/cards/search?name=${encodeURIComponent(searchQuery)}&game=${deck.game_slug}`
      )
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery, deck])

  const cardQtyMap = deck ? Object.fromEntries(deck.cards.map(c => [c.card_id, c.quantity])) : {}
  const totalCards = deck?.cards.reduce((s, c) => s + c.quantity, 0) ?? 0
  const uniqueCards = deck?.cards.length ?? 0

  const grouped = deck?.cards.reduce((acc, card) => {
    const type = card.card_type || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(card)
    return acc
  }, {}) ?? {}

  async function saveName() {
    if (!nameInput.trim() || nameInput === deck.name) { setEditingName(false); return }
    await authFetch(`${API_URL}/api/decks/${deckId}`, {
      method: 'PATCH', body: JSON.stringify({ name: nameInput.trim() }),
    })
    setDeck(prev => ({ ...prev, name: nameInput.trim() }))
    setEditingName(false)
  }

  async function saveFormat() {
    const trimmed = formatInput.trim()
    if (trimmed === (deck.format || '')) { setEditingFormat(false); return }
    await authFetch(`${API_URL}/api/decks/${deckId}`, {
      method: 'PATCH', body: JSON.stringify({ format: trimmed }),
    })
    setDeck(prev => ({ ...prev, format: trimmed }))
    setEditingFormat(false)
  }

  async function handleAdd(card) {
    const res = await authFetch(`${API_URL}/api/decks/${deckId}/cards`, {
      method: 'POST', body: JSON.stringify({ card_id: card.id, quantity: 1 }),
    })
    if (!res.ok) return
    setDeck(prev => {
      const existing = prev.cards.find(c => c.card_id === card.id)
      if (existing) {
        return { ...prev, cards: prev.cards.map(c => c.card_id === card.id ? { ...c, quantity: c.quantity + 1 } : c) }
      }
      return { ...prev, cards: [...prev.cards, { card_id: card.id, card_name: card.name, card_type: card.card_type, image_url: card.image_url, quantity: 1 }] }
    })
    searchInputRef.current?.focus()
  }

  async function handleIncrease(card) {
    const res = await authFetch(`${API_URL}/api/decks/${deckId}/cards`, {
      method: 'POST', body: JSON.stringify({ card_id: card.card_id, quantity: 1 }),
    })
    if (!res.ok) return
    setDeck(prev => ({ ...prev, cards: prev.cards.map(c => c.card_id === card.card_id ? { ...c, quantity: c.quantity + 1 } : c) }))
  }

  async function handleDecrease(card) {
    if (card.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/decks/${deckId}/cards/${card.card_id}`, { method: 'DELETE' })
      if (!res.ok) return
      setDeck(prev => ({ ...prev, cards: prev.cards.filter(c => c.card_id !== card.card_id) }))
    } else {
      const res = await authFetch(`${API_URL}/api/decks/${deckId}/cards/${card.card_id}`, {
        method: 'PATCH', body: JSON.stringify({ quantity: card.quantity - 1 }),
      })
      if (!res.ok) return
      setDeck(prev => ({ ...prev, cards: prev.cards.map(c => c.card_id === card.card_id ? { ...c, quantity: c.quantity - 1 } : c) }))
    }
  }

  function handleMouseEnter(e, card) {
    if (!card.image_url || isTouchDevice) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2 - 180,
      y: rect.top + rect.height / 2 - 250,
    })
    setHoveredCard(card)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: '#8892a4' }}>Loading deck…</p>
    </div>
  )
  if (!deck) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: '#8892a4' }}>Deck not found.</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/profile?tab=decks')}
          className="text-sm mb-3 flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: '#08D9D6' }}>
          ← My Decks
        </button>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-2xl font-bold bg-transparent border-b outline-none"
                style={{ color: '#EAEAEA', borderColor: '#08D9D6' }}
              />
            ) : (
              <h2
                className="text-2xl font-bold cursor-pointer group flex items-center gap-2"
                style={{ color: '#EAEAEA' }}
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                {deck.name}
                <span className="text-sm font-normal opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#8892a4' }}>
                  edit
                </span>
              </h2>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm font-medium" style={{ color: '#08D9D6' }}>{deck.game_name}</span>
              <span style={{ color: '#363d52' }}>·</span>
              <span className="text-sm" style={{ color: '#8892a4' }}>
                {uniqueCards} unique · {totalCards} total
              </span>
              <span style={{ color: '#363d52' }}>·</span>
              {editingFormat ? (
                <input
                  autoFocus
                  value={formatInput}
                  onChange={e => setFormatInput(e.target.value)}
                  onBlur={saveFormat}
                  onKeyDown={e => { if (e.key === 'Enter') saveFormat(); if (e.key === 'Escape') setEditingFormat(false) }}
                  placeholder="e.g. Standard, Casual, Commander"
                  className="text-sm bg-transparent border-b outline-none"
                  style={{ color: '#EAEAEA', borderColor: '#08D9D6', minWidth: '180px' }}
                />
              ) : (
                <button
                  onClick={() => { setFormatInput(deck.format || ''); setEditingFormat(true) }}
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={deck.format
                    ? { backgroundColor: '#363d52', color: '#EAEAEA', padding: '2px 8px', borderRadius: '4px', border: '1px solid #4a5268' }
                    : { color: '#4a5268' }
                  }
                >
                  {deck.format || '+ format'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left — deck list */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="rounded-xl overflow-hidden sticky top-4" style={{ border: '1px solid #363d52' }}>
            <div className="px-3 py-2.5 flex items-center justify-between"
              style={{ backgroundColor: '#2d3243', borderBottom: '1px solid #363d52' }}>
              <p className="text-sm font-semibold" style={{ color: '#EAEAEA' }}>Deck List</p>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#363d52', color: '#08D9D6' }}>
                {totalCards}
              </span>
            </div>
            <div className="overflow-y-auto" style={{ backgroundColor: '#1e2330', maxHeight: 'calc(100vh - 220px)' }}>
              {deck.cards.length === 0 ? (
                <p className="text-xs text-center py-8 px-4" style={{ color: '#8892a4' }}>
                  Search for cards on the right to add them.
                </p>
              ) : (
                Object.entries(grouped).sort().map(([type, cards]) => (
                  <div key={type}>
                    <p className="text-xs font-semibold px-3 py-1.5 sticky top-0 flex items-center justify-between"
                      style={{ backgroundColor: '#252A34', color: '#8892a4' }}>
                      <span>{type}</span>
                      <span style={{ color: '#363d52' }}>{cards.reduce((s, c) => s + c.quantity, 0)}</span>
                    </p>
                    {cards.map(card => (
                      <DeckCardRow key={card.card_id} card={card}
                        onIncrease={() => handleIncrease(card)}
                        onDecrease={() => handleDecrease(card)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right — card search */}
        <div className="flex-1 min-w-0">
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: '#8892a4' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${deck.game_name} cards…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#EAEAEA' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="text-xs" style={{ color: '#8892a4' }}>
                ✕
              </button>
            )}
          </div>

          {/* States */}
          {searchQuery.trim().length < 2 && (
            <div className="text-center py-16">
              <p className="text-lg mb-1" style={{ color: '#8892a4' }}>Find cards to add</p>
              <p className="text-sm" style={{ color: '#363d52' }}>
                Search by card name — results are scoped to {deck.game_name}
              </p>
            </div>
          )}
          {searching && (
            <p className="text-sm text-center py-8" style={{ color: '#8892a4' }}>Searching…</p>
          )}
          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: '#8892a4' }}>
              No cards found for "{searchQuery}"
            </p>
          )}

          {/* Card grid */}
          {!searching && searchResults.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
              {searchResults.map(card => (
                <SearchCard
                  key={card.id}
                  card={card}
                  deckQty={cardQtyMap[card.id] || 0}
                  onAdd={() => handleAdd(card)}
                  onMouseEnter={e => handleMouseEnter(e, card)}
                  onMouseLeave={() => setHoveredCard(null)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Hover tooltip */}
      {hoveredCard?.image_url && (
        <div className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)),
            top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)),
            width: 360,
            border: '2px solid #08D9D6',
            backgroundColor: '#2d3243',
            boxShadow: '0 0 40px rgba(8, 217, 214, 0.3)',
          }}>
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
          <div className="p-2">
            <p className="text-sm font-semibold" style={{ color: '#EAEAEA' }}>{hoveredCard.name}</p>
            {hoveredCard.card_type && (
              <p className="text-xs" style={{ color: '#08D9D6' }}>{hoveredCard.card_type}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
