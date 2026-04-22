import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

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

export default function CollectionGamePage() {
  const { gameSlug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authFetch } = useAuth()

  const [gameData, setGameData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [setFilter, setSetFilter] = useState(searchParams.get('set') ?? '')
  const [sort, setSort] = useState('name_asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

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
      body: JSON.stringify({ printing_id: card.printing_id, quantity: 1 }),
    })
    if (!res.ok) return
    const result = await res.json()
    setGameData(prev => prev && {
      ...prev,
      cards: prev.cards.map(c => c.printing_id === card.printing_id ? { ...c, quantity: result.quantity } : c)
    })
  }, [authFetch])

  const handleDecrease = useCallback(async (card) => {
    if (card.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, { method: 'DELETE' })
      if (!res.ok) return
      setGameData(prev => prev && { ...prev, cards: prev.cards.filter(c => c.printing_id !== card.printing_id) })
    } else {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: card.quantity - 1 }),
      })
      if (!res.ok) return
      const result = await res.json()
      setGameData(prev => prev && {
        ...prev,
        cards: prev.cards.map(c => c.printing_id === card.printing_id ? { ...c, quantity: result.quantity } : c)
      })
    }
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
  const pagedCards = filteredCards.slice(pageStart, pageStart + pageSize)

  function resetPage() { setPage(1) }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#13172b' }}>
        <p style={{ color: '#8892a4' }}>Loading collection…</p>
      </div>
    )
  }

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#13172b' }}>
        <p style={{ color: '#8892a4' }}>No cards found for this game.</p>
        <Link to="/profile" style={{ color: '#08D9D6' }}>← Back to collection</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 mx-auto" style={{ backgroundColor: '#13172b', maxWidth: '1400px' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: '#8892a4' }}>
        <Link to="/profile" style={{ color: '#08D9D6' }}>My Collection</Link>
        <span>›</span>
        <span style={{ color: '#EAEAEA' }}>{gameData.game_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Card grid */}
      {filteredCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {pagedCards.map(card => (
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
                onIncrease={() => handleIncrease(card)}
                onDecrease={() => handleDecrease(card)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
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
