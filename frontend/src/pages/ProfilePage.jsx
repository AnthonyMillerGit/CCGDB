import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

async function triggerDownload(authFetch, url, filename) {
  const res = await authFetch(url)
  if (!res.ok) return
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false)
  const formats = [
    { label: 'CSV', value: 'csv' },
    { label: 'JSON', value: 'json' },
    { label: 'TXT', value: 'txt' },
  ]
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
        style={{ backgroundColor: '#363d52', color: '#08D9D6', border: '1px solid #4a5268' }}
      >
        Export ▾
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 rounded shadow-lg z-10 py-1 min-w-[80px]"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
        >
          {formats.map(f => (
            <button
              key={f.value}
              onClick={e => { e.stopPropagation(); setOpen(false); onExport(f.value) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#363d52] transition-colors"
              style={{ color: '#EAEAEA' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Unverified email banner ───────────────────────────────────────────────────

function UnverifiedBanner({ authFetch }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function resend() {
    setLoading(true)
    await authFetch(`${API_URL}/api/auth/resend-verification`, { method: 'POST' })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="mb-6 px-4 py-3 rounded flex items-center justify-between gap-4"
      style={{ backgroundColor: '#3a3a1a', border: '1px solid #6a6a2d', color: '#f4c542' }}>
      <span className="text-sm">Your email isn't verified yet. Check your inbox for a verification link.</span>
      {!sent ? (
        <button onClick={resend} disabled={loading}
          className="text-xs font-semibold whitespace-nowrap disabled:opacity-50"
          style={{ color: '#f4c542' }}>
          {loading ? 'Sending…' : 'Resend email'}
        </button>
      ) : (
        <span className="text-xs">Sent!</span>
      )}
    </div>
  )
}

// ── Quantity controls ─────────────────────────────────────────────────────────

function QuantityControl({ quantity, onIncrease, onDecrease }) {
  return (
    <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
      <button
        onClick={onDecrease}
        className="w-6 h-6 rounded text-sm font-bold flex items-center justify-center transition-colors"
        style={{ backgroundColor: '#363d52', color: quantity === 1 ? '#FF2E63' : '#EAEAEA' }}
        title={quantity === 1 ? 'Remove from collection' : 'Remove one copy'}
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold" style={{ color: '#08D9D6' }}>
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        className="w-6 h-6 rounded text-sm font-bold flex items-center justify-center transition-colors"
        style={{ backgroundColor: '#363d52', color: '#EAEAEA' }}
        title="Add one copy"
      >
        +
      </button>
    </div>
  )
}

// ── Game section (collapsible) ────────────────────────────────────────────────

function GameSection({ game, onIncrease, onDecrease }) {
  const [collapsed, setCollapsed] = useState(false)
  const totalCopies = game.cards.reduce((s, c) => s + c.quantity, 0)

  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid #363d52' }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
        style={{ backgroundColor: '#2d3243' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold" style={{ color: '#EAEAEA' }}>{game.game_name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#363d52', color: '#8892a4' }}>
            {game.cards.length} {game.cards.length === 1 ? 'card' : 'cards'} · {totalCopies} {totalCopies === 1 ? 'copy' : 'copies'}
          </span>
        </div>
        <span style={{ color: '#8892a4' }}>{collapsed ? '▶' : '▼'}</span>
      </button>

      {/* Card grid */}
      {!collapsed && (
        <div className="p-4" style={{ backgroundColor: '#1e2330' }}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {game.cards.map(card => (
              <div key={card.id} className="flex flex-col">
                <Link to={`/cards/${card.card_id}`} className="block relative group">
                  <div
                    className="rounded-lg overflow-hidden transition-all duration-150 group-hover:ring-1"
                    style={{ backgroundColor: '#2d3243', ringColor: '#08D9D6' }}
                  >
                    {card.image_url ? (
                      <img src={card.image_url} alt={card.card_name} className="w-full" />
                    ) : (
                      <div className="aspect-[2.5/3.5] flex items-center justify-center p-2"
                        style={{ backgroundColor: '#363d52' }}>
                        <span className="text-xs text-center leading-tight" style={{ color: '#8892a4' }}>
                          {card.card_name}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <p className="text-xs font-medium mt-1 truncate" style={{ color: '#EAEAEA' }} title={card.card_name}>
                  {card.card_name}
                </p>
                <p className="text-xs truncate mb-1" style={{ color: '#8892a4' }} title={card.set_name}>
                  {card.set_name}
                </p>
                <QuantityControl
                  quantity={card.quantity}
                  onIncrease={() => onIncrease(game.game_id, card)}
                  onDecrease={() => onDecrease(game.game_id, card)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── My Decks tab ──────────────────────────────────────────────────────────────

function MyDecksTab({ authFetch }) {
  const navigate = useNavigate()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckGame, setNewDeckGame] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API_URL}/api/users/me/decks`)
        const data = await res.json()
        setDecks(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authFetch])

  async function openForm() {
    setShowForm(true)
    if (games.length === 0) {
      const res = await fetch(`${API_URL}/api/games`)
      const data = await res.json()
      setGames(Array.isArray(data) ? data : [])
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newDeckName.trim() || !newDeckGame) return
    setCreating(true)
    const res = await authFetch(`${API_URL}/api/users/me/decks`, {
      method: 'POST',
      body: JSON.stringify({ game_id: parseInt(newDeckGame), name: newDeckName.trim() }),
    })
    if (res.ok) {
      const deck = await res.json()
      navigate(`/decks/${deck.id}`)
    }
    setCreating(false)
  }

  async function handleDelete(deckId) {
    await authFetch(`${API_URL}/api/decks/${deckId}`, { method: 'DELETE' })
    setDecks(prev => prev.filter(d => d.id !== deckId))
  }

  const inputStyle = { backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }

  if (loading) return <p style={{ color: '#8892a4' }}>Loading decks…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm" style={{ color: '#8892a4' }}>
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
        </span>
        {!showForm && (
          <button
            onClick={openForm}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
          >
            + New Deck
          </button>
        )}
      </div>

      {/* Create deck form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row gap-3"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}>
          <input
            type="text"
            placeholder="Deck name"
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded text-sm"
            style={inputStyle}
          />
          <select
            value={newDeckGame}
            onChange={e => setNewDeckGame(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded text-sm"
            style={inputStyle}
          >
            <option value="">Select a game…</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#08D9D6', color: '#252A34' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: '#363d52', color: '#EAEAEA' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {decks.length === 0 && !showForm && (
        <div className="text-center py-20" style={{ color: '#8892a4' }}>
          <p className="text-lg mb-2">No decks yet.</p>
          <p>Hit <strong style={{ color: '#EAEAEA' }}>+ New Deck</strong> to build your first one.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {decks.map(deck => (
          <div key={deck.id}
            className="flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-colors"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
            onClick={() => navigate(`/decks/${deck.id}`)}
          >
            <div>
              <p className="font-semibold" style={{ color: '#EAEAEA' }}>{deck.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs" style={{ color: '#08D9D6' }}>{deck.game_name}</span>
                <span className="text-xs" style={{ color: '#8892a4' }}>
                  {deck.total_cards} {deck.total_cards === 1 ? 'card' : 'cards'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <ExportMenu onExport={fmt =>
                triggerDownload(authFetch, `${API_URL}/api/decks/${deck.id}/export?format=${fmt}`, `${deck.name}.${fmt}`)
              } />
              <button
                onClick={e => { e.stopPropagation(); handleDelete(deck.id) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: '#363d52', color: '#FF2E63' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, authFetch, logout } = useAuth()
  const navigate = useNavigate()
  const [fullUser, setFullUser] = useState(null)
  const [collection, setCollection] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'decks' ? 'decks' : 'collection')

  useEffect(() => {
    async function load() {
      try {
        const [userRes, collRes] = await Promise.all([
          authFetch(`${API_URL}/api/auth/me`),
          authFetch(`${API_URL}/api/users/me/collection`),
        ])
        const [userData, collectionData] = await Promise.all([userRes.json(), collRes.json()])
        setFullUser(userData)
        setCollection(Array.isArray(collectionData) ? collectionData : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authFetch])

  const handleIncrease = useCallback(async (gameId, card) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: card.printing_id, quantity: 1 }),
    })
    if (!res.ok) return
    const result = await res.json()
    setCollection(prev => prev.map(g =>
      g.game_id !== gameId ? g : {
        ...g,
        cards: g.cards.map(c =>
          c.printing_id === card.printing_id ? { ...c, quantity: result.quantity } : c
        )
      }
    ))
  }, [authFetch])

  const handleDecrease = useCallback(async (gameId, card) => {
    if (card.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, { method: 'DELETE' })
      if (!res.ok) return
      setCollection(prev => prev
        .map(g => g.game_id !== gameId ? g : { ...g, cards: g.cards.filter(c => c.printing_id !== card.printing_id) })
        .filter(g => g.cards.length > 0)
      )
    } else {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: card.quantity - 1 }),
      })
      if (!res.ok) return
      const result = await res.json()
      setCollection(prev => prev.map(g =>
        g.game_id !== gameId ? g : {
          ...g,
          cards: g.cards.map(c =>
            c.printing_id === card.printing_id ? { ...c, quantity: result.quantity } : c
          )
        }
      ))
    }
  }, [authFetch])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const totalUnique = collection.reduce((s, g) => s + g.cards.length, 0)
  const totalCopies = collection.reduce((s, g) => s + g.cards.reduce((cs, c) => cs + c.quantity, 0), 0)

  const memberSince = fullUser?.created_at
    ? new Date(fullUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="max-w-5xl mx-auto">
      {user && !user.is_verified && <UnverifiedBanner authFetch={authFetch} />}

      {/* Account card */}
      <div
        className="rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
          >
            {initials}
          </div>
          {/* Info */}
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#EAEAEA' }}>{user?.username}</h2>
            <p className="text-sm" style={{ color: '#8892a4' }}>{user?.email}</p>
            <div className="flex items-center gap-3 mt-1">
              {user?.is_verified ? (
                <span className="text-xs font-medium" style={{ color: '#08D9D6' }}>Verified</span>
              ) : (
                <span className="text-xs" style={{ color: '#f4c542' }}>Unverified</span>
              )}
              {memberSince && (
                <>
                  <span style={{ color: '#363d52' }}>·</span>
                  <span className="text-xs" style={{ color: '#8892a4' }}>Member since {memberSince}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="self-start sm:self-auto px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: '#363d52', color: '#EAEAEA', border: '1px solid #4a5268' }}
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 gap-1 border-b" style={{ borderColor: '#363d52' }}>
        {[['collection', 'My Collection'], ['decks', 'My Decks']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2"
            style={{
              borderColor: activeTab === key ? '#08D9D6' : 'transparent',
              color: activeTab === key ? '#08D9D6' : '#8892a4',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My Collection tab */}
      {activeTab === 'collection' && (
        <>
          <div className="flex items-center justify-between mb-6">
            {!loading && totalUnique > 0 && (
              <div className="flex gap-4 text-sm" style={{ color: '#8892a4' }}>
                <span><strong style={{ color: '#EAEAEA' }}>{collection.length}</strong> games</span>
                <span><strong style={{ color: '#EAEAEA' }}>{totalUnique}</strong> unique cards</span>
                <span><strong style={{ color: '#EAEAEA' }}>{totalCopies}</strong> total copies</span>
              </div>
            )}
            {!loading && totalUnique > 0 && (
              <ExportMenu onExport={fmt =>
                triggerDownload(authFetch, `${API_URL}/api/users/me/collection/export?format=${fmt}`, `collection.${fmt}`)
              } />
            )}
          </div>

          {loading && <p style={{ color: '#8892a4' }}>Loading collection…</p>}

          {!loading && collection.length === 0 && (
            <div className="text-center py-20" style={{ color: '#8892a4' }}>
              <p className="text-lg mb-2">Your collection is empty.</p>
              <p>
                Browse <Link to="/" style={{ color: '#08D9D6' }}>games</Link> and use the{' '}
                <strong style={{ color: '#EAEAEA' }}>+</strong> button on any card to get started.
              </p>
            </div>
          )}

          {!loading && collection.map(game => (
            <GameSection
              key={game.game_id}
              game={game}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          ))}
        </>
      )}

      {/* My Decks tab */}
      {activeTab === 'decks' && <MyDecksTab authFetch={authFetch} />}
    </div>
  )
}
