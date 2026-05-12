import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

const AVATAR_COLORS = [
  'var(--accent)', 'var(--accent-maroon)', '#7C3AED', '#2563EB', '#16A34A',
  '#EA580C', '#CA8A04', '#DB2777', '#0891B2', '#64748B',
]

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
  const ref = useRef(null)
  const formats = [
    { label: 'CSV', value: 'csv' },
    { label: 'JSON', value: 'json' },
    { label: 'TXT', value: 'txt' },
  ]

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
        style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid #9e836a' }}
      >
        Export ▾
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 rounded shadow-lg z-10 py-1 min-w-[80px]"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {formats.map(f => (
            <button
              key={f.value}
              onClick={e => { e.stopPropagation(); setOpen(false); onExport(f.value) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#d4c4a8] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
        style={{ backgroundColor: 'var(--bg-chip)', color: importing ? 'var(--text-muted)' : 'var(--accent)', border: '1px solid #9e836a', cursor: importing ? 'not-allowed' : 'pointer' }}
      >
        {importing ? 'Importing…' : label}
      </button>
    </div>
  )
}

function ImportResultBanner({ result, onDismiss }) {
  if (!result) return null
  return (
    <div
      className="mb-4 px-4 py-3 rounded flex items-center justify-between gap-4 text-sm"
      style={{
        backgroundColor: result.error ? '#3a1a1a' : '#1a3a2a',
        border: `1px solid ${result.error ? '#6a2d2d' : '#2d6a4a'}`,
        color: result.error ? 'var(--accent-maroon)' : '#1eff00',
      }}
    >
      {result.error
        ? <span>{result.error}</span>
        : <span>Imported {result.imported} card{result.imported !== 1 ? 's' : ''}{result.skipped > 0 ? ` · ${result.skipped} skipped (not found)` : ''}.</span>
      }
      <button onClick={onDismiss} style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1 }}>×</button>
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

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm mb-6" style={{ color: 'var(--text-primary)' }}>{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-maroon)', color: '#fff' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Collection stats tab ──────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  return (
    <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-chip)', height: '8px' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: pct >= 100 ? 'var(--accent)' : '#5a6ee0' }}
      />
    </div>
  )
}

function MissingModal({ set, gameSlug, missing, addingWishlist, wishlistAdded, onAddToWishlist, onClose }) {
  const isComplete = set.owned_cards >= set.total_cards
  const setPct = set.total_cards > 0 ? (set.owned_cards / set.total_cards) * 100 : 0
  const added = wishlistAdded[set.set_id]
  const adding = addingWishlist.has(set.set_id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-xl w-full mx-4 flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxWidth: '480px', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-semibold text-base mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{set.set_name}</h2>
            <div className="flex items-center gap-3">
              <ProgressBar pct={setPct} />
              <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {set.owned_cards}/{set.total_cards}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-lg leading-none shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {missing === 'loading' && (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          )}
          {Array.isArray(missing) && missing.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--accent)' }}>You have every card in this set!</p>
          )}
          {Array.isArray(missing) && missing.length > 0 && (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{missing.length} card{missing.length !== 1 ? 's' : ''} missing</p>
              <ul className="flex flex-col gap-1">
                {missing.map(card => (
                  <li key={card.id}>
                    <Link
                      to={`/cards/${card.id}?printing=${card.printing_id}`}
                      onClick={onClose}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {card.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            to={`/collection/${gameSlug}?set=${encodeURIComponent(set.set_name)}`}
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            View in collection
          </Link>
          {!isComplete && (
            <button
              onClick={() => onAddToWishlist(set)}
              disabled={adding}
              className="text-sm px-3 py-1.5 rounded font-medium"
              style={{
                backgroundColor: added != null ? '#1a3a2a' : 'var(--bg-chip)',
                border: `1px solid ${added != null ? '#2d6a4a' : '#9e836a'}`,
                color: adding ? 'var(--text-muted)' : added != null ? '#1eff00' : 'var(--accent)',
                cursor: adding ? 'not-allowed' : 'pointer',
              }}
            >
              {adding ? 'Adding…' : added != null ? `✓ ${added} added to wishlist` : 'Add missing to wishlist'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SetMenu({ set, gameSlug, addingWishlist, wishlistAdded, onShowMissing, onAddToWishlist }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const isComplete = set.owned_cards >= set.total_cards
  const added = wishlistAdded[set.set_id]
  const adding = addingWishlist.has(set.set_id)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      const inBtn = btnRef.current && btnRef.current.contains(e.target)
      const inMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!inBtn && !inMenu) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen(e) {
    e.stopPropagation()
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpen(o => !o)
  }

  return (
    <div className="shrink-0" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-7 h-7 flex items-center justify-center rounded"
        style={{ color: 'var(--text-muted)', backgroundColor: open ? 'var(--bg-chip)' : 'transparent', border: '1px solid transparent' }}
        title="Actions"
      >
        ···
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed rounded-lg py-1 z-50 min-w-max"
          style={{ top: menuPos.top, right: menuPos.right, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
        >
          <Link
            to={`/collection/${gameSlug}?set=${encodeURIComponent(set.set_name)}`}
            className="flex items-center gap-2 px-4 py-2 text-xs"
            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            View in collection
          </Link>
          {!isComplete && (
            <>
              <button
                onClick={() => { setOpen(false); onShowMissing(set) }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left"
                style={{ color: 'var(--text-primary)' }}
              >
                Show missing cards
              </button>
              <button
                onClick={() => { setOpen(false); onAddToWishlist(set) }}
                disabled={adding}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left"
                style={{ color: adding ? 'var(--text-muted)' : added != null ? '#1eff00' : 'var(--accent)', cursor: adding ? 'not-allowed' : 'pointer' }}
              >
                {adding ? 'Adding…' : added != null ? `✓ ${added} added` : 'Add missing to wishlist'}
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function CollectionStatsTab({ authFetch }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(new Set())
  const [missingCards, setMissingCards] = useState({})
  const [missingModal, setMissingModal] = useState(null)
  const [addingWishlist, setAddingWishlist] = useState(new Set())
  const [wishlistAdded, setWishlistAdded] = useState({})

  useEffect(() => {
    authFetch(`${API_URL}/api/users/me/collection/stats`)
      .then(r => r.json())
      .then(data => { setStats(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authFetch])

  function toggleGame(gameId) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(gameId) ? next.delete(gameId) : next.add(gameId)
      return next
    })
  }

  async function loadMissing(setId) {
    if (missingCards[setId] !== undefined) return
    setMissingCards(prev => ({ ...prev, [setId]: 'loading' }))
    const res = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}/missing`)
    const data = await res.json()
    setMissingCards(prev => ({ ...prev, [setId]: Array.isArray(data) ? data : [] }))
  }

  function handleShowMissing(set, gameSlug) {
    setMissingModal({ set, gameSlug })
    loadMissing(set.set_id)
  }

  async function handleAddMissingToWishlist(set) {
    setAddingWishlist(prev => new Set(prev).add(set.set_id))
    try {
      const res = await authFetch(`${API_URL}/api/users/me/wishlist/set/${set.set_id}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setWishlistAdded(prev => ({ ...prev, [set.set_id]: data.added }))
        setTimeout(() => setWishlistAdded(prev => { const next = { ...prev }; delete next[set.set_id]; return next }), 3000)
      }
    } finally {
      setAddingWishlist(prev => { const next = new Set(prev); next.delete(set.set_id); return next })
    }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading stats…</p>

  if (stats.length === 0) return (
    <div className="text-center py-16">
      <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>No collection data yet.</p>
      <p className="text-sm" style={{ color: '#9e836a' }}>Add cards to your collection to see stats.</p>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-3">
        {stats.map(game => {
          const gamePct = game.total_cards > 0 ? (game.owned_cards / game.total_cards) * 100 : 0
          const isOpen = expanded.has(game.game_id)
          return (
            <div key={game.game_id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {/* Game row */}
              <button
                onClick={() => toggleGame(game.game_id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <span className="font-semibold w-48 shrink-0 truncate" style={{ color: 'var(--text-primary)' }}>{game.game_name}</span>
                <ProgressBar pct={gamePct} />
                <span className="text-sm w-12 text-right shrink-0" style={{ color: 'var(--accent)' }}>
                  {gamePct < 0.1 ? '<0.1' : gamePct.toFixed(1)}%
                </span>
                <span className="text-xs w-4 shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Set rows */}
              {isOpen && (
                <div className="divide-y" style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)' }}>
                  {game.sets.map(set => {
                    const setPct = set.total_cards > 0 ? (set.owned_cards / set.total_cards) * 100 : 0
                    return (
                      <div
                        key={set.set_id}
                        className="flex items-center gap-4 px-5 py-3 pl-10 cursor-pointer"
                        style={{ transition: 'background 0.1s' }}
                        onClick={() => navigate(`/collection/${game.game_slug}?set=${encodeURIComponent(set.set_name)}`)}
                      >
                        <span className="text-sm w-48 shrink-0 truncate" style={{ color: 'var(--text-primary)' }} title={set.set_name}>{set.set_name}</span>
                        <ProgressBar pct={setPct} />
                        <span className="text-xs w-20 text-right shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {set.owned_cards}/{set.total_cards}
                        </span>
                        <SetMenu
                          set={set}
                          gameSlug={game.game_slug}
                          addingWishlist={addingWishlist}
                          wishlistAdded={wishlistAdded}
                          onShowMissing={s => handleShowMissing(s, game.game_slug)}
                          onAddToWishlist={handleAddMissingToWishlist}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {missingModal && (
        <MissingModal
          set={missingModal.set}
          gameSlug={missingModal.gameSlug}
          missing={missingCards[missingModal.set.set_id]}
          addingWishlist={addingWishlist}
          wishlistAdded={wishlistAdded}
          onAddToWishlist={handleAddMissingToWishlist}
          onClose={() => setMissingModal(null)}
        />
      )}
    </>
  )
}

// ── My Wishlist tab ───────────────────────────────────────────────────────────

function MyWishlistTab({ authFetch }) {
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
  const [showImportForm, setShowImportForm] = useState(false)
  const [importDeckName, setImportDeckName] = useState('')
  const [importDeckGame, setImportDeckGame] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)
  const [confirm, setConfirm] = useState(null)

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

  async function handleCopy(deck) {
    const res = await authFetch(`${API_URL}/api/decks/${deck.id}/copy`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    navigate(`/decks/${data.id}`)
  }

  async function handleDelete(deck) {
    setConfirm({
      message: `Are you sure you want to delete "${deck.name}"? This cannot be undone.`,
      onConfirm: async () => {
        await authFetch(`${API_URL}/api/decks/${deck.id}`, { method: 'DELETE' })
        setDecks(prev => prev.filter(d => d.id !== deck.id))
        setConfirm(null)
      },
    })
  }

  async function openImportForm() {
    setShowImportForm(true)
    setShowForm(false)
    if (games.length === 0) {
      const res = await fetch(`${API_URL}/api/games`)
      const data = await res.json()
      setGames(Array.isArray(data) ? data : [])
    }
  }

  async function handleImportDeck(e) {
    e.preventDefault()
    if (!importDeckName.trim() || !importDeckGame || !importFile) {
      setImportResult({ error: 'Please fill in the deck name, select a game, and choose a file.' })
      return
    }
    setImporting(true)
    const form = new FormData()
    form.append('file', importFile)
    form.append('name', importDeckName.trim())
    form.append('game_id', importDeckGame)
    try {
      const res = await authFetch(`${API_URL}/api/decks/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Import failed'
        try { msg = JSON.parse(text).detail || msg } catch {}
        setImportResult({ error: `${msg} (${res.status})` })
        return
      }
      const data = await res.json()
      setImportResult(data)
      const decksRes = await authFetch(`${API_URL}/api/users/me/decks`)
      const decksData = await decksRes.json()
      setDecks(Array.isArray(decksData) ? decksData : [])
      setShowImportForm(false)
      setImportDeckName('')
      setImportDeckGame('')
      setImportFile(null)
      if (data.id) navigate(`/decks/${data.id}`)
    } catch {
      setImportResult({ error: 'Could not reach the server. Make sure you are connected and try again.' })
    } finally {
      setImporting(false)
    }
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading decks…</p>

  return (
    <div>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <ImportResultBanner result={importResult} onDismiss={() => setImportResult(null)} />
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
        </span>
        {!showForm && !showImportForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={openImportForm}
              className="text-xs px-3 py-1.5 rounded"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid #9e836a' }}
            >
              Import Deck
            </button>
            <button
              onClick={openForm}
              className="px-4 py-2 rounded text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
            >
              + New Deck
            </button>
          </div>
        )}
      </div>

      {/* Create deck form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
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
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Import deck form */}
      {showImportForm && (
        <form onSubmit={handleImportDeck} className="mb-6 p-4 rounded-xl flex flex-col gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Import Deck from File</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports CSV or JSON files exported from CCGVault, or .dec/.txt decklist files.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Deck name"
              value={importDeckName}
              onChange={e => setImportDeckName(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            <select
              value={importDeckGame}
              onChange={e => setImportDeckGame(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded text-sm"
              style={inputStyle}
            >
              <option value="">Select a game…</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,.json,.dec,.txt"
              className="hidden"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="px-3 py-1.5 rounded text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid #9e836a' }}
            >
              Choose File
            </button>
            <span className="text-sm truncate" style={{ color: importFile ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {importFile ? importFile.name : 'No file chosen'}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={importing}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {importing ? 'Importing…' : 'Import'}
            </button>
            <button type="button" onClick={() => setShowImportForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {decks.length === 0 && !showForm && (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg mb-2">No decks yet.</p>
          <p>Hit <strong style={{ color: 'var(--text-primary)' }}>+ New Deck</strong> to build your first one.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {decks.map(deck => (
          <div key={deck.id}
            className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={() => navigate(`/decks/${deck.id}`)}
          >
            {/* Thumbnail */}
            <div className="shrink-0 rounded overflow-hidden" style={{ width: '44px', height: '62px', backgroundColor: 'var(--bg-chip)' }}>
              {deck.thumbnail_url
                ? <img src={deck.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ color: '#9e836a', fontSize: '1.4rem' }}>🃏</div>
              }
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{deck.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--accent)' }}>{deck.game_name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {deck.total_cards} {deck.total_cards === 1 ? 'card' : 'cards'}
                </span>
                {deck.format && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid #9e836a' }}>
                    {deck.format}
                  </span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <ExportMenu onExport={fmt =>
                triggerDownload(authFetch, `${API_URL}/api/decks/${deck.id}/export?format=${fmt}`, `${deck.name}.${fmt}`)
              } />
              <button
                onClick={e => { e.stopPropagation(); handleCopy(deck) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid #9e836a' }}
              >
                Copy
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(deck) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid #9e836a' }}
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
  const colorPickerRef = useRef(null)

  useEffect(() => {
    if (!showColorPicker) return
    function handleClick(e) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColorPicker])

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
          {/* Avatar — click to change color */}
          <div className="relative flex-shrink-0" ref={colorPickerRef}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer select-none"
              style={{ backgroundColor: fullUser?.avatar_color || 'var(--accent)', color: 'var(--bg-page)' }}
              onClick={() => setShowColorPicker(o => !o)}
              title="Change avatar color"
            >
              {initials}
            </div>
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
          {/* Info */}
          <div>
            {/* Display name — inline edit */}
            {editingDisplayName ? (
              <div className="flex items-center gap-2 mb-0.5">
                <input
                  autoFocus
                  className="text-lg font-bold rounded px-2 py-0.5 outline-none"
                  style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid #9e836a', maxWidth: '200px' }}
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
          style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid #9e836a' }}
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

          {/* Stats + actions row */}
          <div className="flex items-center justify-between mb-6">
            {!loading && totalUnique > 0 && (
              <div className="flex gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span><strong style={{ color: 'var(--text-primary)' }}>{collection.length}</strong> games</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>{totalUnique}</strong> unique cards</span>
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

          {/* Game card grid */}
          {!loading && collection.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {collection.map(game => {
                const gameUnique = game.cards.length
                const gameCopies = game.cards.reduce((s, c) => s + c.quantity, 0)
                const sampleImages = game.cards.filter(c => c.image_url).slice(0, 4).map(c => c.image_url)
                return (
                  <div key={game.game_id} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-chip)' }}>
                    <Link
                      to={`/collection/${game.game_slug}`}
                      className="block transition-all duration-150 hover:ring-1"
                      style={{ textDecoration: 'none', ringColor: 'var(--accent)' }}
                    >
                      {/* Card image collage */}
                      <div className="relative h-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        {sampleImages.length > 0 ? (
                          <div className="flex h-full">
                            {sampleImages.map((url) => (
                              <img key={url} src={url} alt="" className="h-full object-cover flex-1" style={{ minWidth: 0 }} />
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-2xl" style={{ color: 'var(--border)' }}>🃏</span>
                          </div>
                        )}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(30,35,48,0.85) 0%, transparent 60%)' }} />
                      </div>
                      {/* Info */}
                      <div className="px-3 py-2 pr-10">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{game.game_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {gameUnique} cards
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={e => { e.preventDefault(); handleClearGame(game) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
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

      {/* My Decks tab */}
      {activeTab === 'decks' && <MyDecksTab authFetch={authFetch} />}

      {/* Wishlist tab */}
      {activeTab === 'wishlist' && <MyWishlistTab authFetch={authFetch} />}
      {activeTab === 'stats' && <CollectionStatsTab authFetch={authFetch} />}
    </div>
  )
}
