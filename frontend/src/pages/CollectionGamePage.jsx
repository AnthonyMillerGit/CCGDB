import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { RARITY_COLORS, normalizeRarity, rarityRank } from '../theme'

const CONDITION_COLOR = 'var(--accent-maroon)'
const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }

function QuantityControl({ quantity, onIncrease, onDecrease, onSet, foil = false }) {
  const [val, setVal] = useState(String(quantity))
  useEffect(() => { setVal(String(quantity)) }, [quantity])

  function commit() {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0 && n !== quantity) onSet(n)
    else setVal(String(quantity))
  }

  return (
    <div className="flex items-center justify-center gap-1 w-full">
      <button
        onClick={e => { e.preventDefault(); onDecrease() }}
        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', color: '#e05c5c', border: '1px solid var(--border)' }}
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className={`text-xs font-medium text-center rounded${foil ? ' foil-rainbow' : ''}`}
        style={{
          width: '2rem',
          backgroundColor: 'var(--bg-chip)',
          border: '1px solid var(--border)',
          outline: 'none',
          ...(foil ? {} : { color: 'var(--text-primary)' }),
        }}
      />
      <button
        onClick={e => { e.preventDefault(); onIncrease() }}
        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >+</button>
    </div>
  )
}

const sameCard = (a, b) => a.printing_id === b.printing_id && a.finish === b.finish

export default function CollectionGamePage() {
  const { gameSlug } = useParams()
  const [searchParams] = useSearchParams()
  const { authFetch } = useAuth()

  const [gameData, setGameData] = useState(null)
  const [loading, setLoading] = useState(true)

  const undoRef = useRef(null)
  const [undoCard, setUndoCard] = useState(null)

  const [search, setSearch] = useState('')
  const [setFilter, setSetFilter] = useState(searchParams.get('set') ?? '')
  const [sort, setSort] = useState('name_asc')
  const [rarityFilter, setRarityFilter] = useState([])
  const [rarityOpen, setRarityOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [viewMode, setViewMode] = useState('grid')
  const [groupBySet, setGroupBySet] = useState(false)
  const [collapsedSets, setCollapsedSets] = useState(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [foilOnly, setFoilOnly] = useState(false)
  const filtersRef = useRef(null)

  useEffect(() => {
    authFetch(`${API_URL}/api/users/me/collection`)
      .then(r => r.json())
      .then(data => {
        const game = Array.isArray(data) ? data.find(g => g.game_slug === gameSlug) : null
        setGameData(game || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authFetch, gameSlug])

  useEffect(() => {
    if (!filtersOpen) return
    function handleClickOutside(e) {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filtersOpen])

  const handleIncrease = useCallback(async (card) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: card.printing_id, quantity: 1, finish: card.finish }),
    })
    if (!res.ok) return
    const result = await res.json()
    setGameData(prev => prev && {
      ...prev,
      cards: prev.cards.map(c => sameCard(c, card) ? { ...c, quantity: result.quantity } : c)
    })
  }, [authFetch])

  const handleDecrease = useCallback(async (card) => {
    if (card.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}?finish=${card.finish}`, { method: 'DELETE' })
      if (!res.ok) return
      setGameData(prev => prev && { ...prev, cards: prev.cards.filter(c => !sameCard(c, card)) })
      if (undoRef.current?.timer) clearTimeout(undoRef.current.timer)
      const timer = setTimeout(() => { undoRef.current = null; setUndoCard(null) }, 4000)
      undoRef.current = { card, timer }
      setUndoCard(card)
    } else {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: card.quantity - 1, finish: card.finish }),
      })
      if (!res.ok) return
      const result = await res.json()
      setGameData(prev => prev && {
        ...prev,
        cards: prev.cards.map(c => sameCard(c, card) ? { ...c, quantity: result.quantity } : c)
      })
    }
  }, [authFetch])

  const handleSetQuantity = useCallback(async (card, newQty) => {
    if (newQty < 1) { handleDecrease({ ...card, quantity: 1 }); return }
    const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQty, finish: card.finish }),
    })
    if (!res.ok) return
    const result = await res.json()
    setGameData(prev => prev && {
      ...prev,
      cards: prev.cards.map(c => sameCard(c, card) ? { ...c, quantity: result.quantity } : c)
    })
  }, [authFetch, handleDecrease])

  async function handleUndo() {
    const undo = undoRef.current
    if (!undo) return
    clearTimeout(undo.timer)
    undoRef.current = null
    setUndoCard(null)
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: undo.card.printing_id, quantity: 1, finish: undo.card.finish, condition: undo.card.condition }),
    })
    if (!res.ok) return
    const result = await res.json()
    setGameData(prev => {
      if (!prev) return prev
      const exists = prev.cards.find(c => sameCard(c, undo.card))
      if (exists) return { ...prev, cards: prev.cards.map(c => sameCard(c, undo.card) ? { ...c, quantity: result.quantity } : c) }
      return { ...prev, cards: [...prev.cards, { ...undo.card, quantity: result.quantity }] }
    })
  }

  const handleFinishChange = useCallback(async (card, newFinish) => {
    await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}?finish=${card.finish}`, { method: 'DELETE' })
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: card.printing_id, quantity: card.quantity, finish: newFinish, condition: card.condition }),
    })
    if (!res.ok) return
    const result = await res.json()
    setGameData(prev => {
      if (!prev) return prev
      const existing = prev.cards.find(c => c.printing_id === card.printing_id && c.finish === newFinish && c.id !== card.id)
      if (existing) {
        return {
          ...prev,
          cards: prev.cards
            .filter(c => !sameCard(c, card))
            .map(c => c.printing_id === card.printing_id && c.finish === newFinish ? { ...c, quantity: result.quantity } : c),
        }
      }
      return { ...prev, cards: prev.cards.map(c => sameCard(c, card) ? { ...c, finish: newFinish, quantity: result.quantity } : c) }
    })
  }, [authFetch])

  const handleConditionChange = useCallback(async (card, newCondition) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: card.quantity, finish: card.finish, condition: newCondition }),
    })
    if (!res.ok) return
    setGameData(prev => prev && {
      ...prev,
      cards: prev.cards.map(c => sameCard(c, card) ? { ...c, condition: newCondition } : c)
    })
  }, [authFetch])

  const allSets = useMemo(() => {
    if (!gameData) return []
    const sets = new Set(gameData.cards.map(c => c.set_name))
    return [...sets].sort()
  }, [gameData])

  const allRarities = useMemo(() => {
    if (!gameData) return []
    const seen = new Set()
    for (const c of gameData.cards) if (c.rarity) seen.add(c.rarity)
    return [...seen].sort((a, b) => rarityRank(a) - rarityRank(b))
  }, [gameData])

  const filteredCards = useMemo(() => {
    if (!gameData) return []
    const q = search.toLowerCase()
    let cards = gameData.cards
    if (q) cards = cards.filter(c => c.card_name.toLowerCase().includes(q))
    if (setFilter) cards = cards.filter(c => c.set_name === setFilter)
    if (rarityFilter.length > 0) cards = cards.filter(c => rarityFilter.includes(c.rarity))
    if (foilOnly) cards = cards.filter(c => c.finish !== 'normal')
    return [...cards].sort((a, b) => {
      switch (sort) {
        case 'name_desc':     return b.card_name.localeCompare(a.card_name)
        case 'set_asc':       return a.set_name.localeCompare(b.set_name) || a.card_name.localeCompare(b.card_name)
        case 'qty_desc':      return b.quantity - a.quantity || a.card_name.localeCompare(b.card_name)
        case 'qty_asc':       return a.quantity - b.quantity || a.card_name.localeCompare(b.card_name)
        case 'rarity_desc':   return rarityRank(a.rarity) - rarityRank(b.rarity) || a.card_name.localeCompare(b.card_name)
        case 'rarity_asc':    return rarityRank(b.rarity) - rarityRank(a.rarity) || a.card_name.localeCompare(b.card_name)
        case 'type_asc':      return (a.card_type || '').localeCompare(b.card_type || '') || a.card_name.localeCompare(b.card_name)
        default:              return a.card_name.localeCompare(b.card_name)
      }
    })
  }, [gameData, search, setFilter, rarityFilter, foilOnly, sort])

  // Group foil + normal copies of the same printing into one tile
  const printingGroups = useMemo(() => {
    const map = new Map()
    for (const card of filteredCards) {
      if (!map.has(card.printing_id)) {
        map.set(card.printing_id, { ...card, items: [] })
      }
      map.get(card.printing_id).items.push(card)
    }
    for (const g of map.values()) g.items.sort((a, b) => a.finish.localeCompare(b.finish))
    return [...map.values()]
  }, [filteredCards])

  const isFiltered = search !== '' || setFilter !== ''
  const totalUnique = useMemo(() => {
    if (!gameData) return 0
    const ids = new Set(gameData.cards.map(c => c.printing_id))
    return ids.size
  }, [gameData])
  const totalCopies = gameData?.cards.reduce((s, c) => s + c.quantity, 0) ?? 0
  const filteredCopies = filteredCards.reduce((s, c) => s + c.quantity, 0)
  const filteredUnique = printingGroups.length

  const totalPages = Math.max(1, Math.ceil(printingGroups.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = pageSize === Infinity ? 0 : (safePage - 1) * pageSize

  const pagedCards = useMemo(() => {
    if (groupBySet) return printingGroups
    return printingGroups.slice(pageStart, pageStart + pageSize)
  }, [groupBySet, printingGroups, pageStart, pageSize])

  const groupedCards = useMemo(() => {
    if (!groupBySet) return null
    const sorted = [...pagedCards].sort((a, b) =>
      a.set_name.localeCompare(b.set_name) || a.card_name.localeCompare(b.card_name)
    )
    const groups = new Map()
    for (const card of sorted) {
      if (!groups.has(card.set_name)) groups.set(card.set_name, [])
      groups.get(card.set_name).push(card)
    }
    return [...groups.entries()].map(([setName, cards]) => ({ setName, cards }))
  }, [groupBySet, pagedCards])

  function resetPage() { setPage(1) }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p style={{ color: 'var(--text-muted)' }}>Loading collection…</p>
      </div>
    )
  }

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p style={{ color: 'var(--text-muted)' }}>No cards found for this game.</p>
        <Link to="/profile" style={{ color: 'var(--accent)' }}>← Back to collection</Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 mx-auto" style={{ maxWidth: '1400px' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link to="/profile" style={{ color: 'var(--accent)' }}>My Collection</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{gameData.game_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{gameData.game_name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{isFiltered ? filteredCopies : totalCopies}</strong>
            {isFiltered && <span> / {totalCopies}</span>} cards
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!setFilter && (
            <button
              onClick={() => setGroupBySet(g => !g)}
              className="text-xs px-3 py-1.5 rounded"
              style={{
                backgroundColor: groupBySet ? 'var(--accent)' : 'var(--bg-surface)',
                color: groupBySet ? 'var(--text-panel)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              Group by set
            </button>
          )}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="px-2.5 py-1.5 text-sm"
              style={{ backgroundColor: viewMode === 'grid' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'grid' ? 'var(--text-panel)' : 'var(--text-muted)' }}
              title="Grid view"
            >⊞</button>
            <button
              onClick={() => setViewMode('list')}
              className="px-2.5 py-1.5 text-sm"
              style={{ backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? 'var(--text-panel)' : 'var(--text-muted)' }}
              title="List view"
            >≡</button>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 mb-6" ref={filtersRef}>
        <input
          type="text"
          placeholder="Search cards…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          className="flex-1 text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        />

        {/* Filters button */}
        <div className="relative">
          {(() => {
            const activeCount = (setFilter ? 1 : 0) + (sort !== 'name_asc' ? 1 : 0) + rarityFilter.length + (foilOnly ? 1 : 0) + (pageSize !== 25 ? 1 : 0)
            return (
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="text-sm px-3 py-1.5 rounded flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${activeCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  color: activeCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                Filters{activeCount > 0 ? ` (${activeCount})` : ''} ▾
              </button>
            )
          })()}

          {filtersOpen && (
            <div
              className="absolute right-0 z-20 mt-1 rounded-xl shadow-xl p-4 flex flex-col gap-3"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', minWidth: '220px' }}
            >
              {/* Set */}
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Set</p>
                <select
                  value={setFilter}
                  onChange={e => { setSetFilter(e.target.value); resetPage() }}
                  className="w-full text-sm px-2 py-1.5 rounded"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="">All Sets</option>
                  {allSets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Sort */}
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Sort</p>
                <select
                  value={sort}
                  onChange={e => { setSort(e.target.value); resetPage() }}
                  className="w-full text-sm px-2 py-1.5 rounded"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="name_asc">Name A→Z</option>
                  <option value="name_desc">Name Z→A</option>
                  <option value="set_asc">Set</option>
                  <option value="qty_desc">Qty: High→Low</option>
                  <option value="qty_asc">Qty: Low→High</option>
                  <option value="rarity_desc">Rarity: High→Low</option>
                  <option value="rarity_asc">Rarity: Low→High</option>
                  <option value="type_asc">Type</option>
                </select>
              </div>

              {/* Rarity */}
              {allRarities.length > 0 && (
                <div>
                  <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Rarity</p>
                  <div className="flex flex-col gap-0.5">
                    {allRarities.map(r => (
                      <label key={r} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer"
                        style={{ backgroundColor: rarityFilter.includes(r) ? 'var(--bg-surface)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={rarityFilter.includes(r)}
                          onChange={() => { setRarityFilter(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]); resetPage() }}
                          className="accent-[#0097a7]"
                        />
                        <span className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(r)] || 'var(--text-muted)' }}>{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Foil */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={foilOnly}
                  onChange={() => { setFoilOnly(f => !f); resetPage() }}
                  className="accent-[#0097a7]"
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Foil only</span>
              </label>

              {/* Page size */}
              <div className="flex items-center justify-between gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cards per page</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); resetPage() }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={Infinity}>All</option>
                </select>
              </div>

              {/* Clear all */}
              {(setFilter || sort !== 'name_asc' || rarityFilter.length > 0 || foilOnly || pageSize !== 25) && (
                <button
                  onClick={() => { setSetFilter(''); setSort('name_asc'); setRarityFilter([]); setFoilOnly(false); setPageSize(25); resetPage() }}
                  className="text-xs py-1 rounded"
                  style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}
                >
                  Reset all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clear search when filtered */}
        {isFiltered && (
          <button
            onClick={() => { setSearch(''); setSetFilter(''); setRarityFilter([]); resetPage() }}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* No results */}
      {isFiltered && printingGroups.length === 0 && (
        <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No cards match your filters.</p>
      )}

      {/* Cards */}
      {printingGroups.length > 0 && (() => {
        const conditionColor = () => CONDITION_COLOR

        const gridCard = group => (
          <div key={group.printing_id} className="flex flex-col">
            <Link to={`/collection/${gameSlug}/cards/${group.card_id}`} className="block relative group">
              <div
                className="rounded-lg overflow-hidden transition-all duration-150 group-hover:ring-1"
                style={{ backgroundColor: 'var(--bg-surface)', ringColor: 'var(--accent)' }}
              >
                {group.image_url ? (
                  <img src={group.image_url} alt={group.card_name} className="w-full" />
                ) : (
                  <div className="aspect-[2.5/3.5] flex items-center justify-center p-2" style={{ backgroundColor: 'var(--bg-chip)' }}>
                    <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{group.card_name}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }} title={group.card_name}>{group.card_name}</p>
              {group.rarity && <span className="text-xs shrink-0 capitalize" style={{ color: RARITY_COLORS[normalizeRarity(group.rarity)] || 'var(--text-muted)' }}>{group.rarity}</span>}
            </div>
            {group.items.map(item => (
              <div key={item.finish} className="mt-1">
                <QuantityControl
                  quantity={item.quantity}
                  onIncrease={() => handleIncrease(item)}
                  onDecrease={() => handleDecrease(item)}
                  onSet={n => handleSetQuantity(item, n)}
                  foil={item.finish === 'foil'}
                />
              </div>
            ))}
          </div>
        )

        const listCard = group => (
          <div key={group.printing_id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <Link to={`/collection/${gameSlug}/cards/${group.card_id}`} className="shrink-0">
              {group.image_url ? (
                <img src={group.image_url} alt={group.card_name} className="rounded object-cover" style={{ width: '40px', height: '56px' }} />
              ) : (
                <div className="rounded flex items-center justify-center" style={{ width: '40px', height: '56px', backgroundColor: 'var(--bg-chip)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>?</span>
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{group.card_name}</p>
              <div className="flex items-center gap-1">
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{group.set_name}</p>
                {group.rarity && <><span style={{ color: 'var(--border)' }}>·</span><span className="text-xs shrink-0 capitalize" style={{ color: RARITY_COLORS[normalizeRarity(group.rarity)] || 'var(--text-muted)' }}>{group.rarity}</span></>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map(item => (
                <QuantityControl
                  key={item.finish}
                  quantity={item.quantity}
                  onIncrease={() => handleIncrease(item)}
                  onDecrease={() => handleDecrease(item)}
                  onSet={n => handleSetQuantity(item, n)}
                  foil={item.finish === 'foil'}
                />
              ))}
            </div>
          </div>
        )

        const toggleSet = (setName) => {
          setCollapsedSets(prev => {
            const next = new Set(prev)
            next.has(setName) ? next.delete(setName) : next.add(setName)
            return next
          })
        }

        const setHeader = (setName, count) => {
          const collapsed = collapsedSets.has(setName)
          return (
            <button
              onClick={() => toggleSet(setName)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg mb-3 mt-1 text-left"
              style={{ backgroundColor: '#252a3b', border: '1px solid var(--border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)', minWidth: '0.75rem' }}>
                {collapsed ? '▶' : '▼'}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{setName}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} {count === 1 ? 'card' : 'cards'}</span>
            </button>
          )
        }

        const gridGroup = cards => (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cards.map(gridCard)}
          </div>
        )

        const listGroup = cards => (
          <div className="flex flex-col gap-1">
            {cards.map(listCard)}
          </div>
        )

        if (groupBySet) {
          return groupedCards.map(group => (
            <div key={group.setName} className="mb-6">
              {setHeader(group.setName, group.cards.length)}
              {!collapsedSets.has(group.setName) && (
                viewMode === 'grid' ? gridGroup(group.cards) : listGroup(group.cards)
              )}
            </div>
          ))
        }

        return viewMode === 'grid' ? gridGroup(pagedCards) : listGroup(pagedCards)
      })()}

      {/* Undo toast */}
      {undoCard && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
          style={{ transform: 'translateX(-50%)', backgroundColor: 'var(--bg-surface)', border: '1px solid #9e836a', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
        >
          <span className="text-sm">Removed <strong>{undoCard.card_name}</strong></span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold px-2 py-0.5 rounded"
            style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Pagination controls */}
      {!groupBySet && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: safePage === 1 ? '#9e836a' : 'var(--text-primary)', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
          >
            ‹ Prev
          </button>

          {/* Page number buttons — show a window around current page */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="text-sm px-1" style={{ color: '#9e836a' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="text-sm w-8 h-8 rounded"
                  style={{
                    backgroundColor: p === safePage ? 'var(--accent)' : 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: p === safePage ? 'var(--text-panel)' : 'var(--text-primary)',
                    fontWeight: p === safePage ? '600' : '400',
                  }}
                >
                  {p}
                </button>
              )
            )
          }

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: safePage === totalPages ? '#9e836a' : 'var(--text-primary)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next ›
          </button>

          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
            {pageStart + 1}–{Math.min(pageStart + pageSize, printingGroups.length)} of {printingGroups.length}
          </span>
        </div>
      )}
    </div>
  )
}
