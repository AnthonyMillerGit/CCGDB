// ── Element styles ─────────────────────────────────────────────────────────────
const ELEMENT_STYLES = {
  Fire:      { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Ice:       { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Wind:      { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Earth:     { bg: '#2a1a00', border: '#795548', text: '#d7ccc8' },
  Lightning: { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Water:     { bg: '#002e2a', border: '#00796b', text: '#80cbc4' },
  Dark:      { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb' },
  Light:     { bg: '#2a2a1a', border: '#c6a700', text: '#fff176' },
}
const DEFAULT_ELEM = { bg: '#22222a', border: '#d4c4a8', text: '#aaa' }

// Category abbreviation → full name
const CAT_NAMES = {
  'I': 'FFI', 'II': 'FFII', 'III': 'FFIII', 'IV': 'FFIV', 'V': 'FFV', 'VI': 'FFVI',
  'VII': 'FFVII', 'VIII': 'FFVIII', 'IX': 'FFIX', 'X': 'FFX', 'XI': 'FFXI',
  'XII': 'FFXII', 'XIII': 'FFXIII', 'XIV': 'FFXIV', 'XV': 'FFXV', 'XVI': 'FFXVI',
  'T': 'FFT', 'TA': 'FFTA', 'CC': 'FFCC', 'CT': 'FFT',
}

function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#7a6248' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#faf6ee', text = '#7a6248' }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
      {label}
    </span>
  )
}

function TextBlock({ text }) {
  if (!text) return null
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#1c1008' }}>{text}</p>
    </div>
  )
}

export default function FFTCGCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const elements = Array.isArray(attrs.element) ? attrs.element : (attrs.element ? [attrs.element] : [])
  const isForward  = cardType === 'Forward'
  const isMonster  = cardType === 'Monster'
  const isBackup   = cardType === 'Backup'

  const cats = [attrs.category_1, attrs.category_2]
    .filter(Boolean)
    .map(c => CAT_NAMES[c] || c)

  const showStats = isForward || isMonster || (isBackup && attrs.cost)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Elements */}
        {elements.map(el => {
          const s = ELEMENT_STYLES[el] || DEFAULT_ELEM
          return (
            <span key={el} className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
              style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
              {el}
            </span>
          )
        })}

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            {cardType}
          </span>
        )}

        {/* Card code */}
        {attrs.code && (
          <span className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ backgroundColor: '#1a1a24', border: '1px solid #d4c4a8', color: '#7a6248' }}>
            {attrs.code}
          </span>
        )}

        {/* Job */}
        {attrs.job && (
          <Chip label={attrs.job} bg="#1a2535" border="#1565c0" text="#90caf9" />
        )}

        {/* Categories */}
        {cats.map(c => (
          <Chip key={c} label={c} bg="#22222a" border="#faf6ee" text="#7a6248" />
        ))}

        {/* EX Burst */}
        {attrs.ex_burst && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#2e1a00', border: '1px solid #f9a825', color: '#ffe082' }}>
            EX BURST
          </span>
        )}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Cost"  value={attrs.cost}  color="#ffe082" />
          {(isForward || isMonster) && (
            <StatChip label="Power" value={attrs.power} color="#ef5350" />
          )}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}
