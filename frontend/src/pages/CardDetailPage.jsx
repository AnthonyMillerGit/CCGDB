import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import MTGCardInfo           from '../components/card-templates/MTGCardInfo'
import PokemonCardInfo       from '../components/card-templates/PokemonCardInfo'
import MECCGCardInfo         from '../components/card-templates/MECCGCardInfo'
import YuGiOhCardInfo        from '../components/card-templates/YuGiOhCardInfo'
import WeissSchwarzCardInfo  from '../components/card-templates/WeissSchwarzCardInfo'
import SeventhSeaCardInfo    from '../components/card-templates/SeventhSeaCardInfo'
import VTESCardInfo          from '../components/card-templates/VTESCardInfo'
import WoWTCGCardInfo        from '../components/card-templates/WoWTCGCardInfo'
import NarutoMythosCardInfo  from '../components/card-templates/NarutoMythosCardInfo'
import SorceryCardInfo       from '../components/card-templates/SorceryCardInfo'
import SWUCardInfo           from '../components/card-templates/SWUCardInfo'
import SWCCGCardInfo         from '../components/card-templates/SWCCGCardInfo'
import StarTrek1ECardInfo    from '../components/card-templates/StarTrek1ECardInfo'
import StarTrek2ECardInfo    from '../components/card-templates/StarTrek2ECardInfo'
import LorcanaCardInfo       from '../components/card-templates/LorcanaCardInfo'
import DigimonCardInfo       from '../components/card-templates/DigimonCardInfo'
import OnePieceCardInfo      from '../components/card-templates/OnePieceCardInfo'
import FFTCGCardInfo         from '../components/card-templates/FFTCGCardInfo'
import FaBCardInfo           from '../components/card-templates/FaBCardInfo'
import DBSFusionCardInfo     from '../components/card-templates/DBSFusionCardInfo'
import GrandArchiveCardInfo  from '../components/card-templates/GrandArchiveCardInfo'
import MetaZooCardInfo       from '../components/card-templates/MetaZooCardInfo'
import RiftboundCardInfo     from '../components/card-templates/RiftboundCardInfo'
import GundamCardInfo        from '../components/card-templates/GundamCardInfo'
import UnionArenaCardInfo    from '../components/card-templates/UnionArenaCardInfo'
import GenericCardInfo       from '../components/card-templates/GenericCardInfo'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity } from '../theme'

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DM']
const FINISHES   = ['normal', 'foil', 'other']

// ── Collection modal ──────────────────────────────────────────────────────────

function CollectionModal({ printing, cardCollectionItems, onClose, onSave }) {
  const existingForPrinting = cardCollectionItems.filter(i => i.printing_id === printing.id)

  const [entries, setEntries] = useState(() =>
    existingForPrinting.map(i => ({ ...i, _orig: i, _deleted: false }))
  )
  const [newFinish, setNewFinish]     = useState('normal')
  const [newQty, setNewQty]           = useState(1)
  const [newCondition, setNewCondition] = useState('NM')
  const [saving, setSaving]           = useState(false)

  const usedFinishes = entries.filter(e => !e._deleted).map(e => e.finish)
  const availableFinishes = FINISHES.filter(f => !usedFinishes.includes(f))

  useEffect(() => {
    if (!availableFinishes.includes(newFinish)) {
      setNewFinish(availableFinishes[0] ?? 'other')
    }
  }, [entries])

  function setEntryField(finish, field, value) {
    setEntries(prev => prev.map(e => e.finish === finish ? { ...e, [field]: value } : e))
  }

  function markDeleted(finish) {
    setEntries(prev => prev.map(e => e.finish === finish ? { ...e, _deleted: true } : e))
  }

  async function handleSave() {
    setSaving(true)
    const ops = []

    for (const entry of entries) {
      const orig = entry._orig
      if (entry._deleted) {
        ops.push(onSave.remove(printing.id, orig.finish))
      } else {
        const qtyChanged  = entry.quantity !== orig.quantity
        const condChanged = entry.condition !== orig.condition
        if (qtyChanged || condChanged) {
          ops.push(onSave.update(printing.id, entry.quantity, entry.finish, entry.condition))
        }
      }
    }

    await Promise.all(ops)
    setSaving(false)
    onClose()
  }

  async function handleAdd() {
    if (!newFinish || newQty < 1) return
    setSaving(true)
    await onSave.add(printing.id, newQty, newFinish, newCondition)
    setSaving(false)
    onClose()
  }

  const activeEntries = entries.filter(e => !e._deleted)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Edit Collection</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{printing.set_name}</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-70" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Existing entries */}
        {activeEntries.length > 0 && (
          <div className="flex flex-col gap-3 mb-5">
            {activeEntries.map(entry => (
              <div key={entry.finish} className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold w-14 shrink-0${entry.finish === 'foil' ? ' foil-rainbow' : ''}`}
                  style={entry.finish === 'foil' ? {} : { color: 'var(--text-muted)' }}
                >
                  {entry.finish}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={entry.quantity}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v) && v >= 1) setEntryField(entry.finish, 'quantity', v)
                  }}
                  className="w-16 px-2 py-1 rounded text-sm text-center outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <select
                  value={entry.condition}
                  onChange={e => setEntryField(entry.finish, 'condition', e.target.value)}
                  className="flex-1 px-2 py-1 rounded text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={() => markDeleted(entry.finish)}
                  className="shrink-0 text-sm hover:opacity-70"
                  style={{ color: 'var(--accent-maroon)' }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Divider + Add form */}
        {availableFinishes.length > 0 && (
          <>
            {activeEntries.length > 0 && (
              <div className="border-t mb-4" style={{ borderColor: 'var(--border)' }} />
            )}
            <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
              {activeEntries.length === 0 ? 'Add to Collection' : 'Add Another'}
            </p>
            <div className="flex items-center gap-2 mb-5">
              <select
                value={newFinish}
                onChange={e => setNewFinish(e.target.value)}
                className="px-2 py-1 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: '90px' }}
              >
                {availableFinishes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={newQty}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 1) setNewQty(v)
                }}
                className="w-16 px-2 py-1 rounded text-sm text-center outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <select
                value={newCondition}
                onChange={e => setNewCondition(e.target.value)}
                className="flex-1 px-2 py-1 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          {availableFinishes.length > 0 && (
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {saving ? '…' : activeEntries.length === 0 ? 'Add' : 'Add Entry'}
            </button>
          )}
          {activeEntries.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Deck button ───────────────────────────────────────────────────────────────

function AddToDeckButton({ card, authFetch, fullWidth }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [gameDecks, setGameDecks] = useState(null)
  const [deckSuccess, setDeckSuccess] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [showNewDeckInput, setShowNewDeckInput] = useState(false)
  const [creating, setCreating] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setShowNewDeckInput(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function openMenu() {
    setMenuOpen(true)
    setDeckSuccess('')
    if (gameDecks === null) {
      const res = await authFetch(`${API_URL}/api/users/me/decks`)
      const data = await res.json()
      setGameDecks(Array.isArray(data) ? data.filter(d => d.game_id === card.game_id) : [])
    }
  }

  async function handleAddToDeck(deckId, deckName) {
    await authFetch(`${API_URL}/api/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ card_id: card.id, quantity: 1 }),
    })
    setDeckSuccess(deckName)
    setGameDecks(prev => prev.map(d => d.id === deckId ? { ...d, total_cards: (d.total_cards || 0) + 1 } : d))
    setTimeout(() => { setMenuOpen(false); setDeckSuccess('') }, 1500)
  }

  async function handleCreateDeck() {
    if (!newDeckName.trim()) return
    setCreating(true)
    const res = await authFetch(`${API_URL}/api/users/me/decks`, {
      method: 'POST',
      body: JSON.stringify({ game_id: card.game_id, name: newDeckName.trim() }),
    })
    const deck = await res.json()
    await handleAddToDeck(deck.id, deck.name)
    setGameDecks(prev => [...(prev || []), { ...deck, total_cards: 1 }])
    setNewDeckName('')
    setShowNewDeckInput(false)
    setCreating(false)
  }

  return (
    <div className={`relative${fullWidth ? ' w-full' : ''}`} ref={menuRef}>
      <button
        onClick={openMenu}
        className={`${fullWidth ? 'w-full text-sm font-semibold px-4 py-2.5' : 'text-xs px-3 py-1.5 font-medium'} rounded-lg`}
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        Add To Deck ▾
      </button>

      {menuOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', minWidth: '220px' }}
        >
          {deckSuccess ? (
            <div className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Added to "{deckSuccess}"
            </div>
          ) : gameDecks === null ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading decks…</p>
          ) : (
            <>
              {gameDecks.length === 0 && !showNewDeckInput && (
                <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  No {card.game} decks yet.
                </p>
              )}
              {gameDecks.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => handleAddToDeck(deck.id, deck.name)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <span className="truncate mr-3">{deck.name}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {deck.total_cards} cards
                  </span>
                </button>
              ))}

              {showNewDeckInput ? (
                <div className="px-3 py-2 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Deck name…"
                    value={newDeckName}
                    onChange={e => setNewDeckName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateDeck()
                      if (e.key === 'Escape') setShowNewDeckInput(false)
                    }}
                    className="flex-1 px-2 py-1 rounded text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleCreateDeck}
                    disabled={creating || !newDeckName.trim()}
                    className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
                  >
                    {creating ? '…' : 'Create'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewDeckInput(true)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                >
                  + New Deck
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const { cardId } = useParams()
  const [searchParams] = useSearchParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const [selectedPrinting, setSelectedPrinting] = useState(null)
  const [cardCollectionItems, setCardCollectionItems] = useState([])
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/cards/${cardId}`)
        const data = await res.json()
        setCard(data)
        const printingParam = parseInt(searchParams.get('printing'))
        const initial = printingParam
          ? (data.printings?.find(p => p.id === printingParam) ?? data.printings?.[0])
          : data.printings?.[0]
        setSelectedPrinting(initial || null)
      } catch {
        // card stays null → "Card not found" shown below
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cardId])

  useEffect(() => {
    if (!user) { setCardCollectionItems([]); return }
    authFetch(`${API_URL}/api/users/me/collection/card/${cardId}`)
      .then(r => r.json())
      .then(data => setCardCollectionItems(Array.isArray(data) ? data : []))
      .catch(() => setCardCollectionItems([]))
  }, [cardId, user, authFetch])

  const fetchWishlistStatus = useCallback((printingId) => {
    if (!user || !printingId) { setWishlisted(false); return }
    authFetch(`${API_URL}/api/users/me/wishlist/check/${printingId}`)
      .then(r => r.json())
      .then(data => setWishlisted(data?.wishlisted === true))
      .catch(() => setWishlisted(false))
  }, [user, authFetch])

  useEffect(() => {
    fetchWishlistStatus(selectedPrinting?.id)
  }, [selectedPrinting?.id, fetchWishlistStatus])

  const handleToggleWishlist = async () => {
    if (!selectedPrinting) return
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await authFetch(`${API_URL}/api/users/me/wishlist/${selectedPrinting.id}`, { method: 'DELETE' })
        setWishlisted(false)
      } else {
        await authFetch(`${API_URL}/api/users/me/wishlist`, {
          method: 'POST',
          body: JSON.stringify({ printing_id: selectedPrinting.id }),
        })
        setWishlisted(true)
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleSelectPrinting = (printing) => {
    setSelectedPrinting(printing)
    setFlipped(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Modal save operations
  const modalSaveOps = {
    add: async (printingId, quantity, finish, condition) => {
      const res = await authFetch(`${API_URL}/api/users/me/collection`, {
        method: 'POST',
        body: JSON.stringify({ printing_id: printingId, quantity, finish, condition }),
      })
      if (!res.ok) return
      const result = await res.json()
      setCardCollectionItems(prev => {
        const exists = prev.find(i => i.printing_id === printingId && i.finish === finish)
        if (exists) return prev.map(i => i.printing_id === printingId && i.finish === finish ? { ...i, quantity: result.quantity } : i)
        return [...prev, { id: result.id, printing_id: printingId, quantity: result.quantity, finish, condition }]
      })
    },
    update: async (printingId, quantity, finish, condition) => {
      const res = await authFetch(`${API_URL}/api/users/me/collection/${printingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity, finish, condition }),
      })
      if (!res.ok) return
      const result = await res.json()
      setCardCollectionItems(prev => prev.map(i =>
        i.printing_id === printingId && i.finish === finish ? { ...i, quantity: result.quantity, condition } : i
      ))
    },
    remove: async (printingId, finish) => {
      await authFetch(`${API_URL}/api/users/me/collection/${printingId}?finish=${finish}`, { method: 'DELETE' })
      setCardCollectionItems(prev => prev.filter(i => !(i.printing_id === printingId && i.finish === finish)))
    },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading card...</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Card not found</p>
    </div>
  )

  const attrs = card.attributes || {}
  const isDoubleFaced = (attrs.card_faces || []).length > 0
  const rarityColor = RARITY_COLORS[normalizeRarity(selectedPrinting?.rarity)] || 'var(--text-muted)'

  const ownedForPrinting = cardCollectionItems.filter(i => i.printing_id === selectedPrinting?.id)
  const totalOwnedForPrinting = ownedForPrinting.reduce((s, i) => s + i.quantity, 0)

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--accent)' }}
      >
        ← Back
      </button>

      {/* Top section */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-12">

        {/* Card image */}
        <div className="flex-shrink-0 flex flex-col items-center gap-4 w-full md:w-auto">
          {selectedPrinting?.image_url ? (
            <>
              <img
                src={flipped && selectedPrinting.back_image_url
                  ? selectedPrinting.back_image_url
                  : selectedPrinting.image_url}
                alt={card.name}
                className="w-full max-w-xs sm:max-w-sm md:w-80 lg:w-96 rounded-xl shadow-2xl"
              />
              {selectedPrinting.back_image_url && (
                <button
                  onClick={() => setFlipped(!flipped)}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 w-full"
                  style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#06b6b4'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                >
                  {flipped ? '← Front' : 'Flip Card →'}
                </button>
              )}
            </>
          ) : (
            <div className="w-full max-w-xs sm:max-w-sm md:w-80 lg:w-96 aspect-[2.5/3.5] rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ color: 'var(--text-muted)' }}>No image</span>
            </div>
          )}

          {/* Action buttons — under the card image */}
          {user && selectedPrinting && (
            <div className="w-full max-w-xs sm:max-w-sm md:w-80 lg:w-96 flex flex-col gap-2">
              {totalOwnedForPrinting > 0 ? (
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg flex-wrap min-w-0"
                    style={{ backgroundColor: '#dff0f4', border: '1px solid #0097a733' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                    {ownedForPrinting.map(item => (
                      <span key={item.finish}
                        className={`text-sm font-semibold${item.finish === 'foil' ? ' foil-rainbow' : ''}`}
                        style={item.finish === 'foil' ? {} : { color: 'var(--accent)' }}>
                        ×{item.quantity} {item.finish}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-200 hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                  >
                    + Add More
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  Add to Collection
                </button>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <AddToDeckButton card={card} authFetch={authFetch} fullWidth />
                </div>
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors duration-200"
                  style={{
                    backgroundColor: wishlisted ? '#f5e0e6' : 'var(--bg-surface)',
                    border: `1px solid ${wishlisted ? 'var(--accent-maroon)' : 'var(--border)'}`,
                    color: wishlisted ? 'var(--accent-maroon)' : 'var(--text-muted)',
                  }}
                >
                  {wishlisted ? '♥ In Wishlist' : 'Add To Wishlist'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">

          <Link to={`/games/${card.game_slug}`} className="text-base font-semibold uppercase tracking-widest hover:underline" style={{ color: 'var(--accent)' }}>
            {card.game}
          </Link>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mt-2 mb-2 break-words" style={{ color: 'var(--text-primary)' }}>{card.name}</h2>

          <p className="text-xl mb-4" style={{ color: 'var(--text-muted)' }}>{card.card_type}</p>

          {selectedPrinting && (
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate(`/sets/${selectedPrinting.set_id}`)}
                className="text-lg font-semibold hover:opacity-80 transition-opacity underline underline-offset-2"
                style={{ color: 'var(--accent)' }}
              >
                {selectedPrinting.set_name}
              </button>
              <span style={{ color: 'var(--border)' }}>•</span>
              <span className="text-lg font-semibold capitalize" style={{ color: rarityColor }}>
                {selectedPrinting.rarity}
              </span>
            </div>
          )}

          {/* Game-specific card info */}
          {card.game_slug === 'mtg'              && <MTGCardInfo card={card} flipped={flipped} />}
          {card.game_slug === 'pokemon'          && <PokemonCardInfo attrs={attrs} rulesText={card.rules_text} cardType={card.card_type} />}
          {card.game_slug === 'middle-earth-ccg' && <MECCGCardInfo card={card} />}
          {card.game_slug === 'yugioh'           && <YuGiOhCardInfo card={card} />}
          {card.game_slug === 'weissschwarz'     && <WeissSchwarzCardInfo card={card} />}
          {card.game_slug === 'seventhsea'                      && <SeventhSeaCardInfo card={card} />}
          {card.game_slug === 'vampire-the-eternal-struggle-ccg' && <VTESCardInfo card={card} />}
          {card.game_slug === 'world-of-warcraft-tcg'           && <WoWTCGCardInfo card={card} />}
          {card.game_slug === 'naruto-mythos-tcg'              && <NarutoMythosCardInfo card={card} />}
          {card.game_slug === 'sorcery'                        && <SorceryCardInfo card={card} />}
          {card.game_slug === 'swu'                            && <SWUCardInfo card={card} flipped={flipped} />}
          {card.game_slug === 'starwars_decipher'              && <SWCCGCardInfo card={card} />}
          {card.game_slug === 'startrek_1e'          && <StarTrek1ECardInfo card={card} />}
          {card.game_slug === 'startrek_2e'          && <StarTrek2ECardInfo card={card} />}
          {card.game_slug === 'lorcana'              && <LorcanaCardInfo card={card} />}
          {card.game_slug === 'digimon'              && <DigimonCardInfo card={card} />}
          {card.game_slug === 'onepiece'             && <OnePieceCardInfo card={card} />}
          {card.game_slug === 'fftcg'                && <FFTCGCardInfo card={card} />}
          {card.game_slug === 'fab'                  && <FaBCardInfo card={card} />}
          {card.game_slug === 'dragon-ball-fusion'   && <DBSFusionCardInfo card={card} />}
          {card.game_slug === 'grand-archive'        && <GrandArchiveCardInfo card={card} />}
          {card.game_slug === 'metazoo'              && <MetaZooCardInfo card={card} />}
          {card.game_slug === 'riftbound'            && <RiftboundCardInfo card={card} />}
          {card.game_slug === 'gundam'               && <GundamCardInfo card={card} />}
          {card.game_slug === 'union-arena'          && <UnionArenaCardInfo card={card} />}
          {!['mtg','pokemon','middle-earth-ccg','yugioh','weissschwarz','seventhsea',
             'vampire-the-eternal-struggle-ccg','world-of-warcraft-tcg','naruto-mythos-tcg',
             'sorcery','swu','starwars_decipher','startrek_1e','startrek_2e',
             'lorcana','digimon','onepiece','fftcg','fab','dragon-ball-fusion',
             'grand-archive','metazoo','riftbound','gundam','union-arena'].includes(card.game_slug) && (
            <GenericCardInfo card={card} />
          )}

          {/* Flavor text */}
          {selectedPrinting?.flavor_text && (
            <div className="rounded-xl px-5 py-4 mb-5 border"
              style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)' }}>
              <p className="italic text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                "{selectedPrinting.flavor_text}"
              </p>
            </div>
          )}

          {selectedPrinting && (
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              {selectedPrinting.collector_number && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Collector #</p>
                  <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPrinting.collector_number}</p>
                </div>
              )}
              {selectedPrinting.release_date && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Released</p>
                  <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPrinting.release_date}</p>
                </div>
              )}
              {selectedPrinting.artist && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Artist</p>
                  <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>✏️ {selectedPrinting.artist}</p>
                </div>
              )}
              {selectedPrinting.set_code && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Set Code</p>
                  <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPrinting.set_code?.toUpperCase()}</p>
                </div>
              )}
            </div>
          )}


        </div>{/* end card info */}
      </div>{/* end top section */}

      {/* All Printings */}
      {card.printings?.length > 1 && (
        <div>
          <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            All Printings
            <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
              ({card.printings.length})
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {card.printings.map(printing => (
              <div
                key={printing.id}
                onClick={() => handleSelectPrinting(printing)}
                className="rounded-xl overflow-hidden border cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: selectedPrinting?.id === printing.id ? 'var(--bg-chip)' : 'var(--bg-surface)',
                  borderColor: selectedPrinting?.id === printing.id ? 'var(--accent)' : 'var(--border)'
                }}
                onMouseEnter={e => {
                  if (selectedPrinting?.id !== printing.id) e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  if (selectedPrinting?.id !== printing.id) e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {printing.image_url ? (
                  <img src={printing.image_url} alt={printing.set_name} className="w-full" />
                ) : (
                  <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                    style={{ backgroundColor: 'var(--bg-chip)' }}>
                    <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{printing.set_name}</span>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{printing.set_name}</p>
                  <p className="text-xs capitalize"
                    style={{ color: RARITY_COLORS[normalizeRarity(printing.rarity)] || 'var(--text-muted)' }}>
                    {printing.rarity}
                  </p>
                  {user && (() => {
                    const printingItems = cardCollectionItems.filter(i => i.printing_id === printing.id)
                    const count = printingItems.reduce((s, i) => s + i.quantity, 0)
                    const allFoil = printingItems.length > 0 && printingItems.every(i => i.finish === 'foil')
                    return count > 0 ? (
                      <p className={`text-xs font-semibold mt-0.5${allFoil ? ' foil-rainbow' : ''}`}
                        style={allFoil ? {} : { color: 'var(--accent)' }}>×{count} owned</p>
                    ) : null
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection modal */}
      {modalOpen && selectedPrinting && (
        <CollectionModal
          printing={selectedPrinting}
          cardCollectionItems={cardCollectionItems}
          onClose={() => setModalOpen(false)}
          onSave={modalSaveOps}
        />
      )}
    </div>
  )
}
