import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function ManaCost({ cost }) {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  return (
    <span className="flex items-center gap-0.5 flex-wrap">
      {symbols.map((symbol, i) => {
        const code = symbol.replace('{', '').replace('}', '')
        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
            alt={symbol}
            className="w-5 h-5"
          />
        )
      })}
    </span>
  )
}

function LegalityBadge({ format, status }) {
  const colors = {
    legal: 'bg-green-900 border-green-700 text-green-400',
    not_legal: 'bg-gray-900 border-gray-700 text-gray-500',
    banned: 'bg-red-900 border-red-700 text-red-400',
    restricted: 'bg-yellow-900 border-yellow-700 text-yellow-400',
  }
  const labels = {
    legal: 'Legal',
    not_legal: 'Not Legal',
    banned: 'Banned',
    restricted: 'Restricted',
  }
  return (
    <div className={`border rounded-lg px-3 py-2 ${colors[status] ?? colors.not_legal}`}>
      <p className="text-xs uppercase tracking-wide opacity-60">{format}</p>
      <p className="text-sm font-medium">{labels[status] ?? status}</p>
    </div>
  )
}

export default function CardDetailPage() {
  const { cardId } = useParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    fetch(`http://localhost:8000/api/cards/${cardId}`)
      .then(r => r.json())
      .then(data => {
        setCard(data)
        setLoading(false)
      })
  }, [cardId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Loading card...</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Card not found</p>
    </div>
  )

  const attrs = card.attributes || {}
  const legalities = attrs.legalities || {}
  const keywords = attrs.keywords || []
  const cardFaces = attrs.card_faces || []
  const isDoubleFaced = cardFaces.length > 0
  
  // For double faced cards use the appropriate face data
  const frontFace = cardFaces[0] || {}
  const backFace = cardFaces[1] || {}
  const activeFace = flipped ? backFace : frontFace
  
  const power = isDoubleFaced ? activeFace.power : attrs.power
  const toughness = isDoubleFaced ? activeFace.toughness : attrs.toughness
  const loyalty = isDoubleFaced ? activeFace.loyalty : attrs.loyalty
  const manaCost = isDoubleFaced ? activeFace.mana_cost : attrs.mana_cost
  const rulesText = isDoubleFaced ? activeFace.oracle_text : card.rules_text
  const typeLine = isDoubleFaced ? activeFace.type_line : card.card_type

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Top section */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">

      {/* Card image */}
      <div className="flex-shrink-0">
        {card.printings?.[0]?.image_url ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={flipped && card.printings[0].back_image_url
                ? card.printings[0].back_image_url
                : card.printings[0].image_url}
              alt={card.name}
              className="w-64 rounded-xl shadow-2xl"
            />
            {card.printings[0].back_image_url && (
              <button
                onClick={() => setFlipped(!flipped)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
              >
                {flipped ? '← Front' : 'Flip Card →'}
              </button>
            )}
          </div>
        ) : (
          <div className="w-64 aspect-[2.5/3.5] bg-gray-800 rounded-xl flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>

        {/* Card info */}
        <div className="flex-1">

          {/* Game label */}
          <span className="text-indigo-400 text-sm font-medium uppercase tracking-wide">
            {card.game}
          </span>

          {/* Name and mana cost */}
          <div className="flex items-center gap-4 mt-1 mb-1">
            <h2 className="text-4xl font-bold text-white">{card.name}</h2>
            <ManaCost cost={manaCost} />
          </div>

          {/* Type line */}
          <p className="text-gray-400 text-lg mb-4">{typeLine}</p>

          {/* Power/Toughness or Loyalty */}
          {(power && toughness) && (
            <div className="inline-block bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-4">
              <span className="text-white font-bold text-xl">{power}/{toughness}</span>
            </div>
          )}
          {loyalty && (
            <div className="inline-block bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-4">
              <span className="text-white font-bold text-xl">Loyalty: {loyalty}</span>
            </div>
          )}

          {/* Oracle text */}
          {rulesText && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                {rulesText}
              </p>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map(kw => (
                <span
                  key={kw}
                  className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-3 py-1 rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Artist */}
          {card.printings?.[0]?.artist && (
            <p className="text-gray-600 text-sm">
              ✏️ {card.printings[0].artist}
            </p>
          )}
        </div>
      </div>

      {/* Legalities */}
      {Object.keys(legalities).length > 0 && (
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">Format Legality</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(legalities).map(([format, status]) => (
              <LegalityBadge key={format} format={format} status={status} />
            ))}
          </div>
        </div>
      )}

      {/* All printings */}
      <div>
        <h3 className="text-2xl font-bold mb-4">
          All Printings
          <span className="text-gray-500 text-lg font-normal ml-2">
            ({card.printings?.length ?? 0})
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {card.printings?.map(printing => (
            <div
              key={printing.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {printing.image_url ? (
                <img
                  src={printing.image_url}
                  alt={printing.set_name}
                  className="w-full"
                />
              ) : (
                <div className="aspect-[2.5/3.5] bg-gray-800 flex items-center justify-center p-3">
                  <span className="text-gray-400 text-xs text-center">{printing.set_name}</span>
                </div>
              )}
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{printing.set_name}</p>
                <p className="text-gray-500 text-xs">{printing.rarity}</p>
                {printing.artist && (
                  <p className="text-gray-600 text-xs truncate">✏️ {printing.artist}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}