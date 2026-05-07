import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity, rarityRank } from '../theme'

const isTouchDevice = window.matchMedia('(hover: none)').matches

// Known game attribute fields that are worth sorting by, in preferred display order
const ATTR_SORT_FIELDS = [
  { key: 'cmc',        label: 'CMC'         },
  { key: 'cost',       label: 'Cost'        },
  { key: 'level',      label: 'Level'       },
  { key: 'hp',         label: 'HP'          },
  { key: 'life',       label: 'Life'        },
  { key: 'lore',       label: 'Lore'        },
  { key: 'power',      label: 'Power'       },
  { key: 'attack',     label: 'Attack'      },
  { key: 'atk',        label: 'ATK'         },
  { key: 'defence',    label: 'Defence'     },
  { key: 'def',        label: 'DEF'         },
  { key: 'defense',    label: 'Defense'     },
  { key: 'strength',   label: 'Strength'    },
  { key: 'willpower',  label: 'Willpower'   },
  { key: 'pitch',      label: 'Pitch'       },
  { key: 'playCost',   label: 'Play Cost'   },
  { key: 'dp',         label: 'DP'          },
  { key: 'comboPower', label: 'Combo Power' },
  { key: 'ap',         label: 'AP'          },
  { key: 'bp',         label: 'BP'          },
  { key: 'energyCost', label: 'Energy Cost' },
  { key: 'might',      label: 'Might'       },
  { key: 'lp',         label: 'Life Points' },
]

function attrNum(card, key) {
  const raw = card.attributes?.[key]
  if (raw == null || raw === '' || raw === '-') return null
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

export default function CardsPage() {
  const { setId } = useParams()
  const [cards, setCards]       = useState([])
  const [setInfo, setSetInfo]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipPos, setTooltipPos]   = useState({ x: 0, y: 0 })
  const [owned, setOwned]       = useState({})   // printing_id → quantity
  const [addingSet, setAddingSet] = useState(false)
  const [rarityOpen, setRarityOpen] = useState(false)
  const rarityRef = useRef(null)

  // ── URL-persisted filter/sort/page state ──────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const sort        = searchParams.get('sort')    || 'name_asc'
  const search      = searchParams.get('q')       || ''
  const rarityFilter = searchParams.getAll('rarity')
  const page        = parseInt(searchParams.get('page') || '1', 10)
  const _per        = searchParams.get('per')
  const pageSize    = _per === null ? 25 : parseInt(_per, 10)
  const viewMode    = searchParams.get('view')    || 'card'

  function setParam(updates) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === '') {
          next.delete(k)
        } else if (Array.isArray(v)) {
          next.delete(k)
          for (const item of v) next.append(k, item)
        } else {
          next.set(k, String(v))
        }
      }
      return next
    }, { replace: true })
  }

  // view + bulk-add state
  // viewMode is in URL; 'card' | 'list'
  const [bulkTarget, setBulkTarget]   = useState(null)     // null | 'collection' | 'deck' | 'wishlist'
  const [bulkQtys, setBulkQtys]       = useState({})       // printing_id → qty delta
  const [bulkDecks, setBulkDecks]     = useState(null)     // deck list for game
  const [bulkDeckId, setBulkDeckId]   = useState(null)
  const [bulkSaving, setBulkSaving]   = useState(false)
  const [bulkMsg, setBulkMsg]         = useState('')

  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  // ── Click-outside handlers ────────────────────────────────────────────────
  useEffect(() => {
    if (!rarityOpen) return
    const h = e => { if (rarityRef.current && !rarityRef.current.contains(e.target)) setRarityOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [rarityOpen])

  // Default bulk target to collection when logged in
  useEffect(() => {
    setBulkTarget(user ? 'collection' : null)
    setBulkQtys({})
  }, [user])

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

  const hasCardType = useMemo(() => cards.some(c => c.card_type), [cards])

  const availableAttrSorts = useMemo(() => {
    if (!cards.length) return []
    return ATTR_SORT_FIELDS.filter(f => cards.some(c => attrNum(c, f.key) != null))
  }, [cards])

  const sortedCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    let filtered = cards
    if (q)                     filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    if (rarityFilter.length > 0) filtered = filtered.filter(c => rarityFilter.includes(c.rarity))
    return [...filtered].sort((a, b) => {
      if (sort === 'name_asc')    return a.name.localeCompare(b.name)
      if (sort === 'name_desc')   return b.name.localeCompare(a.name)
      if (sort === 'rarity_desc') return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name)
      if (sort === 'rarity_asc')  return rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name)
      if (sort === 'type_asc')    return (a.card_type || '').localeCompare(b.card_type || '') || a.name.localeCompare(b.name)
      if (sort === 'type_desc')   return (b.card_type || '').localeCompare(a.card_type || '') || a.name.localeCompare(b.name)
      // Dynamic attribute sorts: "attr_<key>_asc" / "attr_<key>_desc"
      const attrMatch = sort.match(/^attr_(.+)_(asc|desc)$/)
      if (attrMatch) {
        const [, key, dir] = attrMatch
        const va = attrNum(a, key) ?? Infinity
        const vb = attrNum(b, key) ?? Infinity
        const cmp = va - vb
        return dir === 'asc' ? (cmp || a.name.localeCompare(b.name)) : (-cmp || a.name.localeCompare(b.name))
      }
      // Default: collector number
      const na = parseInt(a.collector_number) || 0
      const nb = parseInt(b.collector_number) || 0
      return na !== nb ? na - nb : a.name.localeCompare(b.name)
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80"
                style={{ color: '#6A7EFC' }} onClick={() => navigate(`/games/${setInfo.game_slug}`)}>
                {setInfo.game_name}
              </p>
              <h2 className="text-3xl font-bold mb-1" style={{ color: '#EDF2F6' }}>{setInfo.name}</h2>
            </div>
            {/* View toggle — top right */}
            <div className="flex rounded overflow-hidden border shrink-0 mt-1" style={{ borderColor: '#42424e' }}>
              <button onClick={() => setParam({ view: null, per: null, page: 1 })}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === 'card' ? '#6A7EFC' : '#35353f', color: viewMode === 'card' ? '#fff' : '#8e8e9e' }}>
                Image View
              </button>
              <button onClick={() => setParam({ view: 'list', per: 0, page: 1 })}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === 'list' ? '#6A7EFC' : '#35353f', color: viewMode === 'list' ? '#fff' : '#8e8e9e', borderLeft: '1px solid #42424e' }}>
                Grid View
              </button>
            </div>
          </div>
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
            onChange={e => setParam({ q: e.target.value, page: 1 })}
            className="text-sm pl-7 pr-8 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: `1px solid ${search ? '#6A7EFC' : '#42424e'}`, color: '#EDF2F6', width: 180, outline: 'none' }}
          />
          {search && (
            <button onClick={() => setParam({ q: '', page: 1 })}
              className="absolute right-2 text-sm hover:opacity-80"
              style={{ color: '#8e8e9e' }}>×</button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Sort By</span>
          <select value={sort} onChange={e => setParam({ sort: e.target.value, page: 1 })}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
            <option value="number_asc">Collector # ↑</option>
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
            <option value="rarity_desc">Rarity: High→Low</option>
            <option value="rarity_asc">Rarity: Low→High</option>
            {hasCardType && <option value="type_asc">Type A→Z</option>}
            {availableAttrSorts.map(f => (
              <optgroup key={f.key} label={f.label}>
                <option value={`attr_${f.key}_asc`}>{f.label} ↑</option>
                <option value={`attr_${f.key}_desc`}>{f.label} ↓</option>
              </optgroup>
            ))}
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
                          onChange={() => setParam({ rarity: rarityFilter.includes(r) ? rarityFilter.filter(x => x !== r) : [...rarityFilter, r], page: 1 })}
                          className="accent-[#6A7EFC]" />
                        <span className="text-xs capitalize" style={{ color: RARITY_COLORS[normalizeRarity(r)] || '#8e8e9e' }}>{r}</span>
                      </label>
                    ))}
                    {rarityFilter.length > 0 && (
                      <button onClick={() => setParam({ rarity: [], page: 1 })}
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
          <select value={pageSize} onChange={e => setParam({ per: e.target.value, page: 1 })}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={0}>Show All</option>
          </select>
        </div>

        {/* Add Multiple To... */}
        {user && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Add Multiple To…</span>
            <select value={bulkTarget || 'collection'} onChange={e => selectBulkTarget(e.target.value)}
              className="text-sm px-3 py-1.5 rounded"
              style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
              <option value="collection">Collection</option>
              <option value="deck">Deck</option>
              <option value="wishlist">Wishlist</option>
            </select>
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
          {bulkCount > 0 && (
            <button onClick={() => { setBulkQtys({}); setBulkMsg('') }}
              className="ml-auto text-xs hover:opacity-80" style={{ color: '#8e8e9e' }}>
              Clear
            </button>
          )}
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
                  onClick={() => navigate(`/cards/${card.id}`)}
                  onMouseEnter={e => handleMouseEnter(e, card)}
                  onMouseLeave={e => handleMouseLeave(e)}>
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
                onClick={() => navigate(`/cards/${card.id}`)}
                className="rounded border px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer hover:border-[#6A7EFC]"
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
          <button onClick={() => setParam({ page: Math.max(1, page - 1) })} disabled={safePage === 1}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: safePage === 1 ? '#555562' : '#EDF2F6', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
            ‹ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc }, [])
            .map((p, i) => p === '…'
              ? <span key={`e-${i}`} className="text-sm px-1" style={{ color: '#555562' }}>…</span>
              : <button key={p} onClick={() => setParam({ page: p })} className="text-sm w-8 h-8 rounded"
                  style={{ backgroundColor: p === safePage ? '#6A7EFC' : '#35353f', border: '1px solid #42424e', color: p === safePage ? '#1f1f25' : '#EDF2F6', fontWeight: p === safePage ? '600' : '400' }}>
                  {p}
                </button>
            )}
          <button onClick={() => setParam({ page: Math.min(totalPages, page + 1) })} disabled={safePage === totalPages}
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
