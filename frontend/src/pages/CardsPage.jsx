import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity } from '../theme'

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
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25
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

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      switch (sort) {
        case 'name_asc':    return a.name.localeCompare(b.name)
        case 'name_desc':   return b.name.localeCompare(a.name)
        case 'rarity_asc':  return (a.rarity || '').localeCompare(b.rarity || '') || a.name.localeCompare(b.name)
        case 'rarity_desc': return (b.rarity || '').localeCompare(a.rarity || '') || a.name.localeCompare(b.name)
        default: { // number_asc — collector number order (original API order)
          const na = parseInt(a.collector_number) || 0
          const nb = parseInt(b.collector_number) || 0
          return na !== nb ? na - nb : a.name.localeCompare(b.name)
        }
      }
    })
  }, [cards, sort])

  const totalPages = Math.max(1, Math.ceil(sortedCards.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedCards = sortedCards.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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

  async function handleAdd(e, card) {
    e.stopPropagation()
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: card.printing_id, quantity: 1, is_foil: false }),
    })
    if (res.ok) {
      const result = await res.json()
      setOwned(prev => ({ ...prev, [card.printing_id]: result.quantity }))
    }
  }

  async function handleRemove(e, card) {
    e.stopPropagation()
    const res = await authFetch(`${API_URL}/api/users/me/collection/${card.printing_id}?foil=false`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setOwned(prev => {
        const next = { ...prev }
        delete next[card.printing_id]
        return next
      })
    }
  }

  const handleMouseEnter = (e, card) => {
    if (!card.image_url || isTouchDevice) return
    e.currentTarget.style.borderColor = '#08D9D6'
    e.currentTarget.style.transform = 'scale(1.05)'

    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 360
    const tooltipHeight = 500

    setTooltipPos({
      x: rect.left + rect.width / 2 - tooltipWidth / 2,
      y: rect.top + rect.height / 2 - tooltipHeight / 2,
    })
    setHoveredCard(card)
  }

  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = '#363d52'
    e.currentTarget.style.transform = 'scale(1)'
    setHoveredCard(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8892a4' }}>Loading cards...</p>
    </div>
  )

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#08D9D6' }}
      >
        ← Back to Sets
      </button>

      {/* Game + Set header */}
      {setInfo && (
        <div className="mb-8">
          <p
            className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: '#08D9D6' }}
            onClick={() => navigate(`/games/${setInfo.game_slug}`)}
          >
            {setInfo.game_name}
          </p>
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#EAEAEA' }}>
            {setInfo.name}
          </h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p style={{ color: '#8892a4' }}>
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
                  backgroundColor: '#2d3243',
                  border: '1px solid #08D9D6',
                  color: '#08D9D6',
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

      {/* Sort bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1) }}
          className="text-sm px-3 py-1.5 rounded"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }}
        >
          <option value="number_asc">Collector # ↑</option>
          <option value="name_asc">Name A→Z</option>
          <option value="name_desc">Name Z→A</option>
          <option value="rarity_asc">Rarity A→Z</option>
          <option value="rarity_desc">Rarity Z→A</option>
        </select>
        <span className="text-xs ml-auto" style={{ color: '#8892a4' }}>
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
              style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
              onMouseEnter={e => handleMouseEnter(e, card)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Owned quantity badge */}
              {isOwned && (
                <div
                  className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
                >
                  ×{quantity}
                </div>
              )}

              {card.image_url ? (
                <img src={card.image_url} alt={card.name} className="w-full" />
              ) : (
                <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                  style={{ backgroundColor: '#363d52' }}>
                  <span className="text-sm text-center" style={{ color: '#8892a4' }}>{card.name}</span>
                </div>
              )}

              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: '#EAEAEA' }}>{card.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(card.rarity)] || '#8892a4' }}>{card.rarity}</p>
                  {user && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {isOwned && (
                        <button
                          onClick={e => handleRemove(e, card)}
                          className="text-xs px-1 rounded leading-none"
                          style={{ color: '#FF2E63', backgroundColor: '#2d3243' }}
                          title="Remove one"
                        >
                          −
                        </button>
                      )}
                      <button
                        onClick={e => handleAdd(e, card)}
                        className="text-xs px-1 rounded leading-none"
                        style={{ color: '#08D9D6', backgroundColor: '#2d3243' }}
                        title="Add to collection"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
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
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: safePage === 1 ? '#4a5268' : '#EAEAEA', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
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
                <span key={`e-${i}`} className="text-sm px-1" style={{ color: '#4a5268' }}>…</span>
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
                >{p}</button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: safePage === totalPages ? '#4a5268' : '#EAEAEA', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Hover magnification tooltip */}
      {hoveredCard && hoveredCard.image_url && (
        <div
          className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)),
            top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)),
            width: 360,
            border: '2px solid #08D9D6',
            backgroundColor: '#2d3243',
            transition: 'opacity 0.15s ease',
            boxShadow: '0 0 40px rgba(8, 217, 214, 0.3)',
          }}
        >
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
          <div className="p-2">
            <p className="text-sm font-semibold truncate" style={{ color: '#EAEAEA' }}>
              {hoveredCard.name}
            </p>
            {hoveredCard.rarity && (
              <p className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(hoveredCard.rarity)] || '#8892a4' }}>{hoveredCard.rarity}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
