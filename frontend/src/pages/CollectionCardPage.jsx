import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { rarityColor } from '../theme'
import { parseAttrs, isPrimitiveAttrVal, formatAttrKey } from '../utils/cardAttributes'
import DOMPurify from 'dompurify'

const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }
const CONDITION_COLORS = { NM: 'var(--cond-nm)', LP: 'var(--cond-lp)', MP: 'var(--cond-mp)', HP: 'var(--cond-hp)', DM: 'var(--cond-dm)' }
const FINISHES = ['normal', 'foil', 'special foil']

// ── Reusable surfaces (house style) ───────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl px-5 py-4 border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <p className="text-4xl lg:text-5xl font-bold leading-none" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</p>
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
      <div style={{ backgroundColor: 'var(--bg-chip)' }}>{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionCardPage() {
  const { gameSlug, cardId } = useParams()
  const { authFetch } = useAuth()

  const [card, setCard] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPrintingId, setSelectedPrintingId] = useState(null)

  useEffect(() => {
    async function load() {
      const [cardRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/api/cards/${cardId}`),
        authFetch(`${API_URL}/api/users/me/collection/card/${cardId}`),
      ])
      const cardData = await cardRes.json()
      const itemsData = await itemsRes.json()
      setCard(cardData)
      setItems(Array.isArray(itemsData) ? itemsData : [])
      setLoading(false)
    }
    load()
  }, [cardId, authFetch])

  const handleIncrease = useCallback(async (item) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({ printing_id: item.printing_id, quantity: 1, finish: item.finish }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, quantity: result.quantity } : i
    ))
  }, [authFetch])

  const handleDecrease = useCallback(async (item) => {
    if (item.quantity === 1) {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}?finish=${item.finish}`, { method: 'DELETE' })
      if (!res.ok) return
      setItems(prev => prev.filter(i => !(i.printing_id === item.printing_id && i.finish === item.finish)))
      return
    }
    const res = await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: item.quantity - 1, finish: item.finish }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, quantity: result.quantity } : i
    ))
  }, [authFetch])

  const handleConditionChange = useCallback(async (item, newCondition) => {
    const res = await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: item.quantity, finish: item.finish, condition: newCondition }),
    })
    if (!res.ok) return
    setItems(prev => prev.map(i =>
      i.printing_id === item.printing_id && i.finish === item.finish ? { ...i, condition: newCondition } : i
    ))
  }, [authFetch])

  const handleFinishChange = useCallback(async (item, newFinish) => {
    if (newFinish === item.finish) return
    // Move this row's copies to the new finish. The POST upsert is additive, so it
    // merges automatically if a row for newFinish already exists — don't pre-add.
    await authFetch(`${API_URL}/api/users/me/collection/${item.printing_id}?finish=${item.finish}`, { method: 'DELETE' })
    const res = await authFetch(`${API_URL}/api/users/me/collection`, {
      method: 'POST',
      body: JSON.stringify({
        printing_id: item.printing_id,
        quantity: item.quantity,
        finish: newFinish,
        condition: item.condition,
      }),
    })
    if (!res.ok) return
    const result = await res.json()
    setItems(prev => {
      const without = prev.filter(i => !(i.printing_id === item.printing_id && (i.finish === item.finish || i.finish === newFinish)))
      return [...without, { ...item, finish: newFinish, quantity: result.quantity }]
    })
  }, [authFetch])

  // Group owned rows (one per finish) into printings (one per set/printing).
  const printings = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      if (!map.has(it.printing_id)) {
        map.set(it.printing_id, {
          printing_id: it.printing_id,
          set_name: it.set_name,
          rarity: it.rarity,
          collector_number: it.collector_number,
          image_url: it.image_url,
          finishes: [],
        })
      }
      map.get(it.printing_id).finishes.push(it)
    }
    for (const p of map.values()) p.finishes.sort((a, b) => a.finish.localeCompare(b.finish))
    return [...map.values()]
  }, [items])

  // Primitive, non-empty card attributes — present for data-rich games (MTG, etc.),
  // empty for the many sparse/dead CCGs. Drives an optional "Card Details" panel.
  const attrEntries = useMemo(() => {
    if (!card) return []
    const attrs = parseAttrs(card)
    if (!attrs) return []
    return Object.entries(attrs)
      .filter(([, v]) => isPrimitiveAttrVal(v) && v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])
  }, [card])

  const selected = printings.find(p => p.printing_id === selectedPrintingId) ?? printings[0] ?? null
  const totalCopies = items.reduce((s, i) => s + i.quantity, 0)
  const foilCopies = items.filter(i => i.finish !== 'normal').reduce((s, i) => s + i.quantity, 0)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-muted)' }}>Card not found.</p>
    </div>
  )

  // Split attributes by value length so short stats line up in a grid while long
  // freeform values (notes, skill lists) get full-width rows. Pure numbers first.
  const isNumeric = v => /^-?\d+(\.\d+)?$/.test(v)
  const shortAttrs = attrEntries
    .filter(([, v]) => v.length <= 22)
    .sort((a, b) => (isNumeric(a[1]) ? 0 : 1) - (isNumeric(b[1]) ? 0 : 1) || a[0].localeCompare(b[0]))
  const longAttrs = attrEntries.filter(([, v]) => v.length > 22)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <Link to="/profile" style={{ color: 'var(--accent)' }}>My Collection</Link>
        <span>›</span>
        <Link to={`/collection/${gameSlug}`} style={{ color: 'var(--accent)' }}>{card.game}</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{card.name}</span>
      </nav>

      {items.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p>This card is no longer in your collection.</p>
          <Link to={`/collection/${gameSlug}`} className="text-sm mt-2 block" style={{ color: 'var(--accent)' }}>
            ← Back to collection
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left — hero image + actions */}
          <div className="lg:w-[360px] flex-shrink-0">
            <div className="lg:sticky lg:top-6 flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: selected?.finishes.some(f => f.finish === 'foil') ? '#facc1566' : 'var(--border)', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 30px var(--shadow)' }}>
                {selected?.image_url ? (
                  <img src={selected.image_url} alt={card.name} className="w-full block" />
                ) : (
                  <div className="aspect-[2.5/3.5] flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-chip)' }}>
                    <span className="text-sm text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{selected?.set_name || card.name}</span>
                  </div>
                )}
              </div>
              <Link
                to={`/cards/${card.id}`}
                className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)', textDecoration: 'none' }}
              >
                View full card details →
              </Link>
            </div>
          </div>

          {/* Right — info column */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Header */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>{card.game}</p>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{card.name}</h1>
              {card.card_type && <p className="text-base lg:text-lg mt-1.5" style={{ color: 'var(--text-muted)' }}>{card.card_type}</p>}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Total copies" value={totalCopies} />
              <StatCard label={printings.length === 1 ? 'Printing owned' : 'Printings owned'} value={printings.length} />
              <StatCard label="Foil copies" value={foilCopies} accent={foilCopies > 0} />
            </div>

            {/* Owned copies */}
            <Panel title="Your Copies">
              {printings.map(p => {
                const isSelected = selected?.printing_id === p.printing_id
                const multi = printings.length > 1
                return (
                  <div
                    key={p.printing_id}
                    onClick={() => multi && setSelectedPrintingId(p.printing_id)}
                    className={multi ? 'cursor-pointer' : ''}
                    style={{ borderTop: '1px solid var(--border)', borderLeft: `3px solid ${multi && isSelected ? 'var(--accent)' : 'transparent'}` }}
                  >
                    {/* Printing header */}
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.set_name}</span>
                      {p.rarity && <span className="text-xs capitalize" style={{ color: rarityColor(p.rarity, gameSlug) }}>{p.rarity}</span>}
                      {p.collector_number && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{p.collector_number}</span>}
                    </div>

                    {/* Finish rows */}
                    {p.finishes.map(item => {
                      const condColor = CONDITION_COLORS[item.condition] || CONDITION_COLORS.NM
                      return (
                        <div key={item.finish} className="flex items-center gap-3 px-4 py-2.5 flex-wrap" onClick={e => e.stopPropagation()}>
                          <span
                            className={`text-xs font-semibold capitalize w-20 shrink-0${item.finish === 'foil' ? ' foil-rainbow' : ''}`}
                            style={item.finish === 'foil' ? {} : { color: 'var(--text-muted)' }}
                          >
                            {item.finish}
                          </span>

                          <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                            {/* Quantity */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDecrease(item)}
                                className="w-8 h-8 rounded text-sm font-bold flex items-center justify-center"
                                style={{ backgroundColor: 'var(--bg-surface)', color: '#e05c5c', border: '1px solid var(--border)' }}
                              >−</button>
                              <span className="text-sm font-bold w-6 text-center" style={{ color: 'var(--text-primary)' }}>{item.quantity}</span>
                              <button
                                onClick={() => handleIncrease(item)}
                                className="w-8 h-8 rounded text-sm font-bold flex items-center justify-center"
                                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                              >+</button>
                            </div>

                            {/* Finish */}
                            <select
                              value={item.finish || 'normal'}
                              onChange={e => handleFinishChange(item, e.target.value)}
                              className="text-xs px-2 py-1.5 rounded capitalize"
                              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                            >
                              {FINISHES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>

                            {/* Condition */}
                            <select
                              value={item.condition || 'NM'}
                              onChange={e => handleConditionChange(item, e.target.value)}
                              className="text-xs px-2 py-1.5 rounded font-medium"
                              style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid color-mix(in srgb, ${condColor} 34%, transparent)`, color: condColor, outline: 'none' }}
                            >
                              {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{val} — {label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </Panel>

            {/* Card Details — progressive enhancement; only shown when the game
                actually has data for this card (rich games yes, dead CCGs no). */}
            {(attrEntries.length > 0 || card.rules_text) && (
              <Panel title="Card Details">
                <div className="p-5 flex flex-col gap-5">
                  {/* Short stats — uniform aligned grid */}
                  {shortAttrs.length > 0 && (
                    <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                      {shortAttrs.map(([k, v]) => (
                        <div key={k} className="flex flex-col gap-1">
                          <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{formatAttrKey(k)}</dt>
                          <dd className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {/* Long values — full-width spec rows with aligned labels */}
                  {longAttrs.length > 0 && (
                    <dl className="flex flex-col" style={shortAttrs.length > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '0.25rem' } : undefined}>
                      {longAttrs.map(([k, v]) => (
                        <div key={k} className="flex gap-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                          <dt className="w-28 shrink-0 text-xs uppercase tracking-wider pt-0.5" style={{ color: 'var(--text-muted)' }}>{formatAttrKey(k)}</dt>
                          <dd className="flex-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {/* Card text */}
                  {card.rules_text && (
                    <div style={attrEntries.length > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '1.25rem' } : undefined}>
                      <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Card Text</p>
                      <div className="text-sm leading-relaxed card-rules-html" style={{ color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.rules_text) }} />
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
