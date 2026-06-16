import { useEffect, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import ConfirmModal from '../components/profile/ConfirmModal'
import ImportResultBanner from '../components/profile/ImportResultBanner'
import ExportMenu, { triggerDownload } from '../components/profile/ExportMenu'
import CollectionStatsTab from '../components/profile/CollectionStatsTab'
import MyWishlistTab from '../components/profile/MyWishlistTab'
import MyDecksTab from '../components/profile/MyDecksTab'

const AVATAR_COLORS = [
  'var(--accent)', 'var(--accent-maroon)', '#7C3AED', '#2563EB', '#16A34A',
  '#EA580C', '#CA8A04', '#DB2777', '#0891B2', '#64748B',
]

function ImportButton({ onImport, label = 'Import', importing = false }) {
  const inputRef = useRef(null)

  function handleClick(e) {
    e.stopPropagation()
    if (!importing) inputRef.current?.click()
  }

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) onImport(file)
    e.target.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.dec,.txt"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={handleClick}
        disabled={importing}
        className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
        style={{ backgroundColor: 'var(--bg-chip)', color: importing ? 'var(--text-muted)' : 'var(--accent)', border: '1px solid var(--border)', cursor: importing ? 'not-allowed' : 'pointer' }}
      >
        {importing ? 'Importing…' : label}
      </button>
    </div>
  )
}

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

function CardAvatarPicker({ authFetch, onSelect, onClose }) {
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/games`)
      .then(r => r.json())
      .then(data => setGames(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(search.trim())}${selectedGame ? `&game=${encodeURIComponent(selectedGame)}` : ''}`
    const timer = setTimeout(() => {
      fetch(url)
        .then(r => r.json())
        .then(data => { setResults(Array.isArray(data) ? data : []); setSearching(false) })
        .catch(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search, selectedGame])

  const inputStyle = { backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full mx-4 flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxWidth: '520px', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Choose Card Avatar</h2>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
          <select
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={inputStyle}
          >
            <option value="">All games</option>
            {games.map(g => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search for a card…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{ ...inputStyle, borderColor: search.length >= 2 ? 'var(--accent)' : 'var(--border)' }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {searching && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Searching…</p>
          )}
          {!searching && search.trim().length < 2 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Type at least 2 characters to search.</p>
          )}
          {!searching && search.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No cards found.</p>
          )}
          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-1">
              {results.map(card => (
                <button
                  key={`${card.id}-${card.printing_id}`}
                  onClick={() => onSelect(card.printing_id)}
                  className="rounded-lg overflow-hidden transition-transform hover:scale-105 focus:outline-none"
                  style={{ border: '2px solid var(--border)' }}
                  title={card.name}
                >
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} className="w-full block" />
                  ) : (
                    <div className="aspect-[2.5/3.5] flex items-center justify-center p-1" style={{ backgroundColor: 'var(--bg-chip)' }}>
                      <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{card.name}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, authFetch, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [fullUser, setFullUser] = useState(null)
  const [collection, setCollection] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(['collection','decks','wishlist','stats'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'collection')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (['collection','decks','wishlist','stats'].includes(tab)) setActiveTab(tab)
  }, [searchParams])

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

  function handleLogout() {
    logout()
    navigate('/')
  }

  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const colorPickerRef = useRef(null)

  useClickOutside(colorPickerRef, () => setShowColorPicker(false), showColorPicker)

  async function saveDisplayName() {
    const trimmed = displayNameInput.trim()
    if (trimmed === (fullUser?.display_name ?? '')) { setEditingDisplayName(false); return }
    const res = await authFetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name: trimmed }),
    })
    if (!res.ok) { setEditingDisplayName(false); return }
    const updated = await res.json()
    setFullUser(updated)
    updateUser({ display_name: trimmed })
    setEditingDisplayName(false)
  }

  async function handleAvatarSelect(printingId) {
    setShowAvatarPicker(false)
    const res = await authFetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      body: JSON.stringify({ avatar_printing_id: printingId }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setFullUser(updated)
    updateUser({ avatar_image_url: updated.avatar_image_url })
  }

  async function handleClearAvatar() {
    const res = await authFetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      body: JSON.stringify({ clear_avatar: true }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setFullUser(updated)
    updateUser({ avatar_image_url: '' })
  }

  async function handleColorChange(color) {
    setShowColorPicker(false)
    const res = await authFetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      body: JSON.stringify({ avatar_color: color }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setFullUser(updated)
    updateUser({ avatar_color: color })
  }

  async function handleClearGame(game) {
    setConfirm({
      message: `Are you sure you want to remove all ${game.cards.length} cards from your ${game.game_name} collection? This cannot be undone.`,
      onConfirm: async () => {
        await authFetch(`${API_URL}/api/users/me/collection/game/${game.game_id}`, { method: 'DELETE' })
        setCollection(prev => prev.filter(g => g.game_id !== game.game_id))
        setConfirm(null)
      },
    })
  }

  const totalUnique = collection.reduce((s, g) => s + g.cards.length, 0)
  const totalCopies = collection.reduce((s, g) => s + g.cards.reduce((cs, c) => cs + c.quantity, 0), 0)

  async function handleCollectionImport(file) {
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await authFetch(`${API_URL}/api/users/me/collection/upload`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Import failed'
        try { msg = JSON.parse(text).detail || msg } catch {}
        setImportResult({ error: `${msg} (${res.status})` })
        return
      }
      const data = await res.json()
      setImportResult(data)
      const collRes = await authFetch(`${API_URL}/api/users/me/collection`)
      const collectionData = await collRes.json()
      setCollection(Array.isArray(collectionData) ? collectionData : [])
    } catch (err) {
      setImportResult({ error: 'Could not reach the server — check that the API is running.' })
    } finally {
      setImporting(false)
    }
  }

  const memberSince = fullUser?.created_at
    ? new Date(fullUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null

  const displayName = fullUser?.display_name || ''
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : (user?.username?.slice(0, 2).toUpperCase() || '??')

  return (
    <div className="max-w-5xl mx-auto">
      {user && !user.is_verified && <UnverifiedBanner authFetch={authFetch} />}

      {/* Account card */}
      <div
        className="rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="relative" ref={colorPickerRef}>
              {fullUser?.avatar_image_url ? (
                <img
                  src={fullUser.avatar_image_url}
                  alt="Card avatar"
                  className="rounded-lg object-cover cursor-pointer"
                  style={{ width: '70px', height: '98px', border: '2px solid var(--border)' }}
                  onClick={() => setShowAvatarPicker(true)}
                  title="Change card avatar"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer select-none"
                  style={{ backgroundColor: fullUser?.avatar_color || 'var(--accent)', color: 'var(--bg-page)' }}
                  onClick={() => setShowColorPicker(o => !o)}
                  title="Change avatar color"
                >
                  {initials}
                </div>
              )}
              {showColorPicker && (
                <div
                  className="absolute left-0 top-16 z-20 p-2 rounded-xl shadow-xl grid gap-2"
                  style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', gridTemplateColumns: 'repeat(5, 1fr)' }}
                >
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: (fullUser?.avatar_color || 'var(--accent)') === color ? '#fff' : 'transparent',
                      }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {fullUser?.avatar_image_url ? 'Change card' : 'Choose card'}
              </button>
              {fullUser?.avatar_image_url && (
                <button
                  onClick={handleClearAvatar}
                  className="text-xs"
                  style={{ color: 'var(--accent-maroon)' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {/* Info */}
          <div>
            {editingDisplayName ? (
              <div className="flex items-center gap-2 mb-0.5">
                <input
                  autoFocus
                  className="text-lg font-bold rounded px-2 py-0.5 outline-none"
                  style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)', maxWidth: '200px' }}
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditingDisplayName(false) }}
                  maxLength={50}
                />
                <button onClick={saveDisplayName} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Save</button>
                <button onClick={() => setEditingDisplayName(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {displayName || user?.username}
                </h2>
                <button
                  onClick={() => { setDisplayNameInput(displayName); setEditingDisplayName(true) }}
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                  title="Edit display name"
                >
                  Edit
                </button>
              </div>
            )}
            {displayName && (
              <p className="text-xs -mt-0.5 mb-0.5" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
            )}
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            <div className="flex items-center gap-3 mt-1">
              {user?.is_verified ? (
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Verified</span>
              ) : (
                <span className="text-xs" style={{ color: '#f4c542' }}>Unverified</span>
              )}
              {memberSince && (
                <>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Member since {memberSince}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="self-start sm:self-auto px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {[['collection', 'My Collection'], ['decks', 'My Decks'], ['wishlist', 'Wishlist'], ['stats', 'Stats']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2"
            style={{
              borderColor: activeTab === key ? 'var(--accent)' : 'transparent',
              color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My Collection tab */}
      {activeTab === 'collection' && (
        <>
          {confirm && (
            <ConfirmModal
              message={confirm.message}
              onConfirm={confirm.onConfirm}
              onCancel={() => setConfirm(null)}
            />
          )}
          <ImportResultBanner result={importResult} onDismiss={() => setImportResult(null)} />

          <div className="flex items-center justify-between mb-6">
            {!loading && totalUnique > 0 && (
              <div className="flex gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span><strong style={{ color: 'var(--text-primary)' }}>{collection.length}</strong> games</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{totalCopies}</strong> cards</span>
              </div>
            )}
            {!loading && (
              <div className="flex items-center gap-2">
                {totalUnique > 0 && (
                  <ExportMenu onExport={fmt =>
                    triggerDownload(authFetch, `${API_URL}/api/users/me/collection/export?format=${fmt}`, `collection.${fmt}`)
                  } />
                )}
                <ImportButton onImport={handleCollectionImport} label="Import Collection" importing={importing} />
              </div>
            )}
          </div>

          {loading && <p style={{ color: 'var(--text-muted)' }}>Loading collection…</p>}

          {!loading && collection.length === 0 && (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <p className="text-lg mb-2">Your collection is empty.</p>
              <p>
                Browse <Link to="/" style={{ color: 'var(--accent)' }}>games</Link> and use the{' '}
                <strong style={{ color: 'var(--text-primary)' }}>+</strong> button on any card to get started.
              </p>
            </div>
          )}

          {!loading && collection.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {collection.map(game => {
                const gameCopies = game.cards.reduce((s, c) => s + c.quantity, 0)
                return (
                  <div key={game.game_id} className="relative flex flex-col items-center">
                    <Link
                      to={`/collection/${game.game_slug}`}
                      className="block w-full transition-all duration-150"
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="w-full rounded-xl overflow-hidden border transition-all duration-200"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
                      >
                        {game.card_back_image ? (
                          <img src={game.card_back_image} alt={game.game_name} className="w-full h-auto object-cover" />
                        ) : (
                          <div className="w-full aspect-[2.5/3.5] flex flex-col items-center justify-center gap-2 p-2" style={{ backgroundColor: 'var(--bg-surface)' }}>
                            <span className="text-2xl" style={{ color: 'var(--border)' }}>🃏</span>
                            <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{game.game_name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-center mt-1.5 leading-tight px-1" style={{ color: 'var(--text-primary)' }}>{game.game_name}</p>
                      <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{gameCopies} cards</p>
                    </Link>
                    <button
                      onClick={e => { e.preventDefault(); handleClearGame(game) }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,46,99,0.85)', color: '#fff' }}
                      title={`Remove all ${game.game_name} cards`}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'decks' && <MyDecksTab authFetch={authFetch} />}
      {activeTab === 'wishlist' && <MyWishlistTab authFetch={authFetch} />}
      {activeTab === 'stats' && <CollectionStatsTab authFetch={authFetch} collection={collection} />}

      {showAvatarPicker && (
        <CardAvatarPicker
          authFetch={authFetch}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}
