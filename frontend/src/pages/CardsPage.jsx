import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { rarityColor, rarityRank } from '../theme'

const isTouchDevice = window.matchMedia('(hover: none)').matches

// ── Attribute helpers ──────────────────────────────────────────────────────
function parseAttrs(card) {
  if (!card.attributes) return null
  try { return typeof card.attributes === 'string' ? JSON.parse(card.attributes) : card.attributes }
  catch { return null }
}
function getAttrVal(card, key) {
  const attrs = parseAttrs(card)
  return attrs ? (attrs[key] ?? null) : null
}
function attrValToSortable(val) {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) return val.map(String).sort().join(', ')
  return String(val)
}
function compareAttrVals(av, bv) {
  if (av === null && bv === null) return 0
  if (av === null) return 1
  if (bv === null) return -1
  const an = parseFloat(av), bn = parseFloat(bv)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  return av.localeCompare(bv)
}
function formatAttrKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function isPrimitiveAttrVal(val) {
  if (val === null || val === undefined) return true
  if (Array.isArray(val)) return val.length === 0 || typeof val[0] !== 'object'
  return typeof val !== 'object'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [attrKeys, setAttrKeys] = useState([])
  const [attrFilters, setAttrFilters] = useState({})
  const [expandedAttrKeys, setExpandedAttrKeys] = useState(new Set())
  const filtersRef = useRef(null)

  // Cross-set search dropdown
  const [searchDropResults, setSearchDropResults] = useState([])
  const [searchDropLoading, setSearchDropLoading] = useState(false)
  const [searchAddedIds, setSearchAddedIds] = useState({})
  const [searchAddingIds, setSearchAddingIds] = useState({})
  const searchDropRef = useRef(null)
  const searchDebounceRef = useRef(null)

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
    if (!filtersOpen) return
    const h = e => { if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [filtersOpen])

  useEffect(() => {
    if (!bulkOpen) return
    const h = e => { if (bulkRef.current && !bulkRef.current.contains(e.target)) setBulkOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [bulkOpen])

  // Cross-set search: debounce API call when user types in the search box
  useEffect(() => {
    clearTimeout(searchDebounceRef.current)
    const q = search.trim()
    if (q.length < 2 || !setInfo?.game_slug) { setSearchDropResults([]); return }
    setSearchDropLoading(true)
    searchDebounceRef.current = setTimeout(() => {
      fetch(`${API_URL}/api/cards/search?name=${encodeURIComponent(q)}&game=${setInfo.game_slug}`)
        .then(r => r.json())
        .then(data => { setSearchDropResults(Array.isArray(data) ? data : []); setSearchDropLoading(false) })
        .catch(() => setSearchDropLoading(false))
    }, 300)
    return () => clearTimeout(searchDebounceRef.current)
  }, [search, setInfo?.game_slug])

  // Close cross-set dropdown on outside click
  useEffect(() => {
    if (!searchDropResults.length) return
    const h = e => { if (searchDropRef.current && !searchDropRef.current.contains(e.target)) setSearchDropResults([]) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [searchDropResults.length])

  const handleSearchAdd = useCallback(async (card) => {
    if (!user || !card.printing_id) return
    setSearchAddingIds(prev => ({ ...prev, [card.printing_id]: true }))
    try {
      await authFetch(`${API_URL}/api/users/me/collection`, {
        method: 'POST',
        body: JSON.stringify({ printing_id: card.printing_id, quantity: 1, finish: 'normal', condition: 'NM' }),
      })
      setSearchAddedIds(prev => ({ ...prev, [card.printing_id]: true }))
      // Refresh owned for current set
      const data = await authFetch(`${API_URL}/api/users/me/collection/set/${setId}`).then(r => r.json())
      setOwned(data || {})
      setTimeout(() => setSearchAddedIds(prev => { const n = { ...prev }; delete n[card.printing_id]; return n }), 2000)
    } finally {
      setSearchAddingIds(prev => { const n = { ...prev }; delete n[card.printing_id]; return n })
    }
  }, [user, authFetch, setId])

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

  useEffect(() => {
    if (!setInfo?.game_slug) return
    fetch(`${API_URL}/api/games/${setInfo.game_slug}/attribute-keys`)
      .then(r => r.ok ? r.json() : [])
      .then(keys => setAttrKeys(Array.isArray(keys) ? keys : []))
      .catch(() => {})
  }, [setInfo?.game_slug])

  // ── Sorting / filtering / paging ──────────────────────────────────────────
  const allRarities = useMemo(() => {
    const seen = new Set()
    for (const c of cards) if (c.rarity) seen.add(c.rarity)
    return [...seen].sort((a, b) => rarityRank(a, setInfo?.game_slug) - rarityRank(b, setInfo?.game_slug))
  }, [cards])

  const hasCardType = useMemo(() => cards.some(c => c.card_type), [cards])

  const attrSortableKeys = useMemo(() => {
    if (!cards.length || attrKeys.length === 0) return []
    return attrKeys.filter(key => {
      for (const card of cards) {
        const val = getAttrVal(card, key)
        if (val === null || val === undefined) continue
        return isPrimitiveAttrVal(val)
      }
      return false
    })
  }, [cards, attrKeys])

  const attrDistinctValues = useMemo(() => {
    if (!cards.length || attrSortableKeys.length === 0) return {}
    const result = {}
    for (const key of attrSortableKeys) {
      const vals = new Set()
      for (const card of cards) {
        const val = getAttrVal(card, key)
        if (val === null || val === undefined) continue
        if (Array.isArray(val)) val.forEach(v => vals.add(String(v)))
        else vals.add(String(val))
      }
      if (vals.size > 0 && vals.size <= 30) {
        result[key] = [...vals].sort((a, b) => {
          const an = parseFloat(a), bn = parseFloat(b)
          if (!isNaN(an) && !isNaN(bn)) return an - bn
          return a.localeCompare(b)
        })
      }
    }
    return result
  }, [cards, attrSortableKeys])

  function toggleAttrFilter(key, val) {
    setAttrFilters(prev => {
      const existing = prev[key] ?? []
      const next = existing.includes(val) ? existing.filter(v => v !== val) : [...existing, val]
      return { ...prev, [key]: next }
    })
    setParam({ page: 1 })
  }

  function toggleAttrKeyExpanded(key) {
    setExpandedAttrKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const sortedCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    let filtered = cards
    if (q) filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    if (rarityFilter.length > 0) filtered = filtered.filter(c => rarityFilter.includes(c.rarity))

    const activeAttrFilters = Object.entries(attrFilters).filter(([, vals]) => vals.length > 0)
    if (activeAttrFilters.length > 0) {
      filtered = filtered.filter(c => activeAttrFilters.every(([key, vals]) => {
        const val = getAttrVal(c, key)
        if (val === null || val === undefined) return false
        if (Array.isArray(val)) return vals.some(v => val.map(String).includes(v))
        return vals.includes(String(val))
      }))
    }

    return [...filtered].sort((a, b) => {
      if (sort === 'name_asc')    return a.name.localeCompare(b.name)
      if (sort === 'name_desc')   return b.name.localeCompare(a.name)
      if (sort === 'rarity_desc') return rarityRank(a.rarity, setInfo?.game_slug) - rarityRank(b.rarity, setInfo?.game_slug) || a.name.localeCompare(b.name)
      if (sort === 'rarity_asc')  return rarityRank(b.rarity, setInfo?.game_slug) - rarityRank(a.rarity, setInfo?.game_slug) || a.name.localeCompare(b.name)
      if (sort === 'type_asc')    return (a.card_type || '').localeCompare(b.card_type || '') || a.name.localeCompare(b.name)
      if (sort === 'type_desc')   return (b.card_type || '').localeCompare(a.card_type || '') || a.name.localeCompare(b.name)
      const attrMatch = sort.match(/^attr_(.+)_(asc|desc)$/)
      if (attrMatch) {
        const [, key, dir] = attrMatch
        const av = attrValToSortable(getAttrVal(a, key))
        const bv = attrValToSortable(getAttrVal(b, key))
        const cmp = compareAttrVals(av, bv)
        return dir === 'asc' ? cmp : -cmp
      }
      const na = parseInt(a.collector_number) || 0
      const nb = parseInt(b.collector_number) || 0
      return na !== nb ? na - nb : a.name.localeCompare(b.name)
    })
  }, [cards, sort, rarityFilter, attrFilters])

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
    setBulkTarget(bulkTarget === target ? null : target)
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
    e.currentTarget.style.borderColor = '#6b2d8f'
    e.currentTarget.style.boxShadow = '0 0 14px rgba(107, 45, 143, 0.28)'
    e.currentTarget.style.transform = 'scale(1.05)'
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2 - 180,
      y: rect.top + rect.height / 2 - 252,
    })
    setHoveredCard(card)
  }
  const handleMouseLeave = e => {
    e.currentTarget.style.borderColor = 'var(--border)'
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.transform = 'scale(1)'
    setHoveredCard(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading cards...</p>
    </div>
  )

  const isBulkActive = bulkTarget !== null
  const bulkCount = Object.keys(bulkQtys).length

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm mb-6 flex items-center gap-1 hover:opacity-80"
        style={{ color: 'var(--accent)' }}>
        ← Back to Sets
      </button>

      {/* ── Set header ──────────────────────────────────────────────────── */}
      {setInfo && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div>
              <p className="text-sm font-medium mb-1 cursor-pointer hover:opacity-80"
                style={{ color: 'var(--accent)' }} onClick={() => navigate(`/games/${setInfo.game_slug}`)}>
                {setInfo.game_name}
              </p>
              <h2 className="text-3xl font-bold mb-1 break-words" style={{ color: 'var(--text-primary)' }}>{setInfo.name}</h2>
            </div>
            {/* View toggle */}
            <div className="flex rounded overflow-hidden border self-start shrink-0 sm:mt-1" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setParam({ view: null, per: null, page: 1 })}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === 'card' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'card' ? '#fff' : 'var(--text-muted)' }}>
                Image View
              </button>
              <button onClick={() => setParam({ view: 'list', per: 0, page: 1 })}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{ backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>
                Grid View
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p style={{ color: 'var(--text-muted)' }}>
              {cards.length} cards
              {setInfo.release_date && (
                <span> · {new Date(setInfo.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </p>
            {user && (
              <button onClick={handleAddSet} disabled={addingSet}
                className="text-sm px-3 py-1 rounded hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent)', color: 'var(--accent)', opacity: addingSet ? 0.6 : 1 }}>
                {addingSet ? 'Adding…' : '+ Add Set to Collection'}
              </button>
            )}
            {user && (
              <div className="relative" ref={bulkRef}>
                <button onClick={() => setBulkOpen(o => !o)}
                  className="text-sm px-3 py-1 rounded flex items-center gap-1.5 hover:opacity-80"
                  style={{ backgroundColor: isBulkActive ? '#dff0f4' : 'var(--bg-surface)', border: `1px solid ${isBulkActive ? 'var(--accent)' : 'var(--border)'}`, color: isBulkActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  Add Multiple To… ▾
                </button>
                {bulkOpen && (
                  <div className="absolute z-20 mt-1 rounded-lg shadow-xl min-w-[160px] right-0 sm:right-auto sm:left-0"
                    style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
                    {[['collection','Collection'],['deck','Deck'],['wishlist','Wishlist']].map(([key, label]) => (
                      <button key={key} onClick={() => selectBulkTarget(key)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 flex items-center justify-between"
                        style={{ color: bulkTarget === key ? 'var(--accent)' : 'var(--text-primary)', borderBottom: '1px solid var(--border-panel)' }}>
                        {label}
                        {bulkTarget === key && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                    {isBulkActive && (
                      <button onClick={() => { setBulkOpen(false); setBulkTarget(null); setBulkQtys({}); setBulkMsg('') }}
                        className="w-full text-left px-4 py-2 text-xs hover:opacity-80"
                        style={{ color: 'var(--text-muted)' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {user && anyOwned && (
              <button onClick={() => navigate('/profile?tab=stats')}
                className="text-sm px-3 py-1 rounded hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                My Collection Stats
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {(() => {
        const activeAttrFilterCount = Object.values(attrFilters).filter(v => v.length > 0).length
        const activeCount = (sort !== 'name_asc' ? 1 : 0) + rarityFilter.length + (pageSize !== 25 ? 1 : 0) + activeAttrFilterCount

        return (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {/* Search — filters grid + shows cross-set dropdown */}
            <div className="relative flex-1 min-w-0" ref={searchDropRef}>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search cards…"
                  value={search}
                  onChange={e => setParam({ q: e.target.value, page: 1 })}
                  className="text-sm pl-7 pr-8 py-1.5 rounded w-full"
                  style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${search ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text-primary)', outline: 'none' }}
                />
                {search && (
                  <button onClick={() => { setParam({ q: '', page: 1 }); setSearchDropResults([]) }}
                    className="absolute right-2 text-sm hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}>×</button>
                )}
              </div>

              {/* Cross-set results dropdown */}
              {(searchDropLoading || searchDropResults.length > 0) && search.trim().length >= 2 && (
                <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl shadow-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', maxHeight: '480px', overflowY: 'auto' }}>
                  {searchDropLoading && (
                    <p className="text-sm px-4 py-3" style={{ color: 'var(--text-muted)' }}>Searching…</p>
                  )}
                  {!searchDropLoading && searchDropResults.length === 0 && (
                    <p className="text-sm px-4 py-3" style={{ color: 'var(--text-muted)' }}>No cards found</p>
                  )}
                  {!searchDropLoading && (() => {
                    const groups = []
                    const seen = {}
                    for (const p of searchDropResults) {
                      if (!seen[p.id]) { seen[p.id] = groups.length; groups.push({ ...p, printings: [] }) }
                      groups[seen[p.id]].printings.push({ printing_id: p.printing_id, set_name: p.set_name })
                    }
                    return groups.map(card => (
                      <div key={card.id} className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                        <div className="flex items-center gap-3 px-3 pt-2.5 pb-1.5">
                          <div className="shrink-0 cursor-pointer" onClick={() => navigate(`/cards/${card.id}`)}>
                            {card.image_url
                              ? <img src={card.image_url} alt={card.name} className="rounded" style={{ width: 36, height: 50, objectFit: 'cover' }} />
                              : <div className="rounded flex items-center justify-center" style={{ width: 36, height: 50, backgroundColor: 'var(--bg-surface)' }}>
                                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{card.name.slice(0,6)}</span>
                                </div>
                            }
                          </div>
                          <p className="flex-1 text-sm font-semibold truncate cursor-pointer"
                            style={{ color: 'var(--text-primary)' }}
                            onClick={() => navigate(`/cards/${card.id}`)}>
                            {card.name}
                          </p>
                        </div>
                        <div className="flex flex-col pb-1.5 pl-14 pr-3 gap-1">
                          {card.printings.map(p => (
                            <div key={p.printing_id} className="flex items-center justify-between gap-2">
                              <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.set_name}</span>
                              {user && p.printing_id > 0 && (
                                <button
                                  onClick={() => handleSearchAdd({ ...card, printing_id: p.printing_id })}
                                  disabled={!!searchAddingIds[p.printing_id]}
                                  className="shrink-0 text-xs px-2 py-0.5 rounded font-medium"
                                  style={{
                                    backgroundColor: searchAddedIds[p.printing_id] ? '#a5d6a7' : 'var(--accent)',
                                    color: '#fff',
                                    opacity: searchAddingIds[p.printing_id] ? 0.6 : 1,
                                    minWidth: 56,
                                  }}>
                                  {searchAddedIds[p.printing_id] ? '✓ Added' : searchAddingIds[p.printing_id] ? '…' : '+ Add'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Unified Filters button */}
            <div className="relative" ref={filtersRef}>
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="text-sm px-3 py-1.5 rounded flex items-center gap-1.5 shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${activeCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  color: activeCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                Filters{activeCount > 0 ? ` (${activeCount})` : ''} ▾
              </button>

              {filtersOpen && (
                <div
                  className="absolute right-0 z-20 mt-1 rounded-xl shadow-xl p-4 flex flex-col gap-3 overflow-y-auto"
                  style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', minWidth: '240px', maxHeight: '80vh' }}
                >
                  {/* Sort */}
                  <div>
                    <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Sort</p>
                    <select value={sort} onChange={e => setParam({ sort: e.target.value, page: 1 })}
                      className="w-full text-sm px-2 py-1.5 rounded"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <optgroup label="Standard">
                        <option value="number_asc">Collector # ↑</option>
                        <option value="name_asc">Name A→Z</option>
                        <option value="name_desc">Name Z→A</option>
                        <option value="rarity_desc">Rarity: High→Low</option>
                        <option value="rarity_asc">Rarity: Low→High</option>
                        {hasCardType && <option value="type_asc">Type A→Z</option>}
                      </optgroup>
                      {attrSortableKeys.length > 0 && (
                        <optgroup label="Card Attributes">
                          {attrSortableKeys.map(k => [
                            <option key={`attr_${k}_asc`} value={`attr_${k}_asc`}>{formatAttrKey(k)} ↑</option>,
                            <option key={`attr_${k}_desc`} value={`attr_${k}_desc`}>{formatAttrKey(k)} ↓</option>,
                          ])}
                        </optgroup>
                      )}
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
                            <input type="checkbox" checked={rarityFilter.includes(r)}
                              onChange={() => setParam({ rarity: rarityFilter.includes(r) ? rarityFilter.filter(x => x !== r) : [...rarityFilter, r], page: 1 })}
                              className="accent-[#0097a7]" />
                            <span className="text-xs capitalize" style={{ color: rarityColor(r, setInfo?.game_slug) }}>{r}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic attribute filters */}
                  {Object.entries(attrDistinctValues).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Attributes</p>
                      <div className="flex flex-col gap-0.5">
                        {Object.entries(attrDistinctValues).map(([key, vals]) => {
                          const activeVals = attrFilters[key] ?? []
                          const expanded = expandedAttrKeys.has(key)
                          return (
                            <div key={key} className="rounded" style={{ backgroundColor: expanded ? 'var(--bg-surface)' : 'transparent', border: expanded ? '1px solid var(--border)' : '1px solid transparent' }}>
                              <button
                                onClick={() => toggleAttrKeyExpanded(key)}
                                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded"
                                style={{ color: activeVals.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                              >
                                <span className="font-medium">
                                  {formatAttrKey(key)}{activeVals.length > 0 ? ` (${activeVals.length})` : ''}
                                </span>
                                <span style={{ fontSize: '0.6rem' }}>{expanded ? '▼' : '▶'}</span>
                              </button>
                              {expanded && (
                                <div className="flex flex-col gap-0.5 pb-1.5 px-1">
                                  {vals.map(val => {
                                    const active = activeVals.includes(val)
                                    return (
                                      <label key={val} className="flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer text-xs"
                                        style={{ backgroundColor: active ? 'var(--bg-chip)' : 'transparent', color: 'var(--text-primary)' }}>
                                        <input type="checkbox" className="accent-[#0097a7]" checked={active}
                                          onChange={() => toggleAttrFilter(key, val)} />
                                        {val}
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Page size */}
                  <div className="flex items-center justify-between gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cards per page</span>
                    <select value={pageSize} onChange={e => setParam({ per: e.target.value, page: 1 })}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={0}>All</option>
                    </select>
                  </div>

                  {/* Reset */}
                  {activeCount > 0 && (
                    <button
                      onClick={() => { setParam({ sort: null, rarity: [], per: null, page: 1 }); setAttrFilters({}) }}
                      className="text-xs py-1 rounded text-left"
                      style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {sortedCards.length} cards{totalPages > 1 && ` · page ${safePage} of ${totalPages}`}
            </span>
          </div>
        )
      })()}

      {/* ── Bulk mode bar ────────────────────────────────────────────────── */}
      {isBulkActive && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg flex-wrap"
          style={{ backgroundColor: '#dff0f4', border: '1px solid #0097a733' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Adding to {bulkTarget === 'collection' ? 'Collection' : bulkTarget === 'deck' ? 'Deck' : 'Wishlist'}
          </span>
          {bulkTarget === 'deck' && bulkDecks !== null && (
            <select value={bulkDeckId || ''} onChange={e => setBulkDeckId(Number(e.target.value))}
              className="text-sm px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {bulkDecks.length === 0
                ? <option disabled>No decks for this game</option>
                : bulkDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
              }
            </select>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {bulkCount > 0 ? `${bulkCount} card${bulkCount > 1 ? 's' : ''} selected` : 'Click + on cards below'}
          </span>
          {bulkCount > 0 && (
            <button onClick={handleBulkSave} disabled={bulkSaving}
              className="text-sm px-4 py-1.5 rounded font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              {bulkSaving ? 'Saving…' : `Save ${bulkCount} Card${bulkCount > 1 ? 's' : ''}`}
            </button>
          )}
          {bulkMsg && <span className="text-sm" style={{ color: '#a5d6a7' }}>{bulkMsg}</span>}
          <button onClick={() => { setBulkTarget(null); setBulkQtys({}); setBulkMsg('') }}
            className="ml-auto text-xs hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
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
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: bulkQty > 0 ? 'var(--accent)' : 'var(--border)' }}>
                {isOwned && (
                  <div className="absolute top-1.5 right-1.5 z-10 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-page)' }}>×{quantity}</div>
                )}
                <div className="cursor-pointer transition-all duration-200"
                  onClick={() => !isBulkActive && navigate(`/cards/${card.id}?printing=${card.printing_id}`)}
                  onMouseEnter={e => !isBulkActive && handleMouseEnter(e, card)}
                  onMouseLeave={e => !isBulkActive && handleMouseLeave(e)}>
                  {card.image_url
                    ? <img src={card.image_url} alt={card.name} className="w-full" />
                    : <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                        style={{ backgroundColor: 'var(--bg-chip)' }}>
                        <span className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>{card.name}</span>
                      </div>
                  }
                </div>
                <div className="p-2 flex items-end justify-between gap-1">
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
                  <p className="text-xs capitalize shrink-0" style={{ color: rarityColor(card.rarity, setInfo?.game_slug) }}>{card.rarity}</p>
                </div>
                {isBulkActive && (
                  <div className="px-2 pb-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => adjustQty(card.printing_id, -1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>−</button>
                    <input type="number" min={0} value={bulkQty || ''} placeholder="0"
                      onChange={e => setQty(card.printing_id, e.target.value)}
                      className="w-full text-center text-sm rounded px-1 py-0.5"
                      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <button onClick={() => adjustQty(card.printing_id, 1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--accent)' }}>+</button>
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
            const cardRarityColor = rarityColor(card.rarity, setInfo?.game_slug)
            return (
              <div key={card.id}
                onClick={() => !isBulkActive && navigate(`/cards/${card.id}?printing=${card.printing_id}`)}
                className={`rounded border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${!isBulkActive ? 'cursor-pointer hover:border-[#0097a7]' : ''}`}
                style={{ backgroundColor: bulkQty > 0 ? '#dff0f4' : 'var(--bg-chip)', borderColor: bulkQty > 0 ? 'var(--accent)' : 'var(--border)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{card.name}</span>
                  {isOwned && (
                    <span className="text-xs font-bold px-1 rounded shrink-0"
                      style={{ backgroundColor: '#0097a722', color: 'var(--accent)' }}>×{quantity}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs capitalize" style={{ color: cardRarityColor }}>{card.rarity}</span>
                  {isBulkActive && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => adjustQty(card.printing_id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>−</button>
                      <input type="number" min={0} value={bulkQty || ''} placeholder="0"
                        onChange={e => setQty(card.printing_id, e.target.value)}
                        className="w-10 text-center text-xs rounded px-1 py-0.5"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      <button onClick={() => adjustQty(card.printing_id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>+</button>
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
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: safePage === 1 ? '#9e836a' : 'var(--text-primary)', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
            ‹ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc }, [])
            .map((p, i) => p === '…'
              ? <span key={`e-${i}`} className="text-sm px-1" style={{ color: '#9e836a' }}>…</span>
              : <button key={p} onClick={() => setParam({ page: p })} className="text-sm w-8 h-8 rounded"
                  style={{ backgroundColor: p === safePage ? 'var(--accent)' : 'var(--bg-surface)', border: '1px solid var(--border)', color: p === safePage ? 'var(--text-panel)' : 'var(--text-primary)', fontWeight: p === safePage ? '600' : '400' }}>
                  {p}
                </button>
            )}
          <button onClick={() => setParam({ page: Math.min(totalPages, page + 1) })} disabled={safePage === totalPages}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: safePage === totalPages ? '#9e836a' : 'var(--text-primary)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
            Next ›
          </button>
        </div>
      )}

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {hoveredCard && hoveredCard.image_url && (
        <div className="fixed pointer-events-none z-50 rounded-xl overflow-hidden"
          style={{ left: Math.max(8, Math.min(tooltipPos.x, window.innerWidth - 368)), top: Math.max(8, Math.min(tooltipPos.y, window.innerHeight - 508)), width: 360, boxShadow: '0 8px 48px rgba(28,16,8,0.22)' }}>
          <img src={hoveredCard.image_url} alt={hoveredCard.name} className="w-full" />
        </div>
      )}
    </div>
  )
}
