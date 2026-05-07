import { RARITY_COLORS, normalizeRarity } from '../../theme'

function ManaCost({ cost }) {
  if (!cost) return null
  const symbols = cost.match(/\{[^}]+\}/g) || []
  if (!symbols.length) return null
  return (
    <span className="flex items-center gap-1 flex-wrap">
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
    legal:      { backgroundColor: '#1a3a2a', borderColor: '#2d6a4f', color: '#6bcb77' },
    not_legal:  { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' },
    banned:     { backgroundColor: '#3a1a1a', borderColor: '#6a2d2d', color: '#8b1a3a' },
    restricted: { backgroundColor: '#3a3a1a', borderColor: '#6a6a2d', color: '#f4c542' },
  }
  const labels = { legal: 'Legal', not_legal: 'Not Legal', banned: 'Banned', restricted: 'Restricted' }
  const style = styles[status] ?? styles.not_legal
  return (
    <div className="border rounded-lg px-3 py-2" style={style}>
      <p className="text-xs uppercase tracking-wide opacity-60">{format}</p>
      <p className="text-sm font-medium">{labels[status] ?? status}</p>
    </div>
  )
}

export default function MTGCardInfo({ card, flipped }) {
  const attrs = card.attributes || {}
  const cardFaces = attrs.card_faces || []
  const isDoubleFaced = cardFaces.length > 0
  const activeFace = isDoubleFaced ? (flipped ? cardFaces[1] : cardFaces[0]) : {}

  const power      = isDoubleFaced ? activeFace.power      : attrs.power
  const toughness  = isDoubleFaced ? activeFace.toughness  : attrs.toughness
  const loyalty    = isDoubleFaced ? activeFace.loyalty    : attrs.loyalty
  const manaCost   = isDoubleFaced ? activeFace.mana_cost  : attrs.mana_cost
  const rulesText  = isDoubleFaced ? activeFace.oracle_text : card.rules_text
  const keywords   = attrs.keywords || []
  const legalities = attrs.legalities || {}

  return (
    <div>
      {/* Mana cost + P/T / Loyalty */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {manaCost && <ManaCost cost={manaCost} />}
        {power && toughness && (
          <span className="font-bold text-xl px-3 py-1 rounded border"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            {power}/{toughness}
          </span>
        )}
        {loyalty && (
          <span className="font-bold text-xl px-3 py-1 rounded border"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            Loyalty: {loyalty}
          </span>
        )}
      </div>

      {/* Rules text */}
      {rulesText && (
        <div className="rounded-xl p-5 mb-5 border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="whitespace-pre-line leading-relaxed text-base" style={{ color: 'var(--text-primary)' }}>
            {rulesText}
          </p>
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {keywords.map(kw => (
            <span key={kw} className="text-sm px-3 py-1 rounded-full border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Format legality */}
      {Object.keys(legalities).length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Format Legality</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(legalities).map(([format, status]) => (
              <LegalityBadge key={format} format={format} status={status} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
