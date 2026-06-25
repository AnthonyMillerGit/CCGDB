import { useState } from 'react'
import TEXT_ICONS from '../../data/godzilla-texticons.json'

// ── Card colours (self-contained chips — readable on light & dark) ────────────
const COLOR_STYLES = {
  Red:   { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Blue:  { bg: '#0d1829', border: '#0d47a1', text: '#82b1ff' },
  Green: { bg: '#0d2010', border: '#2e7d32', text: '#a5d6a7' },
}

// ⁅…＠⁆ markers in rules text → icon images served from /public/texticons/godzilla.
const ICON_RE = /(⁅[^⁆]*⁆)/g

function ColorChip({ color }) {
  const s = COLOR_STYLES[color] || { bg: 'var(--bg-chip)', border: 'var(--border)', text: 'var(--text-muted)' }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {color}
    </span>
  )
}

function StatChip({ label, value, valueColor = 'var(--text-primary)' }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px]"
      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color: valueColor }}>{value}</span>
    </div>
  )
}

// Render rules text, swapping ⁅…＠⁆ markers for their icon images.
function RulesText({ text }) {
  if (!text) return null
  return (
    <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-panel)' }}>
      {text.split(ICON_RE).map((part, i) => {
        const file = TEXT_ICONS[part]
        if (file) {
          return (
            <img key={i} src={`/texticons/godzilla/${encodeURIComponent(file)}`} alt={part}
              title={part} className="inline-block align-middle"
              style={{ height: '1.3em', margin: '0 1px' }} />
          )
        }
        return part ? <span key={i}>{part}</span> : null
      })}
    </p>
  )
}

function Rulings({ faqs }) {
  const [open, setOpen] = useState(false)
  if (!faqs.length) return null
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-chip)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Rulings ({faqs.length})
        </span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          {faqs.map((f, i) => (
            <div key={f.id ?? i} className="pt-2" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Q. {f.question}</p>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-muted)' }}>A. {f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GodzillaCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const colors   = String(attrs.color || '').split('/').map(c => c.trim()).filter(Boolean)
  const traits   = [attrs.quality_1, attrs.quality_2, attrs.quality_3].filter(Boolean)
  const terms    = [attrs.term_1, attrs.term_2, attrs.term_3, attrs.term_4].filter(Boolean)
  const faqs     = Array.isArray(attrs.faqs) ? attrs.faqs : []
  const power    = attrs.treat_1 != null && attrs.treat_1 !== ''
    ? `${attrs.treat_1}${attrs.treat_2 && attrs.treat_2 !== attrs.treat_1 ? attrs.treat_2 : ''}`
    : null

  return (
    <div>
      {/* ── Card kind + colours ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {card.card_type && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {card.card_type}
          </span>
        )}
        {colors.map(c => <ColorChip key={c} color={c} />)}
      </div>

      {/* ── Stats: Grade / Step / Power ──────────────────────────────────── */}
      {(attrs.grade || attrs.step_icon || power) && (
        <div className="flex flex-wrap gap-3 mb-5">
          <StatChip label="Grade" value={attrs.grade} valueColor="var(--accent)" />
          <StatChip label="Step"  value={attrs.step_icon} />
          <StatChip label="Power" value={power} valueColor="#e53935" />
        </div>
      )}

      {/* ── Traits ───────────────────────────────────────────────────────── */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {traits.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* ── Rules text (with icon markers rendered) ──────────────────────── */}
      {card.rules_text && (
        <div className="rounded-lg border mb-3 p-4"
          style={{ borderColor: 'var(--border-panel)', backgroundColor: 'var(--bg-panel)' }}>
          <RulesText text={card.rules_text} />
        </div>
      )}

      {/* ── Terms (extra keyword conditions) ─────────────────────────────── */}
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {terms.map(t => (
            <span key={t} className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: '#1a2535', border: '1px solid #1565c0', color: '#90caf9' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* ── Rulings / FAQ ────────────────────────────────────────────────── */}
      <Rulings faqs={faqs} />

      {/* ── Source film / copyright ──────────────────────────────────────── */}
      {attrs.copyright && (
        <p className="text-xs italic mt-1" style={{ color: 'var(--text-muted)' }}>
          Source: {attrs.copyright}
        </p>
      )}
    </div>
  )
}
