import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity, rarityRank } from '../theme'

const isTouchDevice = window.matchMedia('(hover: none)').matches

export default function CardsPage() {
  const { setId } = useParams()
  const [cards, setCards] = useState([])
  const [setInfo, setSetInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  // printing_id -> quantity for cards the user owns in this set
  const [owned, setOwned] = useState({})
  const [addingSet, setAddingSet] = useState(false)
  const [sort, setSort] = useState('name_asc')
  const [rarityFilter, setRarityFilter] = useState([])
  const [rarityOpen, setRarityOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/sets/${setId}`).then(r => r.json()),
      fetch(`${API_URL}/api/sets/${setId}/cards`).then(r => r.json()),
    ]).then(([setData, cardsData]) => {
      setSetInfo(setData?.id ? setData : null)
      setCards(Array.isArray(cardsData) ? cardsData : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [setId])

  useEffect(() => {
    if (!user) { setOwned({}); return }
    authFetch(`${API_URL}/api/users/me/collection/set/${setId}`)
      .then(r => r.json())
      .then(data => setOwned(data || {}))
      .catch(() => setOwned({}))
  }, [user, setId, authFetch])

  const allRarities = useMemo(() => {
    const seen = new Set()
    for (const c of cards) if (c.rarity) seen.add(c.rarity)
    return [...seen].sort((a, b) => rarityRank(a) - rarityRank(b))
  }, [cards])

  const sortedCards = useMemo(() => {
    let filtered = rarityFilter.length > 0 ? cards.filter(c => rarityFilter.includes(c.rarity)) : cards
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name_asc':      return a.name.localeCompare(b.name)
        case 'name_desc':     return b.name.localeCompare(a.name)
        case 'rarity_desc':   return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name)
        case 'rarity_asc':    return rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name)
        default: {
          const na = parseInt(a.collector_number) || 0
          const nb = parseInt(b.collector_number) || 0
          return na !== nb ? na - nb : a.name.localeCompare(b.name)
        }
      }
    })
  }, [cards, sort, rarityFilter])

  const showAll = pageSize === 0
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(sortedCards.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedCards = showAll ? sortedCards : sortedCards.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function handleAddSet() {
    setAddingSet(true)
    const res = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`, { method: 'POST' })
    if (res.ok) {
      // Refresh owned state to reflect the new quantities
      const data = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`).then(r => r.json())
      setOwned(data || {})
    }
    setAddingSet(false)
  }

  const handleMouseEnter = (e, card) => {
    if (!card.image_url || isTouchDevice) return
    e.currentTarget.style.borderColor = '#6A7EFC'
    e.currentTarget.style.transform = 'scale(1.05)'

    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 360
    const tooltipHeight = 504

    setTooltipPos({
      x: rect.left + rect.width / 2 - tooltipWidth / 2,
      y: rect.top + rect.height / 2 - tooltipHeight / 2,
    })
    setHoveredCard(card)
  }

  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = '#42424e'
    e.currentTarget.style.transform = 'scale(1)'
    setHoveredCard(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8e8e9e' }}>Loading cards...</p>
    </div>
  )

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#6A7EFC' }}
      >
        ← Back to Sets
      </button>

      {/* Game + Set header */}
      {setInfo && (
        <div className="mb-8">
          <p
            className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: '#6A7EFC' }}
            onClick={() => navigate(`/games/${setInfo.game_slug}`)}
          >
            {setInfo.game_name}
          </p>
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#EDF2F6' }}>
            {setInfo.name}
          </h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p style={{ color: '#8e8e9e' }}>
              {cards.length} cards
              {setInfo.release_date && (
                <span> · {new Date(setInfo.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </p>
            {user && (
              <button
                onClick={handleAddSet}
                disabled={addingSet}
                className="text-sm px-3 py-1 rounded transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: '#35353f',
                  border: '1px solid #6A7EFC',
                  color: '#6A7EFC',
                  opacity: addingSet ? 0.6 : 1,
                  cursor: addingSet ? 'not-allowed' : 'pointer',
                }}
              >
                {addingSet ? 'Adding…' : '+ Add Set to Collection'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort / filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1) }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}
        >
          <option value="number_asc">Collector # ↑</option>
          <option value="name_asc">Name A→Z</option>
          <option value="name_desc">Name Z→A</option>
          <option value="rarity_desc">Rarity: High→Low</option>
          <option value="rarity_asc">Rarity: Low→High</option>
        </select>

        {/* Rarity filter dropdown */}
        {allRarities.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setRarityOpen(o => !o)}
              className="text-sm px-3 py-1.5 rounded flex items-center gap-1.5"
              style={{
                backgroundColor: '#35353f',
                border: `1px solid ${rarityFilter.length > 0 ? '#6A7EFC' : '#42424e'}`,
                color: rarityFilter.length > 0 ? '#6A7EFC' : '#EDF2F6',
              }}
            >
              Show{rarityFilter.length > 0 ? ` (${rarityFilter.length})` : ''} ▾
            </button>
            {rarityOpen && (
              <div className="absolute z-20 mt-1 rounded-lg shadow-xl min-w-[160px]"
                style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
                <div className="p-1">
                  {allRarities.map(r => (
                    <label key={r} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: rarityFilter.includes(r) ? '#35353f' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={rarityFilter.includes(r)}
                        onChange={() => {
                          setRarityFilter(prev =>
                            prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                          )
                          setPage(1)
                        }}
                        className="accent-[#6A7EFC]"
                      />
                      <span className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(r)] || '#8e8e9e' }}>{r}</span>
                    </label>
                  ))}
                  {rarityFilter.length > 0 && (
                    <button
                      onClick={() => { setRarityFilter([]); setPage(1) }}
                      className="w-full text-xs px-3 py-1.5 mt-1 rounded text-left"
                      style={{ color: '#8e8e9e', borderTop: '1px solid #42424e' }}
                    >Clear filter</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={0}>Show all</option>
        </select>
        <span className="text-xs ml-auto" style={{ color: '#8e8e9e' }}>
          {sortedCards.length} cards
          {totalPages > 1 && ` · page ${safePage} of ${totalPages}`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pagedCards.map(card => {
          const quantity = owned[card.printing_id]
          const isOwned = quantity > 0
          return (
            <div
              key={card.id}
              onClick={() => navigate(`/cards/${card.id}`)}
              className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border relative"
              style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}
              onMouseEnter={e => handleMouseEnter(e, card)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Owned quantity badge */}
              {isOwned && (
                <div
                  className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#6A7EFC', color: '#26262e' }}
                >
                  ×{quantity}
                </div>
              )}

              {card.image_url ? (
                <img src={card.image_url} alt={card.name} className="w-full" />
              ) : (
                <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                  style={{ backgroundColor: '#42424e' }}>
                  <span className="text-sm text-center" style={{ color: '#8e8e9e' }}>{card.name}</span>
                </div>
              )}

              <div className="p-2 flex items-end justify-between gap-1">
                <p className="text-xs font-medium leading-tight" style={{ color: '#EDF2F6' }}>{card.name}</p>
                <p className="text-xs capitalize shrink-0" style={{ color: RARITY_COLORS[normalizeRarity(card.rarity)] || '#8e8e9e' }}>{card.rarity}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: safePage === 1 ? '#555562' : '#EDF2F6', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
          >
            ‹ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="text-sm px-1" style={{ color: '#555562' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="text-sm w-8 h-8 rounded"
                  style={{
                    backgroundColor: p === safePage ? '#6A7EFC' : '#35353f',
                    border: '1px solid #42424e',
                    color: p === safePage ? '#1f1f25' : '#EDF2F6',
                    fontWeight: p === safePage ? '600' : '400',
                  }}
                >{p}</button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: safePage === totalPages ? '#555562' : '#EDF2F6', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Hover magnification tooltip */}
      {hoveredCard && hoveredCard.image_url && (
        <div
          className="fixed pointer-events-none z-50 rounded-xl overflow-hidden"
          style={{
            left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)),
            top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)),
            width: 360,
            boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
          }}
        >
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
        </div>
      )}
    </div>
  )
}
