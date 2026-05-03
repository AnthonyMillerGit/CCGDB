import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import PokemonCardInfo from '../components/card-templates/PokemonCardInfo'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { RARITY_COLORS, normalizeRarity } from '../theme'

function AddToDeckButton({ card, authFetch }) {
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={openMenu}
        className="text-xs px-3 py-1.5 rounded font-medium"
        style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}
      >
        ⊞ Deck ▾
      </button>

      {menuOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#35353f', border: '1px solid #42424e', minWidth: '220px' }}
        >
          {deckSuccess ? (
            <div className="px-4 py-3 text-sm font-medium" style={{ color: '#6A7EFC' }}>
              Added to "{deckSuccess}"
            </div>
          ) : gameDecks === null ? (
            <p className="px-4 py-3 text-sm" style={{ color: '#8e8e9e' }}>Loading decks…</p>
          ) : (
            <>
              {gameDecks.length === 0 && !showNewDeckInput && (
                <p className="px-4 py-3 text-xs" style={{ color: '#8e8e9e' }}>
                  No {card.game} decks yet.
                </p>
              )}
              {gameDecks.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => handleAddToDeck(deck.id, deck.name)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid #42424e', color: '#EDF2F6' }}
                >
                  <span className="truncate mr-3">{deck.name}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#8e8e9e' }}>
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
                    style={{ backgroundColor: '#1f1f25', border: '1px solid #42424e', color: '#EDF2F6' }}
                  />
                  <button
                    onClick={handleCreateDeck}
                    disabled={creating || !newDeckName.trim()}
                    className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#FF5656', color: '#26262e' }}
                  >
                    {creating ? '…' : 'Create'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewDeckInput(true)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: '#6A7EFC' }}
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

function ManaCost({ cost }) {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {symbols.map((symbol, i) => {
        const code = symbol.replace('{', '').replace('}', '')
        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
            alt={symbol}
            className="w-7 h-7"
          />
        )
      })}
    </span>
  )
}

function LegalityBadge({ format, status }) {
  const styles = {
    legal: { backgroundColor: '#1a3a2a', borderColor: '#2d6a4f', color: '#6A7EFC' },
    not_legal: { backgroundColor: '#35353f', borderColor: '#42424e', color: '#8e8e9e' },
    banned: { backgroundColor: '#3a1a1a', borderColor: '#6a2d2d', color: '#FF5656' },
    restricted: { backgroundColor: '#3a3a1a', borderColor: '#6a6a2d', color: '#f4c542' },
  }
  const labels = {
    legal: 'Legal',
    not_legal: 'Not Legal',
    banned: 'Banned',
    restricted: 'Restricted',
  }
  const style = styles[status] ?? styles.not_legal
  return (
    <div className="border rounded-lg px-3 py-2" style={style}>
      <p className="text-xs uppercase tracking-wide opacity-60">{format}</p>
      <p className="text-sm font-medium">{labels[status] ?? status}</p>
    </div>
  )
}

export default function CardDetailPage() {
  const { cardId } = useParams()
  const [searchParams] = useSearchParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const [selectedPrinting, setSelectedPrinting] = useState(null)
  const [collectionItem, setCollectionItem] = useState(null)
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [isFoil, setIsFoil] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
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

  const fetchCollectionItem = useCallback((printingId, foil = false) => {
    if (!user || !printingId) { setCollectionItem(null); return }
    authFetch(`${API_URL}/api/users/me/collection/printing/${printingId}?foil=${foil}`)
      .then(r => r.json())
      .then(data => setCollectionItem(data || null))
      .catch(() => setCollectionItem(null))
  }, [user, authFetch])

  const fetchWishlistStatus = useCallback((printingId) => {
    if (!user || !printingId) { setWishlisted(false); return }
    authFetch(`${API_URL}/api/users/me/wishlist/check/${printingId}`)
      .then(r => r.json())
      .then(data => setWishlisted(data?.wishlisted === true))
      .catch(() => setWishlisted(false))
  }, [user, authFetch])

  useEffect(() => {
    fetchCollectionItem(selectedPrinting?.id, isFoil)
    fetchWishlistStatus(selectedPrinting?.id)
  }, [selectedPrinting?.id, isFoil, fetchCollectionItem, fetchWishlistStatus])

  const handleAddToCollection = async () => {
    if (!selectedPrinting) return
    setCollectionLoading(true)
    try {
      await authFetch(`${API_URL}/api/users/me/collection`, {
        method: 'POST',
        body: JSON.stringify({ printing_id: selectedPrinting.id, quantity: 1, is_foil: isFoil }),
      })
      fetchCollectionItem(selectedPrinting.id, isFoil)
    } finally {
      setCollectionLoading(false)
    }
  }

  const handleRemoveFromCollection = async () => {
    if (!selectedPrinting) return
    setCollectionLoading(true)
    try {
      await authFetch(`${API_URL}/api/users/me/collection/${selectedPrinting.id}?foil=${isFoil}`, { method: 'DELETE' })
      setCollectionItem(null)
    } finally {
      setCollectionLoading(false)
    }
  }

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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8e8e9e' }}>Loading card...</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8e8e9e' }}>Card not found</p>
    </div>
  )

  const attrs = card.attributes || {}
  const legalities = attrs.legalities || {}
  const keywords = attrs.keywords || []
  const cardFaces = attrs.card_faces || []
  const isDoubleFaced = cardFaces.length > 0

  const frontFace = cardFaces[0] || {}
  const backFace = cardFaces[1] || {}
  const activeFace = flipped ? backFace : frontFace

  const power = isDoubleFaced ? activeFace.power : attrs.power
  const toughness = isDoubleFaced ? activeFace.toughness : attrs.toughness
  const loyalty = isDoubleFaced ? activeFace.loyalty : attrs.loyalty
  const manaCost = isDoubleFaced ? activeFace.mana_cost : attrs.mana_cost
  const rulesText = isDoubleFaced ? activeFace.oracle_text : card.rules_text
  const typeLine = isDoubleFaced ? activeFace.type_line : card.card_type
  const rarityColor = RARITY_COLORS[normalizeRarity(selectedPrinting?.rarity)] || '#8e8e9e'

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#6A7EFC' }}
      >
        ← Back
      </button>

      {/* Top section */}
      <div className="flex flex-col md:flex-row gap-10 mb-12">

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
                  style={{ backgroundColor: '#FF5656', color: '#26262e' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#06b6b4'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6A7EFC'}
                >
                  {flipped ? '← Front' : 'Flip Card →'}
                </button>
              )}
            </>
          ) : (
            <div className="w-full max-w-xs sm:max-w-sm md:w-80 lg:w-96 aspect-[2.5/3.5] rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#35353f' }}>
              <span style={{ color: '#8e8e9e' }}>No image</span>
            </div>
          )}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">

          <Link to={`/games/${card.game_slug}`} className="text-base font-semibold uppercase tracking-widest hover:underline" style={{ color: '#6A7EFC' }}>
            {card.game}
          </Link>

          <div className="flex items-start gap-4 mt-2 mb-2 flex-wrap">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight" style={{ color: '#EDF2F6' }}>{card.name}</h2>
            <div className="mt-2"><ManaCost cost={manaCost} /></div>
          </div>

          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <p className="text-xl" style={{ color: '#8e8e9e' }}>{typeLine}</p>
            {power && toughness && (
              <span className="font-bold text-xl px-3 py-1 rounded border"
                style={{ color: '#EDF2F6', borderColor: '#42424e', backgroundColor: '#35353f' }}>
                {power}/{toughness}
              </span>
            )}
            {loyalty && (
              <span className="font-bold text-xl px-3 py-1 rounded border"
                style={{ color: '#EDF2F6', borderColor: '#42424e', backgroundColor: '#35353f' }}>
                Loyalty: {loyalty}
              </span>
            )}
          </div>

          {selectedPrinting && (
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate(`/sets/${selectedPrinting.set_id}`)}
                className="text-lg font-semibold hover:opacity-80 transition-opacity underline underline-offset-2"
                style={{ color: '#6A7EFC' }}
              >
                {selectedPrinting.set_name}
              </button>
              <span style={{ color: '#42424e' }}>•</span>
              <span className="text-lg font-semibold capitalize" style={{ color: rarityColor }}>
                {selectedPrinting.rarity}
              </span>
            </div>
          )}

          {/* Game specific card info */}
          {card.game_slug === 'pokemon' ? (
            <PokemonCardInfo
              attrs={attrs}
              rulesText={rulesText}
              cardType={card.card_type}
            />
          ) : (
            rulesText && (
              <div className="rounded-xl p-5 mb-5 border"
                style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}>
                <p className="whitespace-pre-line leading-relaxed text-base" style={{ color: '#EDF2F6' }}>
                  {rulesText}
                </p>
              </div>
            )
          )}

          {/* Flavor text */}
          {selectedPrinting?.flavor_text && (
            <div className="rounded-xl px-5 py-4 mb-5 border"
              style={{ backgroundColor: '#1f1f25', borderColor: '#42424e' }}>
              <p className="italic text-base leading-relaxed" style={{ color: '#8e8e9e' }}>
                "{selectedPrinting.flavor_text}"
              </p>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {keywords.map(kw => (
                <span
                  key={kw}
                  className="text-sm px-3 py-1 rounded-full border"
                  style={{ backgroundColor: '#35353f', borderColor: '#42424e', color: '#8e8e9e' }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {selectedPrinting && (
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}>
              {selectedPrinting.collector_number && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#8e8e9e' }}>Collector #</p>
                  <p className="text-base font-medium" style={{ color: '#EDF2F6' }}>{selectedPrinting.collector_number}</p>
                </div>
              )}
              {selectedPrinting.release_date && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#8e8e9e' }}>Released</p>
                  <p className="text-base font-medium" style={{ color: '#EDF2F6' }}>{selectedPrinting.release_date}</p>
                </div>
              )}
              {selectedPrinting.artist && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#8e8e9e' }}>Artist</p>
                  <p className="text-base font-medium" style={{ color: '#EDF2F6' }}>✏️ {selectedPrinting.artist}</p>
                </div>
              )}
              {selectedPrinting.set_code && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#8e8e9e' }}>Set Code</p>
                  <p className="text-base font-medium" style={{ color: '#EDF2F6' }}>{selectedPrinting.set_code?.toUpperCase()}</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons — collection, deck, wishlist */}
          {user && selectedPrinting && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {/* Foil toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFoil}
                  onChange={e => setIsFoil(e.target.checked)}
                  className="accent-yellow-400 w-3.5 h-3.5"
                />
                <span className="text-xs font-medium" style={{ color: isFoil ? '#facc15' : '#8e8e9e' }}>
                  ✦ Foil
                </span>
              </label>

              {/* Collection */}
              {collectionItem ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded"
                  style={{ backgroundColor: '#35353f', border: `1px solid ${isFoil ? '#facc15' : '#6A7EFC'}` }}>
                  <span className="text-xs font-medium" style={{ color: isFoil ? '#facc15' : '#6A7EFC' }}>×{collectionItem.quantity}</span>
                  <button
                    onClick={handleRemoveFromCollection}
                    disabled={collectionLoading}
                    className="text-xs px-1.5 rounded disabled:opacity-50 leading-none"
                    style={{ color: '#FF5656' }}
                    title="Remove one"
                  >−</button>
                  <button
                    onClick={handleAddToCollection}
                    disabled={collectionLoading}
                    className="text-xs px-1.5 rounded disabled:opacity-50 leading-none"
                    style={{ color: isFoil ? '#facc15' : '#6A7EFC' }}
                    title="Add another"
                  >+</button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCollection}
                  disabled={collectionLoading}
                  className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#35353f', border: `1px solid ${isFoil ? '#facc15' : '#6A7EFC'}`, color: isFoil ? '#facc15' : '#6A7EFC' }}
                >
                  {collectionLoading ? '…' : `+ Collection${isFoil ? ' (Foil)' : ''}`}
                </button>
              )}

              {/* Deck */}
              <AddToDeckButton card={card} authFetch={authFetch} />

              {/* Wishlist */}
              <button
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                style={{
                  backgroundColor: wishlisted ? '#3a1a2a' : '#35353f',
                  border: `1px solid ${wishlisted ? '#FF5656' : '#42424e'}`,
                  color: wishlisted ? '#FF5656' : '#8e8e9e',
                }}
              >
                {wishlisted ? '♥ Wishlist' : '♡ Wishlist'}
              </button>
            </div>
          )}

        </div>{/* end card info */}
      </div>{/* end top section */}

      {/* Format Legality */}
      {Object.keys(legalities).length > 0 && (
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#EDF2F6' }}>Format Legality</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(legalities).map(([format, status]) => (
              <LegalityBadge key={format} format={format} status={status} />
            ))}
          </div>
        </div>
      )}

      {/* All Printings — all games */}
      {card.printings?.length > 1 && (
        <div>
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#EDF2F6' }}>
            All Printings
            <span className="text-lg font-normal ml-2" style={{ color: '#8e8e9e' }}>
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
                  backgroundColor: selectedPrinting?.id === printing.id ? '#42424e' : '#35353f',
                  borderColor: selectedPrinting?.id === printing.id ? '#6A7EFC' : '#42424e'
                }}
                onMouseEnter={e => {
                  if (selectedPrinting?.id !== printing.id) e.currentTarget.style.borderColor = '#6A7EFC'
                }}
                onMouseLeave={e => {
                  if (selectedPrinting?.id !== printing.id) e.currentTarget.style.borderColor = '#42424e'
                }}
              >
                {printing.image_url ? (
                  <img src={printing.image_url} alt={printing.set_name} className="w-full" />
                ) : (
                  <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                    style={{ backgroundColor: '#42424e' }}>
                    <span className="text-xs text-center" style={{ color: '#8e8e9e' }}>{printing.set_name}</span>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: '#EDF2F6' }}>{printing.set_name}</p>
                  <p className="text-xs capitalize"
                    style={{ color: RARITY_COLORS[normalizeRarity(printing.rarity)] || '#8e8e9e' }}>
                    {printing.rarity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}