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
            className="w-6 h-6"
          />
        )
      })}
    </span>
  )
}

function LegalityBadge({ format, status }) {
  const styles = {
    legal: { backgroundColor: '#1a3a2a', borderColor: '#2d6a4f', color: '#08D9D6' },
    not_legal: { backgroundColor: '#2d3243', borderColor: '#363d52', color: '#8892a4' },
    banned: { backgroundColor: '#3a1a1a', borderColor: '#6a2d2d', color: '#FF2E63' },
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
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const navigate = useNavigate()

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
      <p className="text-lg" style={{ color: '#8892a4' }}>Loading card...</p>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8892a4' }}>Card not found</p>
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

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#08D9D6' }}
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
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#06b6b4'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#08D9D6'}
                >
                  {flipped ? '← Front' : 'Flip Card →'}
                </button>
              )}
            </div>
          ) : (
            <div className="w-64 aspect-[2.5/3.5] rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#2d3243' }}>
              <span style={{ color: '#8892a4' }}>No image</span>
            </div>
          )}
        </div>

        {/* Card info */}
        <div className="flex-1">
          <span className="text-sm font-medium uppercase tracking-wide" style={{ color: '#08D9D6' }}>
            {card.game}
          </span>

          <div className="flex items-center gap-4 mt-1 mb-1">
            <h2 className="text-4xl font-bold" style={{ color: '#EAEAEA' }}>{card.name}</h2>
            <ManaCost cost={manaCost} />
          </div>

          {/* Type line and P/T on same row */}
          <div className="flex items-center gap-4 mb-4">
            <p className="text-lg" style={{ color: '#8892a4' }}>{typeLine}</p>
            {power && toughness && (
              <span className="font-bold text-lg px-2 py-0.5 rounded border"
                style={{ color: '#EAEAEA', borderColor: '#363d52', backgroundColor: '#2d3243' }}>
                {power}/{toughness}
              </span>
            )}
            {loyalty && (
              <span className="font-bold text-lg px-2 py-0.5 rounded border"
                style={{ color: '#EAEAEA', borderColor: '#363d52', backgroundColor: '#2d3243' }}>
                Loyalty: {loyalty}
              </span>
            )}
          </div>

          {/* Oracle text */}
          {rulesText && (
            <div className="rounded-xl p-4 mb-4 border"
              style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}>
              <p className="whitespace-pre-line leading-relaxed" style={{ color: '#EAEAEA' }}>
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
                  className="text-sm px-3 py-1 rounded-full border"
                  style={{ backgroundColor: '#2d3243', borderColor: '#363d52', color: '#8892a4' }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Artist */}
          {card.printings?.[0]?.artist && (
            <p className="text-sm" style={{ color: '#8892a4' }}>
              ✏️ {card.printings[0].artist}
            </p>
          )}
        </div>
      </div>

      {/* Legalities */}
      {Object.keys(legalities).length > 0 && (
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#EAEAEA' }}>Format Legality</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(legalities).map(([format, status]) => (
              <LegalityBadge key={format} format={format} status={status} />
            ))}
          </div>
        </div>
      )}

      {/* All printings */}
      <div>
        <h3 className="text-2xl font-bold mb-4" style={{ color: '#EAEAEA' }}>
          All Printings
          <span className="text-lg font-normal ml-2" style={{ color: '#8892a4' }}>
            ({card.printings?.length ?? 0})
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {card.printings?.map(printing => (
            <div
              key={printing.id}
              className="rounded-xl overflow-hidden border"
              style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
            >
              {printing.image_url ? (
                <img
                  src={printing.image_url}
                  alt={printing.set_name}
                  className="w-full"
                />
              ) : (
                <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                  style={{ backgroundColor: '#363d52' }}>
                  <span className="text-xs text-center" style={{ color: '#8892a4' }}>
                    {printing.set_name}
                  </span>
                </div>
              )}
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: '#EAEAEA' }}>
                  {printing.set_name}
                </p>
                <p className="text-xs" style={{ color: '#8892a4' }}>{printing.rarity}</p>
                {printing.artist && (
                  <p className="text-xs truncate" style={{ color: '#8892a4' }}>
                    ✏️ {printing.artist}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}