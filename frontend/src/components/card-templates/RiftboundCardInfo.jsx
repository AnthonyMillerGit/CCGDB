// ── Domain styles ──────────────────────────────────────────────────────────────
const DOMAIN_STYLES = {
  Fury:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Calm:    { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Mind:    { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
  Wild:    { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Void:    { bg: '#121212', border: '#424242', text: '#bdbdbd' },
}
const DEFAULT_DOMAIN = { bg: '#22222a', border: '#d4c4a8', text: '#aaa' }

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

function TextBlock({ text, isHtml = false }) {
  if (!text) return null
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
      {isHtml
        ? <div className="leading-relaxed text-sm card-rules-html"
            style={{ color: '#1c1008' }}
            dangerouslySetInnerHTML={{ __html: text }} />
        : <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#1c1008' }}>{text}</p>
      }
    </div>
  )
}

const HTML_RE = /<[a-z][\s\S]*>/i

export default function RiftboundCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const isUnit = cardType.toLowerCase().includes('unit') || cardType === 'Legend'

  // Domain can be multi-value: "Calm;Mind"
  const domains = (attrs.domain || '').split(';').map(d => d.trim()).filter(Boolean)

  const showStats = isUnit && (attrs.might != null || attrs.energyCost || attrs.powerCost)
  const isHtml    = card.rules_text && HTML_RE.test(card.rules_text)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Domains */}
        {domains.map(d => {
          const s = DOMAIN_STYLES[d] || DEFAULT_DOMAIN
          return (
            <span key={d} className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
              style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
              {d}
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

        {/* Card number */}
        {attrs.number && (
          <span className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ backgroundColor: '#1a1a24', border: '1px solid #d4c4a8', color: '#7a6248' }}>
            {attrs.number}
          </span>
        )}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          {attrs.energyCost != null && attrs.energyCost !== '' && (
            <StatChip label="Energy" value={attrs.energyCost} color="#ffe082" />
          )}
          {attrs.powerCost  != null && attrs.powerCost  !== '' && (
            <StatChip label="Power"  value={attrs.powerCost}  color="#80cbc4" />
          )}
          {attrs.might != null && attrs.might !== '' && (
            <StatChip label="Might"  value={attrs.might}      color="#ef5350" />
          )}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} isHtml={isHtml} />

    </div>
  )
}
