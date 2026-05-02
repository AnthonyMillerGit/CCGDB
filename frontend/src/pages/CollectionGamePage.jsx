import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

const CONDITION_COLORS = { NM: '#1eff00', LP: '#08D9D6', MP: '#f4c542', HP: '#ff9a3c', DM: '#FF2E63' }
const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }

function QuantityControl({ quantity, onIncrease, onDecrease }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <button
        onClick={e => { e.preventDefault(); onDecrease() }}
        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
        style={{ backgroundColor: '#2d3243', color: '#e05c5c', border: '1px solid #363d52' }}
      >−</button>
      <span className="text-xs font-medium w-5 text-center" style={{ color: '#EAEAEA' }}>{quantity}</span>
      <button
        onClick={e => { e.preventDefault(); onIncrease() }}
        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
        style={{ backgroundColor: '#2d3243', color: '#08D9D6', border: '1px solid #363d52' }}
      >+</button>
    </div>
  )
}

const sameCard = (a, b) => a.printing_id === b.printing_id && a.is_foil === b.is_foil

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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [viewMode, setViewMode] = useState('grid')
  const [groupBySet, setGroupBySet] = useState(false)

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

  const handleIncrease = useCallback(async (card) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: card.printing_id, quantity: 1, is_foil: card.is_foil }),
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
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}?foil=${card.is_foil}`, { method: 'DELETE' })
      if (!res.ok) return
      setGameData(prev => prev && { ...prev, cards: prev.cards.filter(c => !sameCard(c, card)) })
      if (undoRef.current?.timer) clearTimeout(undoRef.current.timer)
      const timer = setTimeout(() => { undoRef.current = null; setUndoCard(null) }, 4000)
      undoRef.current = { card, timer }
      setUndoCard(card)
    } else {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: card.quantity - 1, is_foil: card.is_foil }),
      })
      if (!res.ok) return
      const result = await res.json()
      setGameData(prev => prev && {
        ...prev,
        cards: prev.cards.map(c => sameCard(c, card) ? { ...c, quantity: result.quantity } : c)
      })
    }
  }, [authFetch])

  async function handleUndo() {
    const undo = undoRef.current
    if (!undo) return
    clearTimeout(undo.timer)
    undoRef.current = null
    setUndoCard(null)
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: undo.card.printing_id, quantity: 1, is_foil: undo.card.is_foil, condition: undo.card.condition }),
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

  const handleConditionChange = useCallback(async (card, newCondition) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: card.quantity, is_foil: card.is_foil, condition: newCondition }),
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

  const filteredCards = useMemo(() => {
    if (!gameData) return []
    const q = search.toLowerCase()
    let cards = gameData.cards
    if (q) cards = cards.filter(c => c.card_name.toLowerCase().includes(q))
    if (setFilter) cards = cards.filter(c => c.set_name === setFilter)
    return [...cards].sort((a, b) => {
      switch (sort) {
        case 'name_desc': return b.card_name.localeCompare(a.card_name)
        case 'set_asc':   return a.set_name.localeCompare(b.set_name) || a.card_name.localeCompare(b.card_name)
        case 'qty_desc':  return b.quantity - a.quantity || a.card_name.localeCompare(b.card_name)
        case 'qty_asc':   return a.quantity - b.quantity || a.card_name.localeCompare(b.card_name)
        default:          return a.card_name.localeCompare(b.card_name)
      }
    })
  }, [gameData, search, setFilter, sort])

  const isFiltered = search !== '' || setFilter !== ''
  const totalUnique = gameData?.cards.length ?? 0
  const totalCopies = gameData?.cards.reduce((s, c) => s + c.quantity, 0) ?? 0
  const filteredCopies = filteredCards.reduce((s, c) => s + c.quantity, 0)

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize

  const pagedCards = useMemo(() => {
    if (groupBySet) return filteredCards
    return filteredCards.slice(pageStart, pageStart + pageSize)
  }, [groupBySet, filteredCards, pageStart, pageSize])

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
        <p style={{ color: '#8892a4' }}>Loading collection…</p>
      </div>
    )
  }

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p style={{ color: '#8892a4' }}>No cards found for this game.</p>
        <Link to="/profile" style={{ color: '#08D9D6' }}>← Back to collection</Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 mx-auto" style={{ maxWidth: '1400px' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: '#8892a4' }}>
        <Link to="/profile" style={{ color: '#08D9D6' }}>My Collection</Link>
        <span>›</span>
        <span style={{ color: '#EAEAEA' }}>{gameData.game_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#EAEAEA' }}>{gameData.game_name}</h1>
          <p className="text-sm" style={{ color: '#8892a4' }}>
            <strong style={{ color: '#EAEAEA' }}>{isFiltered ? filteredCards.length : totalUnique}</strong>
            {isFiltered && <span> / {totalUnique}</span>} unique cards
            {' · '}
            <strong style={{ color: '#EAEAEA' }}>{isFiltered ? filteredCopies : totalCopies}</strong>
            {isFiltered && <span> / {totalCopies}</span>} copies
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!setFilter && (
            <button
              onClick={() => setGroupBySet(g => !g)}
              className="text-xs px-3 py-1.5 rounded"
              style={{
                backgroundColor: groupBySet ? '#08D9D6' : '#2d3243',
                color: groupBySet ? '#13172b' : '#8892a4',
                border: '1px solid #363d52',
              }}
            >
              Group by set
            </button>
          )}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid #363d52' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="px-2.5 py-1.5 text-sm"
              style={{ backgroundColor: viewMode === 'grid' ? '#08D9D6' : '#2d3243', color: viewMode === 'grid' ? '#13172b' : '#8892a4' }}
              title="Grid view"
            >⊞</button>
            <button
              onClick={() => setViewMode('list')}
              className="px-2.5 py-1.5 text-sm"
              style={{ backgroundColor: viewMode === 'list' ? '#08D9D6' : '#2d3243', color: viewMode === 'list' ? '#13172b' : '#8892a4' }}
              title="List view"
            >≡</button>
          </div>
        </div>
      </div>

      {/* Filter / sort bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="Search cards…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          className="flex-1 min-w-[160px] text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA', outline: 'none' }}
        />
        <select
          value={setFilter}
          onChange={e => { setSetFilter(e.target.value); resetPage() }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: setFilter ? '#EAEAEA' : '#8892a4' }}
        >
          <option value="">All Sets</option>
          {allSets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); resetPage() }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }}
        >
          <option value="name_asc">Name A→Z</option>
          <option value="name_desc">Name Z→A</option>
          <option value="set_asc">Set</option>
          <option value="qty_desc">Qty: High→Low</option>
          <option value="qty_asc">Qty: Low→High</option>
        </select>
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); resetPage() }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }}
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        {isFiltered && (
          <button
            onClick={() => { setSearch(''); setSetFilter(''); resetPage() }}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#8892a4' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* No results */}
      {isFiltered && filteredCards.length === 0 && (
        <p className="text-center py-12" style={{ color: '#8892a4' }}>No cards match your filters.</p>
      )}

      {/* Cards */}
      {filteredCards.length > 0 && (() => {
        const conditionSelect = (card, extraStyle = {}) => (
          <select
            value={card.condition || 'NM'}
            onChange={e => handleConditionChange(card, e.target.value)}
            title={CONDITION_LABELS[card.condition || 'NM']}
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: '#1e2330',
              border: `1px solid ${CONDITION_COLORS[card.condition || 'NM']}55`,
              color: CONDITION_COLORS[card.condition || 'NM'],
              outline: 'none',
              ...extraStyle,
            }}
          >
            {Object.entries(CONDITION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{val} — {label}</option>
            ))}
          </select>
        )

        const gridCard = card => (
          <div key={card.id} className="flex flex-col">
            <Link to={`/cards/${card.card_id}`} className="block relative group">
              <div
                className="rounded-lg overflow-hidden transition-all duration-150 group-hover:ring-1"
                style={{ backgroundColor: '#2d3243', ringColor: '#08D9D6' }}
              >
                {card.image_url ? (
                  <img src={card.image_url} alt={card.card_name} className="w-full" />
                ) : (
                  <div className="aspect-[2.5/3.5] flex items-center justify-center p-2" style={{ backgroundColor: '#363d52' }}>
                    <span className="text-xs text-center leading-tight" style={{ color: '#8892a4' }}>{card.card_name}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs font-medium truncate" style={{ color: '#EAEAEA' }} title={card.card_name}>{card.card_name}</p>
              {card.is_foil && <span className="text-xs shrink-0" style={{ color: '#facc15' }} title="Foil">✦</span>}
            </div>
            <p className="text-xs truncate mb-1" style={{ color: '#8892a4' }} title={card.set_name}>{card.set_name}</p>
            <QuantityControl quantity={card.quantity} onIncrease={() => handleIncrease(card)} onDecrease={() => handleDecrease(card)} />
            {conditionSelect(card, { width: '100%', marginTop: '4px' })}
          </div>
        )

        const listCard = card => (
          <div key={card.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#2d3243' }}>
            <Link to={`/cards/${card.card_id}`} className="shrink-0">
              {card.image_url ? (
                <img src={card.image_url} alt={card.card_name} className="rounded object-cover" style={{ width: '40px', height: '56px' }} />
              ) : (
                <div className="rounded flex items-center justify-center" style={{ width: '40px', height: '56px', backgroundColor: '#363d52' }}>
                  <span className="text-xs" style={{ color: '#8892a4' }}>?</span>
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium truncate" style={{ color: '#EAEAEA' }}>{card.card_name}</p>
                {card.is_foil && <span className="text-xs shrink-0" style={{ color: '#facc15' }}>✦</span>}
              </div>
              <p className="text-xs truncate" style={{ color: '#8892a4' }}>{card.set_name}</p>
            </div>
            {conditionSelect(card, { width: '130px', flexShrink: 0 })}
            <QuantityControl quantity={card.quantity} onIncrease={() => handleIncrease(card)} onDecrease={() => handleDecrease(card)} />
          </div>
        )

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

        const setHeader = (setName, count) => (
          <div className="flex items-center gap-3 mt-2 mb-3">
            <h3 className="text-sm font-semibold shrink-0" style={{ color: '#EAEAEA' }}>{setName}</h3>
            <div className="flex-1 h-px" style={{ backgroundColor: '#363d52' }} />
            <span className="text-xs shrink-0" style={{ color: '#8892a4' }}>{count} {count === 1 ? 'card' : 'cards'}</span>
          </div>
        )

        if (groupBySet) {
          return groupedCards.map(group => (
            <div key={group.setName} className="mb-6">
              {setHeader(group.setName, group.cards.length)}
              {viewMode === 'grid' ? gridGroup(group.cards) : listGroup(group.cards)}
            </div>
          ))
        }

        return viewMode === 'grid' ? gridGroup(pagedCards) : listGroup(pagedCards)
      })()}

      {/* Undo toast */}
      {undoCard && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
          style={{ transform: 'translateX(-50%)', backgroundColor: '#2d3243', border: '1px solid #4a5268', color: '#EAEAEA', whiteSpace: 'nowrap' }}
        >
          <span className="text-sm">Removed <strong>{undoCard.card_name}</strong></span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold px-2 py-0.5 rounded"
            style={{ color: '#08D9D6', backgroundColor: '#1e2330', border: '1px solid #363d52' }}
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
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: safePage === 1 ? '#4a5268' : '#EAEAEA', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
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
                <span key={`ellipsis-${i}`} className="text-sm px-1" style={{ color: '#4a5268' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="text-sm w-8 h-8 rounded"
                  style={{
                    backgroundColor: p === safePage ? '#08D9D6' : '#2d3243',
                    border: '1px solid #363d52',
                    color: p === safePage ? '#13172b' : '#EAEAEA',
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
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: safePage === totalPages ? '#4a5268' : '#EAEAEA', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next ›
          </button>

          <span className="text-xs ml-2" style={{ color: '#8892a4' }}>
            {pageStart + 1}–{Math.min(pageStart + pageSize, filteredCards.length)} of {filteredCards.length}
          </span>
        </div>
      )}
    </div>
  )
}
