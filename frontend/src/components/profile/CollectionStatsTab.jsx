import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { API_URL } from '../../config'
import { rarityColor } from '../../theme'

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DM']
const CONDITION_VARS = { NM: 'var(--cond-nm)', LP: 'var(--cond-lp)', MP: 'var(--cond-mp)', HP: 'var(--cond-hp)', DM: 'var(--cond-dm)' }
const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }
const FINISH_LABELS = { normal: 'Normal', foil: 'Foil', 'special foil': 'Special Foil' }
const FINISH_COLORS = { normal: 'var(--text-muted)', foil: '#e0a82e', 'special foil': 'var(--accent-purple)' }

// ── Shared surfaces ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl px-4 py-3.5 border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <p className="text-3xl font-bold leading-none" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {action}
      </div>
      <div className="p-4" style={{ backgroundColor: 'var(--bg-chip)' }}>{children}</div>
    </div>
  )
}

function ProgressBar({ pct }) {
  return (
    <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', height: '8px' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: pct >= 100 ? 'var(--accent)' : '#5a6ee0' }} />
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────────────

function ConditionHealth({ counts, total }) {
  if (!total) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No cards yet.</p>
  const nmPct = Math.round((counts.NM || 0) / total * 100)
  const segs = CONDITION_ORDER.filter(c => counts[c] > 0)
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold leading-none" style={{ color: 'var(--cond-nm)' }}>{nmPct}%</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Near Mint</span>
      </div>
      <div className="flex w-full rounded-full overflow-hidden" style={{ height: '12px', backgroundColor: 'var(--bg-surface)' }}>
        {segs.map(c => (
          <div key={c} title={`${CONDITION_LABELS[c]}: ${counts[c]}`}
            style={{ width: `${counts[c] / total * 100}%`, backgroundColor: CONDITION_VARS[c] }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {CONDITION_ORDER.filter(c => counts[c] > 0).map(c => (
          <div key={c} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CONDITION_VARS[c] }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{c}</strong> {counts[c]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarList({ items, empty }) {
  if (items.length === 0) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{empty || 'No data.'}</p>
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <div className="flex flex-col gap-2">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-3">
          <span className="text-xs w-28 shrink-0 truncate capitalize" style={{ color: 'var(--text-primary)' }} title={i.label}>{i.label}</span>
          <div className="flex-1 rounded" style={{ height: '16px', backgroundColor: 'var(--bg-surface)' }}>
            <div className="h-full rounded transition-all duration-500"
              style={{ width: `${i.value / max * 100}%`, backgroundColor: i.color || 'var(--accent)', minWidth: i.value > 0 ? '3px' : 0 }} />
          </div>
          <span className="text-xs w-12 text-right shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{i.value}</span>
        </div>
      ))}
    </div>
  )
}

function GrowthChart({ events }) {
  const points = useMemo(() => {
    if (!events.length) return []
    const byDay = new Map()
    for (const e of events) {
      const day = e.date.toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) || 0) + e.qty)
    }
    let cum = 0
    return [...byDay.keys()].sort().map(d => { cum += byDay.get(d); return { t: new Date(d).getTime(), cum } })
  }, [events])

  if (points.length < 2) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
        {points.length === 1
          ? `All ${points[0].cum} cards were added on ${new Date(points[0].t).toLocaleDateString()}.`
          : 'Not enough history to chart growth yet.'}
      </p>
    )
  }

  const W = 600, H = 180, pad = 6
  const t0 = points[0].t, t1 = points[points.length - 1].t
  const maxCum = points[points.length - 1].cum
  const x = t => pad + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - 2 * pad)
  const y = c => H - pad - (c / maxCum) * (H - 2 * pad)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.cum).toFixed(1)}`).join(' ')
  const area = `${line} L${x(t1).toFixed(1)},${H - pad} L${x(t0).toFixed(1)},${H - pad} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '180px', display: 'block' }}>
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#growthFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between mt-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t0).toLocaleDateString()}</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{maxCum.toLocaleString()} cards</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t1).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

// ── Completion: missing-cards modal + per-set menu (carried over) ──────────────

function MissingModal({ set, gameSlug, missing, addingWishlist, wishlistAdded, onAddToWishlist, onClose }) {
  const isComplete = set.owned_cards >= set.total_cards
  const setPct = set.total_cards > 0 ? (set.owned_cards / set.total_cards) * 100 : 0
  const added = wishlistAdded[set.set_id]
  const adding = addingWishlist.has(set.set_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="relative rounded-xl w-full mx-4 flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxWidth: '480px', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-semibold text-base mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{set.set_name}</h2>
            <div className="flex items-center gap-3">
              <ProgressBar pct={setPct} />
              <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{set.owned_cards}/{set.total_cards}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-lg leading-none shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {missing === 'loading' && <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
          {Array.isArray(missing) && missing.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--accent)' }}>You have every card in this set!</p>}
          {Array.isArray(missing) && missing.length > 0 && (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{missing.length} card{missing.length !== 1 ? 's' : ''} missing</p>
              <ul className="flex flex-col gap-1">
                {missing.map(card => (
                  <li key={card.id}>
                    <Link to={`/cards/${card.id}?printing=${card.printing_id}`} onClick={onClose} className="text-sm hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {card.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link to={`/collection/${gameSlug}?set=${encodeURIComponent(set.set_name)}`} onClick={onClose} className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none' }}>
            View in collection
          </Link>
          {!isComplete && (
            <button onClick={() => onAddToWishlist(set)} disabled={adding} className="text-sm px-3 py-1.5 rounded font-medium"
              style={{
                backgroundColor: added != null ? '#1a3a2a' : 'var(--bg-chip)',
                border: `1px solid ${added != null ? '#2d6a4a' : '#9e836a'}`,
                color: adding ? 'var(--text-muted)' : added != null ? '#1eff00' : 'var(--accent)',
                cursor: adding ? 'not-allowed' : 'pointer',
              }}>
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
      <button ref={btnRef} onClick={handleOpen} className="w-7 h-7 flex items-center justify-center rounded"
        style={{ color: 'var(--text-muted)', backgroundColor: open ? 'var(--bg-chip)' : 'transparent', border: '1px solid transparent' }} title="Actions">
        ···
      </button>
      {open && createPortal(
        <div ref={menuRef} className="fixed rounded-lg py-1 z-50 min-w-max"
          style={{ top: menuPos.top, right: menuPos.right, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
          <Link to={`/collection/${gameSlug}?set=${encodeURIComponent(set.set_name)}`} className="flex items-center gap-2 px-4 py-2 text-xs"
            style={{ color: 'var(--text-primary)', textDecoration: 'none' }} onClick={() => setOpen(false)}>
            View in collection
          </Link>
          {!isComplete && (
            <>
              <button onClick={() => { setOpen(false); onShowMissing(set) }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left" style={{ color: 'var(--text-primary)' }}>
                Show missing cards
              </button>
              <button onClick={() => { setOpen(false); onAddToWishlist(set) }} disabled={adding} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left"
                style={{ color: adding ? 'var(--text-muted)' : added != null ? '#1eff00' : 'var(--accent)', cursor: adding ? 'not-allowed' : 'pointer' }}>
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

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function CollectionStatsTab({ authFetch, collection = [] }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('')

  // Completion section state
  const [expanded, setExpanded] = useState(new Set())
  const [missingCards, setMissingCards] = useState({})
  const [missingModal, setMissingModal] = useState(null)
  const [addingWishlist, setAddingWishlist] = useState(new Set())
  const [wishlistAdded, setWishlistAdded] = useState({})

  useEffect(() => {
    authFetch(`${API_URL}/api/users/me/collection/stats`)
      .then(r => r.json())
      .then(data => { setStats(Array.isArray(data) ? data : []); setStatsLoading(false) })
      .catch(() => setStatsLoading(false))
  }, [authFetch])

  const games = useMemo(() => collection.map(g => ({ slug: g.game_slug, name: g.game_name })), [collection])
  const scopedGroups = useMemo(() => gameFilter ? collection.filter(g => g.game_slug === gameFilter) : collection, [collection, gameFilter])
  const scopedStats = useMemo(() => gameFilter ? stats.filter(s => s.game_slug === gameFilter) : stats, [stats, gameFilter])

  const allCards = useMemo(
    () => scopedGroups.flatMap(g => g.cards.map(c => ({ ...c, game_name: g.game_name, game_slug: g.game_slug }))),
    [scopedGroups]
  )

  // Summary
  const totalCopies = allCards.reduce((s, c) => s + c.quantity, 0)
  const uniqueCards = new Set(allCards.map(c => c.printing_id)).size
  const gamesCount = scopedGroups.length
  const ownedTotal = scopedStats.reduce((s, g) => s + g.owned_cards, 0)
  const cardUniverse = scopedStats.reduce((s, g) => s + g.total_cards, 0)
  const overallPct = cardUniverse ? (ownedTotal / cardUniverse * 100) : 0
  const setsCompleted = scopedStats.reduce((s, g) => s + g.sets.filter(st => st.total_cards > 0 && st.owned_cards >= st.total_cards).length, 0)

  // Breakdowns
  const conditionCounts = useMemo(() => {
    const out = { NM: 0, LP: 0, MP: 0, HP: 0, DM: 0 }
    for (const c of allCards) { const k = CONDITION_ORDER.includes(c.condition) ? c.condition : 'NM'; out[k] += c.quantity }
    return out
  }, [allCards])

  const rarityItems = useMemo(() => {
    const counts = {}
    for (const c of allCards) { const r = c.rarity || 'Unknown'; counts[r] = (counts[r] || 0) + c.quantity }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value, color: label === 'Unknown' ? 'var(--text-muted)' : rarityColor(label, gameFilter || undefined) }))
      .sort((a, b) => b.value - a.value)
  }, [allCards, gameFilter])

  const finishItems = useMemo(() => {
    const counts = {}
    for (const c of allCards) { const f = c.finish || 'normal'; counts[f] = (counts[f] || 0) + c.quantity }
    return Object.entries(counts)
      .map(([k, value]) => ({ label: FINISH_LABELS[k] || k, value, color: FINISH_COLORS[k] || 'var(--accent)' }))
      .sort((a, b) => b.value - a.value)
  }, [allCards])

  const byGameItems = useMemo(
    () => collection.map(g => ({ label: g.game_name, value: g.cards.reduce((s, c) => s + c.quantity, 0), color: 'var(--accent)' }))
      .filter(i => i.value > 0).sort((a, b) => b.value - a.value),
    [collection]
  )

  const bySetItems = useMemo(() => {
    const counts = {}
    for (const c of allCards) counts[c.set_name] = (counts[c.set_name] || 0) + c.quantity
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: 'var(--accent)' }))
      .sort((a, b) => b.value - a.value).slice(0, 12)
  }, [allCards])

  const growthEvents = useMemo(
    () => allCards.filter(c => c.added_at).map(c => ({ date: new Date(c.added_at), qty: c.quantity })),
    [allCards]
  )

  const closest = useMemo(
    () => scopedStats
      .flatMap(g => g.sets.map(s => ({ ...s, game_slug: g.game_slug, game_name: g.game_name })))
      .filter(s => s.total_cards > 0 && s.owned_cards > 0 && s.owned_cards < s.total_cards)
      .map(s => ({ ...s, pct: s.owned_cards / s.total_cards, remaining: s.total_cards - s.owned_cards }))
      .sort((a, b) => b.pct - a.pct || a.remaining - b.remaining)
      .slice(0, 5),
    [scopedStats]
  )

  // Completion handlers
  function toggleGame(gameId) {
    setExpanded(prev => { const next = new Set(prev); next.has(gameId) ? next.delete(gameId) : next.add(gameId); return next })
  }
  async function loadMissing(setId) {
    if (missingCards[setId] !== undefined) return
    setMissingCards(prev => ({ ...prev, [setId]: 'loading' }))
    const res = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}/missing`)
    const data = await res.json()
    setMissingCards(prev => ({ ...prev, [setId]: Array.isArray(data) ? data : [] }))
  }
  function handleShowMissing(set, gameSlug) { setMissingModal({ set, gameSlug }); loadMissing(set.set_id) }
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

  if (statsLoading) return <p style={{ color: 'var(--text-muted)' }}>Loading stats…</p>

  if (stats.length === 0 && totalCopies === 0) return (
    <div className="text-center py-16">
      <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>No collection data yet.</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add cards to your collection to see stats.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Filter */}
      {games.length > 1 && (
        <div className="flex items-center justify-end">
          <select value={gameFilter} onChange={e => setGameFilter(e.target.value)} className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${gameFilter ? 'var(--accent)' : 'var(--border)'}`, color: gameFilter ? 'var(--accent)' : 'var(--text-primary)' }}>
            <option value="">All games</option>
            {games.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total cards" value={totalCopies.toLocaleString()} />
        <StatCard label="Unique cards" value={uniqueCards.toLocaleString()} />
        <StatCard label={gamesCount === 1 ? 'Game' : 'Games'} value={gamesCount} />
        <StatCard label="Sets completed" value={setsCompleted} accent={setsCompleted > 0} />
        <StatCard label="Overall complete" value={`${overallPct > 0 && overallPct < 0.1 ? '<0.1' : overallPct.toFixed(1)}%`} accent />
      </div>

      {/* Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Condition Health"><ConditionHealth counts={conditionCounts} total={totalCopies} /></Panel>
        <Panel title="Rarity Mix"><BarList items={rarityItems} empty="No rarity data." /></Panel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Finish"><BarList items={finishItems} /></Panel>
        <Panel title={gameFilter ? 'Top Sets' : 'Cards by Game'}>
          <BarList items={gameFilter ? bySetItems : byGameItems} />
        </Panel>
      </div>

      {/* Growth */}
      <Panel title="Collection Growth"><GrowthChart events={growthEvents} /></Panel>

      {/* Closest to completion */}
      {closest.length > 0 && (
        <Panel title="Closest to Completion">
          <div className="flex flex-col gap-3.5">
            {closest.map(s => {
              const added = wishlistAdded[s.set_id]
              const adding = addingWishlist.has(s.set_id)
              return (
                <div key={s.set_id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <button onClick={() => navigate(`/collection/${s.game_slug}?set=${encodeURIComponent(s.set_name)}`)}
                        className="text-sm font-medium truncate text-left hover:underline" style={{ color: 'var(--text-primary)' }} title={s.set_name}>
                        {s.set_name}
                      </button>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{s.remaining} left</span>
                    </div>
                    <ProgressBar pct={s.pct * 100} />
                  </div>
                  <button onClick={() => handleAddMissingToWishlist(s)} disabled={adding}
                    className="text-xs px-3 py-1.5 rounded shrink-0 font-medium"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: adding ? 'var(--text-muted)' : added != null ? '#1eff00' : 'var(--accent)', cursor: adding ? 'not-allowed' : 'pointer' }}>
                    {adding ? 'Adding…' : added != null ? `✓ ${added}` : '+ Wishlist'}
                  </button>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {/* Set completion accordion */}
      <Panel title="Set Completion">
        <div className="flex flex-col gap-3">
          {scopedStats.map(game => {
            const gamePct = game.total_cards > 0 ? (game.owned_cards / game.total_cards) * 100 : 0
            const isOpen = expanded.has(game.game_id)
            return (
              <div key={game.game_id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button onClick={() => toggleGame(game.game_id)} className="w-full flex items-center gap-4 px-5 py-4 text-left" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <span className="font-semibold w-48 shrink-0 truncate" style={{ color: 'var(--text-primary)' }}>{game.game_name}</span>
                  <ProgressBar pct={gamePct} />
                  <span className="text-sm w-12 text-right shrink-0" style={{ color: 'var(--accent)' }}>{gamePct < 0.1 ? '<0.1' : gamePct.toFixed(1)}%</span>
                  <span className="text-xs w-4 shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="divide-y" style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)' }}>
                    {game.sets.map(set => {
                      const setPct = set.total_cards > 0 ? (set.owned_cards / set.total_cards) * 100 : 0
                      return (
                        <div key={set.set_id} className="flex items-center gap-4 px-5 py-3 pl-10 cursor-pointer"
                          onClick={() => navigate(`/collection/${game.game_slug}?set=${encodeURIComponent(set.set_name)}`)}>
                          <span className="text-sm w-48 shrink-0 truncate" style={{ color: 'var(--text-primary)' }} title={set.set_name}>{set.set_name}</span>
                          <ProgressBar pct={setPct} />
                          <span className="text-xs w-20 text-right shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{set.owned_cards}/{set.total_cards}</span>
                          <SetMenu set={set} gameSlug={game.game_slug} addingWishlist={addingWishlist} wishlistAdded={wishlistAdded}
                            onShowMissing={s => handleShowMissing(s, game.game_slug)} onAddToWishlist={handleAddMissingToWishlist} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {missingModal && (
        <MissingModal set={missingModal.set} gameSlug={missingModal.gameSlug} missing={missingCards[missingModal.set.set_id]}
          addingWishlist={addingWishlist} wishlistAdded={wishlistAdded} onAddToWishlist={handleAddMissingToWishlist} onClose={() => setMissingModal(null)} />
      )}
    </div>
  )
}
