import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity, rarityRank } from '../theme'

const isTouchDevice = window.matchMedia('(hover: none)').matches

export default function CardsPage() {
  const { setId } = useParams()
  const [cards, setCards]       = useState([])
  const [setInfo, setSetInfo]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipPos, setTooltipPos]   = useState({ x: 0, y: 0 })
  const [owned, setOwned]       = useState({})   // printing_id → quantity
  const [addingSet, setAddingSet] = useState(false)
  const [sort, setSort]         = useState('number_asc')
  const [search, setSearch]     = useState('')
  const [rarityFilter, setRarityFilter] = useState([])
  const [rarityOpen, setRarityOpen]     = useState(false)
  const rarityRef = useRef(null)
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // view + bulk-add state
  const [viewMode, setViewMode]       = useState('card')   // 'card' | 'list'
  const [bulkTarget, setBulkTarget]   = useState(null)     // null | 'collection' | 'deck' | 'wishlist'
  const [bulkOpen, setBulkOpen]       = useState(false)
  const [bulkQtys, setBulkQtys]       = useState({})       // printing_id → qty delta
  const [bulkDecks, setBulkDecks]     = useState(null)     // deck list for game
  const [bulkDeckId, setBulkDeckId]   = useState(null)
  const [bulkSaving, setBulkSaving]   = useState(false)
  const [bulkMsg, setBulkMsg]         = useState('')
  const bulkRef = useRef(null)

  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  // ── Click-outside handlers ────────────────────────────────────────────────
  useEffect(() => {
    if (!rarityOpen) return
    const h = e => { if (rarityRef.current && !rarityRef.current.contains(e.target)) setRarityOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [rarityOpen])

  useEffect(() => {
    if (!bulkOpen) return
    const h = e => { if (bulkRef.current && !bulkRef.current.contains(e.target)) setBulkOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [bulkOpen])

  // ── Data fetching ─────────────────────────────────────────────────────────
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
      .then(r => r.json()).then(data => setOwned(data || {})).catch(() => setOwned({}))
  }, [user, setId, authFetch])

  // ── Sorting / filtering / paging ──────────────────────────────────────────
  const allRarities = useMemo(() => {
    const seen = new Set()
    for (const c of cards) if (c.rarity) seen.add(c.rarity)
    return [...seen].sort((a, b) => rarityRank(a) - rarityRank(b))
  }, [cards])

  const sortedCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    let filtered = cards
    if (q)                     filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    if (rarityFilter.length > 0) filtered = filtered.filter(c => rarityFilter.includes(c.rarity))
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name_asc':    return a.name.localeCompare(b.name)
        case 'name_desc':   return b.name.localeCompare(a.name)
        case 'rarity_desc': return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name)
        case 'rarity_asc':  return rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name)
        default: {
          const na = parseInt(a.collector_number) || 0
          const nb = parseInt(b.collector_number) || 0
          return na !== nb ? na - nb : a.name.localeCompare(b.name)
        }
      }
    })
  }, [cards, sort, rarityFilter])

  const showAll    = pageSize === 0
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(sortedCards.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pagedCards = showAll ? sortedCards : sortedCards.slice((safePage - 1) * pageSize, safePage * pageSize)

  const anyOwned = Object.values(owned).some(q => q > 0)

  // ── Add entire set ────────────────────────────────────────────────────────
  async function handleAddSet() {
    setAddingSet(true)
    const res = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`, { method: 'POST' })
    if (res.ok) {
      const data = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`).then(r => r.json())
      setOwned(data || {})
    }
    setAddingSet(false)
  }

  // ── Bulk target selection ─────────────────────────────────────────────────
  async function selectBulkTarget(target) {
    setBulkOpen(false)
    setBulkQtys({})
    setBulkMsg('')
    setBulkTarget(target)
    if (target === 'deck' && bulkDecks === null && setInfo) {
      const data = await authFetch(`${API_URL}/api/users/me/decks`).then(r => r.json())
      const decks = Array.isArray(data) ? data.filter(d => d.game_id === setInfo.game_id) : []
      setBulkDecks(decks)
      setBulkDeckId(decks[0]?.id || null)
    }
  }

  function adjustQty(printingId, delta) {
    setBulkQtys(prev => {
      const next = Math.max(0, (prev[printingId] || 0) + delta)
      const updated = { ...prev }
      if (next === 0) delete updated[printingId]
      else updated[printingId] = next
      return updated
    })
  }

  function setQty(printingId, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setBulkQtys(prev => {
      const updated = { ...prev }
      if (n === 0) delete updated[printingId]
      else updated[printingId] = n
      return updated
    })
  }

  // ── Bulk save ─────────────────────────────────────────────────────────────
  const handleBulkSave = useCallback(async () => {
    const entries = Object.entries(bulkQtys)
    if (!entries.length) return
    setBulkSaving(true)
    setBulkMsg('')

    if (bulkTarget === 'collection') {
      await Promise.all(entries.map(([pid, qty]) =>
        authFetch(`${API_URL}/api/users/me/collection`, {
          method: 'POST',
          body: JSON.stringify({ printing_id: Number(pid), quantity: qty, finish: 'normal', condition: 'NM' }),
        })
      ))
      // Refresh owned
      const data = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`).then(r => r.json())
      setOwned(data || {})
      setBulkMsg(`${entries.length} card${entries.length > 1 ? 's' : ''} added to collection`)
    }

    if (bulkTarget === 'deck' && bulkDeckId) {
      // Find card_id from printing_id
      const pidToCard = {}
      for (const c of cards) pidToCard[c.printing_id] = c.id
      await Promise.all(entries.map(([pid, qty]) =>
        authFetch(`${API_URL}/api/decks/${bulkDeckId}/cards`, {
          method: 'POST',
          body: JSON.stringify({ card_id: pidToCard[pid], quantity: qty }),
        })
      ))
      setBulkMsg(`${entries.length} card${entries.length > 1 ? 's' : ''} added to deck`)
    }

    if (bulkTarget === 'wishlist') {
      await Promise.all(entries.map(([pid]) =>
        authFetch(`${API_URL}/api/users/me/wishlist`, {
          method: 'POST',
          body: JSON.stringify({ printing_id: Number(pid) }),
        })
      ))
      setBulkMsg(`${entries.length} card${entries.length > 1 ? 's' : ''} added to wishlist`)
    }

    setBulkSaving(false)
    setBulkQtys({})
    setTimeout(() => setBulkMsg(''), 3000)
  }, [bulkQtys, bulkTarget, bulkDeckId, cards, setId, authFetch])

  // ── Image grid hover ──────────────────────────────────────────────────────
  const handleMouseEnter = (e, card) => {
    if (!card.image_url || isTouchDevice) return
    e.currentTarget.style.borderColor = '#6A7EFC'
    e.currentTarget.style.transform = 'scale(1.05)'
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2 - 180,
      y: rect.top + rect.height / 2 - 252,
    })
    setHoveredCard(card)
  }
  const handleMouseLeave = e => {
    e.currentTarget.style.borderColor = '#42424e'
    e.currentTarget.style.transform = 'scale(1)'
    setHoveredCard(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8e8e9e' }}>Loading cards...</p>
    </div>
  )

  const isBulkActive = bulkTarget !== null
  const bulkCount = Object.keys(bulkQtys).length

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm mb-6 flex items-center gap-1 hover:opacity-80"
        style={{ color: '#6A7EFC' }}>
        ← Back to Sets
      </button>

      {/* ── Set header ──────────────────────────────────────────────────── */}
      {setInfo && (
        <div className="mb-8">
          <p className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80"
            style={{ color: '#6A7EFC' }} onClick={() => navigate(`/games/${setInfo.game_slug}`)}>
            {setInfo.game_name}
          </p>
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#EDF2F6' }}>{setInfo.name}</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p style={{ color: '#8e8e9e' }}>
              {cards.length} cards
              {setInfo.release_date && (
                <span> · {new Date(setInfo.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </p>
            {user && (
              <button onClick={handleAddSet} disabled={addingSet}
                className="text-sm px-3 py-1 rounded hover:opacity-80"
                style={{ backgroundColor: '#35353f', border: '1px solid #6A7EFC', color: '#6A7EFC', opacity: addingSet ? 0.6 : 1 }}>
                {addingSet ? 'Adding…' : '+ Add Set to Collection'}
              </button>
            )}
            {user && anyOwned && (
              <button onClick={() => navigate('/profile?tab=stats')}
                className="text-sm px-3 py-1 rounded hover:opacity-80"
                style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#8e8e9e' }}>
                My Collection Stats
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-sm pointer-events-none" style={{ color: '#8e8e9e' }}>⌕</span>
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="text-sm pl-7 pr-8 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: `1px solid ${search ? '#6A7EFC' : '#42424e'}`, color: '#EDF2F6', width: 180, outline: 'none' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-2 text-sm hover:opacity-80"
              style={{ color: '#8e8e9e' }}>×</button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Sort By</span>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
            <option value="number_asc">Collector # ↑</option>
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
            <option value="rarity_desc">Rarity: High→Low</option>
            <option value="rarity_asc">Rarity: Low→High</option>
          </select>
        </div>

        {/* Filter Rarity */}
        {allRarities.length > 0 && (
          <div className="flex items-center gap-1.5" ref={rarityRef}>
            <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Filter Rarity</span>
            <div className="relative">
              <button onClick={() => setRarityOpen(o => !o)}
                className="text-sm px-3 py-1.5 rounded flex items-center gap-1.5"
                style={{ backgroundColor: '#35353f', border: `1px solid ${rarityFilter.length > 0 ? '#6A7EFC' : '#42424e'}`, color: rarityFilter.length > 0 ? '#6A7EFC' : '#EDF2F6' }}>
                {rarityFilter.length > 0 ? `${rarityFilter.length} selected` : 'All'} ▾
              </button>
              {rarityOpen && (
                <div className="absolute z-20 mt-1 rounded-lg shadow-xl min-w-[160px]"
                  style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
                  <div className="p-1">
                    {allRarities.map(r => (
                      <label key={r} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: rarityFilter.includes(r) ? '#35353f' : 'transparent' }}>
                        <input type="checkbox" checked={rarityFilter.includes(r)}
                          onChange={() => { setRarityFilter(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]); setPage(1) }}
                          className="accent-[#6A7EFC]" />
                        <span className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(r)] || '#8e8e9e' }}>{r}</span>
                      </label>
                    ))}
                    {rarityFilter.length > 0 && (
                      <button onClick={() => { setRarityFilter([]); setPage(1) }}
                        className="w-full text-xs px-3 py-1.5 mt-1 rounded text-left"
                        style={{ color: '#8e8e9e', borderTop: '1px solid #42424e' }}>
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cards Per Page */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Cards Per Page</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={0}>Show All</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>View As</span>
          <div className="flex rounded overflow-hidden border" style={{ borderColor: '#42424e' }}>
            <button onClick={() => { setViewMode('card'); setPageSize(25); setPage(1) }}
              className="text-xs px-3 py-1.5 transition-colors"
              style={{ backgroundColor: viewMode === 'card' ? '#6A7EFC' : '#35353f', color: viewMode === 'card' ? '#fff' : '#8e8e9e' }}>
              Images
            </button>
            <button onClick={() => { setViewMode('list'); setPageSize(0); setPage(1) }}
              className="text-xs px-3 py-1.5 transition-colors"
              style={{ backgroundColor: viewMode === 'list' ? '#6A7EFC' : '#35353f', color: viewMode === 'list' ? '#fff' : '#8e8e9e', borderLeft: '1px solid #42424e' }}>
              Grid
            </button>
          </div>
        </div>

        {/* Add Multiple To... */}
        {user && (
          <div className="relative" ref={bulkRef}>
            <button onClick={() => setBulkOpen(o => !o)}
              className="text-sm px-3 py-1.5 rounded flex items-center gap-1.5"
              style={{ backgroundColor: isBulkActive ? '#1a2a4a' : '#35353f', border: `1px solid ${isBulkActive ? '#6A7EFC' : '#42424e'}`, color: isBulkActive ? '#6A7EFC' : '#EDF2F6' }}>
              Add Multiple To… ▾
            </button>
            {bulkOpen && (
              <div className="absolute z-20 mt-1 rounded-lg shadow-xl min-w-[160px]"
                style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
                {[['collection','Collection'],['deck','Deck'],['wishlist','Wishlist']].map(([key, label]) => (
                  <button key={key} onClick={() => selectBulkTarget(bulkTarget === key ? null : key)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 flex items-center justify-between"
                    style={{ color: bulkTarget === key ? '#6A7EFC' : '#EDF2F6', borderBottom: '1px solid #3a3a44' }}>
                    {label}
                    {bulkTarget === key && <span className="text-xs">✓</span>}
                  </button>
                ))}
                {isBulkActive && (
                  <button onClick={() => { setBulkTarget(null); setBulkQtys({}); setBulkMsg('') }}
                    className="w-full text-left px-4 py-2 text-xs hover:opacity-80"
                    style={{ color: '#8e8e9e' }}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <span className="text-xs ml-auto" style={{ color: '#8e8e9e' }}>
          {sortedCards.length} cards{totalPages > 1 && ` · page ${safePage} of ${totalPages}`}
        </span>
      </div>

      {/* ── Bulk mode bar ────────────────────────────────────────────────── */}
      {isBulkActive && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg flex-wrap"
          style={{ backgroundColor: '#1a2a4a', border: '1px solid #6A7EFC33' }}>
          <span className="text-sm font-medium" style={{ color: '#6A7EFC' }}>
            Adding to {bulkTarget === 'collection' ? 'Collection' : bulkTarget === 'deck' ? 'Deck' : 'Wishlist'}
          </span>
          {bulkTarget === 'deck' && bulkDecks !== null && (
            <select value={bulkDeckId || ''} onChange={e => setBulkDeckId(Number(e.target.value))}
              className="text-sm px-2 py-1 rounded"
              style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
              {bulkDecks.length === 0
                ? <option disabled>No decks for this game</option>
                : bulkDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
              }
            </select>
          )}
          <span className="text-xs" style={{ color: '#8e8e9e' }}>
            {bulkCount > 0 ? `${bulkCount} card${bulkCount > 1 ? 's' : ''} selected` : 'Click + on cards below'}
          </span>
          {bulkCount > 0 && (
            <button onClick={handleBulkSave} disabled={bulkSaving}
              className="text-sm px-4 py-1.5 rounded font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#6A7EFC', color: '#fff' }}>
              {bulkSaving ? 'Saving…' : `Save ${bulkCount} Card${bulkCount > 1 ? 's' : ''}`}
            </button>
          )}
          {bulkMsg && <span className="text-sm" style={{ color: '#a5d6a7' }}>{bulkMsg}</span>}
          <button onClick={() => { setBulkTarget(null); setBulkQtys({}); setBulkMsg('') }}
            className="ml-auto text-xs hover:opacity-80" style={{ color: '#8e8e9e' }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Card image grid ───────────────────────────────────────────────── */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pagedCards.map(card => {
            const quantity = owned[card.printing_id]
            const isOwned = quantity > 0
            const bulkQty = bulkQtys[card.printing_id] || 0
            return (
              <div key={card.id} className="rounded-xl overflow-hidden border relative flex flex-col"
                style={{ backgroundColor: '#35353f', borderColor: bulkQty > 0 ? '#6A7EFC' : '#42424e' }}>
                {isOwned && (
                  <div className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#6A7EFC', color: '#26262e' }}>×{quantity}</div>
                )}
                <div className="cursor-pointer transition-all duration-200"
                  onClick={() => !isBulkActive && navigate(`/cards/${card.id}`)}
                  onMouseEnter={e => !isBulkActive && handleMouseEnter(e, card)}
                  onMouseLeave={e => !isBulkActive && handleMouseLeave(e)}>
                  {card.image_url
                    ? <img src={card.image_url} alt={card.name} className="w-full" />
                    : <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                        style={{ backgroundColor: '#42424e' }}>
                        <span className="text-sm text-center" style={{ color: '#8e8e9e' }}>{card.name}</span>
                      </div>
                  }
                </div>
                <div className="p-2 flex items-end justify-between gap-1">
                  <p className="text-xs font-medium leading-tight" style={{ color: '#EDF2F6' }}>{card.name}</p>
                  <p className="text-xs capitalize shrink-0" style={{ color: RARITY_COLORS[normalizeRarity(card.rarity)] || '#8e8e9e' }}>{card.rarity}</p>
                </div>
                {isBulkActive && (
                  <div className="px-2 pb-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => adjustQty(card.printing_id, -1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }}>−</button>
                    <input type="number" min={0} value={bulkQty || ''} placeholder="0"
                      onChange={e => setQty(card.printing_id, e.target.value)}
                      className="w-full text-center text-sm rounded px-1 py-0.5"
                      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }} />
                    <button onClick={() => adjustQty(card.printing_id, 1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#6A7EFC' }}>+</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── List view ────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-2 gap-1">
          {pagedCards.map(card => {
            const quantity    = owned[card.printing_id]
            const isOwned     = quantity > 0
            const bulkQty     = bulkQtys[card.printing_id] || 0
            const rarityColor = RARITY_COLORS[normalizeRarity(card.rarity)] || '#8e8e9e'
            return (
              <div key={card.id}
                onClick={() => !isBulkActive && navigate(`/cards/${card.id}`)}
                className={`rounded border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${!isBulkActive ? 'cursor-pointer hover:border-[#6A7EFC]' : ''}`}
                style={{ backgroundColor: bulkQty > 0 ? '#1a2a4a' : '#2a2a34', borderColor: bulkQty > 0 ? '#6A7EFC' : '#42424e' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: '#EDF2F6' }}>{card.name}</span>
                  {isOwned && (
                    <span className="text-xs font-bold px-1 rounded shrink-0"
                      style={{ backgroundColor: '#6A7EFC22', color: '#6A7EFC' }}>×{quantity}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs capitalize" style={{ color: rarityColor }}>{card.rarity}</span>
                  {isBulkActive && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => adjustQty(card.printing_id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>−</button>
                      <input type="number" min={0} value={bulkQty || ''} placeholder="0"
                        onChange={e => setQty(card.printing_id, e.target.value)}
                        className="w-10 text-center text-xs rounded px-1 py-0.5"
                        style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }} />
                      <button onClick={() => adjustQty(card.printing_id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#6A7EFC' }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: safePage === 1 ? '#555562' : '#EDF2F6', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
            ‹ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc }, [])
            .map((p, i) => p === '…'
              ? <span key={`e-${i}`} className="text-sm px-1" style={{ color: '#555562' }}>…</span>
              : <button key={p} onClick={() => setPage(p)} className="text-sm w-8 h-8 rounded"
                  style={{ backgroundColor: p === safePage ? '#6A7EFC' : '#35353f', border: '1px solid #42424e', color: p === safePage ? '#1f1f25' : '#EDF2F6', fontWeight: p === safePage ? '600' : '400' }}>
                  {p}
                </button>
            )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: safePage === totalPages ? '#555562' : '#EDF2F6', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
            Next ›
          </button>
        </div>
      )}

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {hoveredCard && hoveredCard.image_url && (
        <div className="fixed pointer-events-none z-50 rounded-xl overflow-hidden"
          style={{ left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)), top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)), width: 360, boxShadow: '0 8px 48px rgba(0,0,0,0.7)' }}>
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
        </div>
      )}
    </div>
  )
}
