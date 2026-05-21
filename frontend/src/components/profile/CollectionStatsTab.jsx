import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { API_URL } from '../../config'

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

export default function CollectionStatsTab({ authFetch }) {
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
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add cards to your collection to see stats.</p>
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
