import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

// ── Deck card row (left panel) ────────────────────────────────────────────────

function DeckCardRow({ card, onIncrease, onDecrease, onMouseEnter, onMouseLeave, onSetThumbnail, isThumbnail }) {
  return (
    <div className="group flex items-center gap-2 px-3 py-1.5"
      style={{ borderBottom: '1px solid #f5f0e8' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {card.image_url
        ? <img src={card.image_url} alt={card.card_name} className="w-7 rounded flex-shrink-0" />
        : <div className="w-7 h-10 rounded flex-shrink-0" style={{ backgroundColor: 'var(--bg-chip)' }} />
      }
      <div className="flex-1 min-w-0">
        <Link to={`/cards/${card.card_id}`} target="_blank"
          className="text-xs font-medium truncate block hover:underline"
          style={{ color: 'var(--text-primary)' }} title={card.card_name}>
          {card.card_name}
        </Link>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onDecrease}
          className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--bg-chip)', color: card.quantity === 1 ? 'var(--accent-maroon)' : 'var(--text-primary)' }}>
          −
        </button>
        <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--accent)' }}>
          {card.quantity}
        </span>
        <button onClick={onIncrease}
          className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}>
          +
        </button>
        <button
          onClick={e => { e.stopPropagation(); onSetThumbnail() }}
          title={isThumbnail ? 'Deck thumbnail' : 'Set as deck thumbnail'}
          className={`w-6 h-6 flex items-center justify-center rounded transition-opacity ${isThumbnail ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ color: isThumbnail ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
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
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: deckQty > 0 ? 'var(--accent)' : 'var(--border)' }}
      onClick={onAdd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {deckQty > 0 && (
        <div className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
          ×{deckQty}
        </div>
      )}
      {card.image_url
        ? <img src={card.image_url} alt={card.name} className="w-full" />
        : <div className="aspect-[2.5/3.5] flex items-center justify-center p-2"
            style={{ backgroundColor: 'var(--bg-chip)' }}>
            <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{card.name}</span>
          </div>
      }
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{card.card_type}</p>
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
  const [notesInput, setNotesInput] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  // Hover tooltip
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)

  useEffect(() => {
    authFetch(`${API_URL}/api/decks/${deckId}`)
      .then(r => r.json())
      .then(data => { setDeck(data); setNameInput(data.name); setNotesInput(data.description || ''); setLoading(false) })
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchQuery('')
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  async function saveNotes() {
    if (notesInput === (deck.description || '')) return
    await authFetch(`${API_URL}/api/decks/${deckId}`, {
      method: 'PATCH', body: JSON.stringify({ description: notesInput }),
    })
    setDeck(prev => ({ ...prev, description: notesInput }))
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

  async function handleSetThumbnail(card) {
    await authFetch(`${API_URL}/api/decks/${deckId}`, {
      method: 'PATCH',
      body: JSON.stringify({ thumbnail_card_id: card.card_id }),
    })
    setDeck(prev => ({ ...prev, thumbnail_card_id: card.card_id }))
  }

  function handleDeckListHover(card) {
    if (!card.image_url || isTouchDevice) return
    setHoveredCard(card)
    setTooltipPos(null)
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
      <p style={{ color: 'var(--text-muted)' }}>Loading deck…</p>
    </div>
  )
  if (!deck) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: 'var(--text-muted)' }}>Deck not found.</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/profile?tab=decks')}
          className="text-sm mb-3 flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent)' }}>
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
                style={{ color: 'var(--text-primary)', borderColor: 'var(--accent)' }}
              />
            ) : (
              <h2
                className="text-2xl font-bold cursor-pointer group flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                {deck.name}
                <span className="text-sm font-normal opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}>
                  edit
                </span>
              </h2>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{deck.game_name}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {uniqueCards} unique · {totalCards} total
              </span>
              <span style={{ color: 'var(--border)' }}>·</span>
              {editingFormat ? (
                <input
                  autoFocus
                  value={formatInput}
                  onChange={e => setFormatInput(e.target.value)}
                  onBlur={saveFormat}
                  onKeyDown={e => { if (e.key === 'Enter') saveFormat(); if (e.key === 'Escape') setEditingFormat(false) }}
                  placeholder="e.g. Standard, Casual, Commander"
                  className="text-sm bg-transparent border-b outline-none"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--accent)', minWidth: '180px' }}
                />
              ) : (
                <button
                  onClick={() => { setFormatInput(deck.format || ''); setEditingFormat(true) }}
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={deck.format
                    ? { backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #9e836a' }
                    : { color: '#9e836a' }
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
          <div className="rounded-xl overflow-hidden sticky top-4" style={{ border: '1px solid var(--border)' }}>
            <div className="px-3 py-2.5"
              style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Deck List</p>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)' }}>
                  {totalCards}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Hover a card and click
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline mx-1 align-middle" style={{ color: 'var(--accent)' }}>
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                to set the deck cover.
              </p>
            </div>
            <div className="overflow-y-auto" style={{ backgroundColor: 'var(--bg-chip)', maxHeight: 'calc(100vh - 220px)' }}>
              {deck.cards.length === 0 ? (
                <p className="text-xs text-center py-8 px-4" style={{ color: 'var(--text-muted)' }}>
                  Search for cards on the right to add them.
                </p>
              ) : (
                Object.entries(grouped).sort().map(([type, cards]) => (
                  <div key={type}>
                    <p className="text-xs font-semibold px-3 py-1.5 sticky top-0 flex items-center justify-between"
                      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}>
                      <span>{type}</span>
                      <span style={{ color: 'var(--border)' }}>{cards.reduce((s, c) => s + c.quantity, 0)}</span>
                    </p>
                    {cards.map(card => (
                      <DeckCardRow key={card.card_id} card={card}
                        onIncrease={() => handleIncrease(card)}
                        onDecrease={() => handleDecrease(card)}
                        onMouseEnter={() => handleDeckListHover(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onSetThumbnail={() => handleSetThumbnail(card)}
                        isThumbnail={deck.thumbnail_card_id === card.card_id}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right — card search */}
        <div className="flex-1 min-w-0" ref={searchContainerRef}>
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}>
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
              style={{ color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ✕
              </button>
            )}
          </div>

          {/* Card preview / empty state */}
          {searchQuery.trim().length < 2 && (
            <div className="flex justify-center py-6">
              {hoveredCard?.image_url ? (
                <div className="rounded-xl overflow-hidden shadow-2xl transition-all duration-150"
                  style={{
                    width: '320px',
                    border: '2px solid var(--accent)',
                    backgroundColor: 'var(--bg-surface)',
                    boxShadow: '0 0 40px rgba(8, 217, 214, 0.25)',
                  }}>
                  <img src={hoveredCard.image_url} alt={hoveredCard.card_name || hoveredCard.name} className="w-full" />
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {hoveredCard.card_name || hoveredCard.name}
                    </p>
                    {hoveredCard.card_type && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>{hoveredCard.card_type}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="rounded-xl mx-auto mb-4"
                    style={{ width: '160px', aspectRatio: '2.5/3.5', border: '2px dashed var(--border)', backgroundColor: 'var(--bg-surface)' }} />
                  <p className="text-base mb-1" style={{ color: 'var(--text-muted)' }}>Hover a card to preview</p>
                  <p className="text-sm" style={{ color: 'var(--border)' }}>
                    Search by name to add cards — scoped to {deck.game_name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes — always visible when not searching */}
          {searchQuery.trim().length < 2 && (
            <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <p className="px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Notes
              </p>
              <textarea
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                onBlur={saveNotes}
                placeholder="Strategy, sideboard notes, card considerations…"
                rows={5}
                className="w-full px-3 py-2.5 text-sm bg-transparent outline-none resize-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {searching && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Searching…</p>
          )}
          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
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

      {/* Hover tooltip — search results only */}
      {hoveredCard?.image_url && tooltipPos && (
        <div className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)),
            top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)),
            width: 360,
            border: '2px solid #0097a7',
            backgroundColor: 'var(--bg-surface)',
            boxShadow: '0 0 40px rgba(8, 217, 214, 0.3)',
          }}>
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
          <div className="p-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{hoveredCard.name}</p>
            {hoveredCard.card_type && (
              <p className="text-xs" style={{ color: 'var(--accent)' }}>{hoveredCard.card_type}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
