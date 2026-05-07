// ── Aspect colours ────────────────────────────────────────────────────────────
const ASPECT_STYLES = {
  Heroism:    { bg: '#0d1f2e', border: '#1565c0', text: '#90caf9' },
  Villainy:   { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Command:    { bg: '#0d2010', border: '#2e7d32', text: '#a5d6a7' },
  Aggression: { bg: '#2e1200', border: '#bf360c', text: '#ffab91' },
  Cunning:    { bg: '#2a2000', border: '#f9a825', text: '#fff176' },
  Vigilance:  { bg: '#1a1a2e', border: '#4527a0', text: '#ce93d8' },
}
const DEFAULT_ASPECT = { bg: '#2a2a34', border: '#42424e', text: '#aaa' }

// ── Arena badge ───────────────────────────────────────────────────────────────
const ARENA_STYLES = {
  Ground: { bg: '#1a1a0d', border: '#827717', text: '#e6ee9c' },
  Space:  { bg: '#0d1829', border: '#0d47a1', text: '#82b1ff' },
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  if (value == null || value === '' || value === 'null') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Section block (rules text, back text, epic action) ───────────────────────
function TextBlock({ label, text, labelColor = '#8e8e9e' }) {
  if (!text) return null
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: '#3a3a44', backgroundColor: '#28282f' }}>
      {label && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: labelColor }}>{label}</span>
        </div>
      )}
      <div className={label ? 'px-3 pb-3' : 'p-4'}>
        <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#EDF2F6' }}>{text}</p>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SWUCardInfo({ card, flipped }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const aspects    = attrs.aspects    || []
  const traits     = attrs.traits     || []
  const arenas     = attrs.arenas     || []
  const keywords   = attrs.keywords   || []
  const cost       = attrs.cost
  const power      = attrs.power
  const hp         = attrs.hp
  const isUnique   = attrs.unique
  const doubleSided= attrs.double_sided
  const epicAction = attrs.epic_action
  const backText   = attrs.back_text

  const rulesText  = card.rules_text
  const isLeader   = cardType === 'Leader'
  const isBase     = cardType === 'Base'

  // Determine which face is showing
  const showingBack = flipped && doubleSided

  return (
    <div>

      {/* ── Type / unique line ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }}>
            {isUnique && '◆ '}{cardType}
          </span>
        )}
        {arenas.map(arena => {
          const style = ARENA_STYLES[arena] || { bg: '#2a2a34', border: '#42424e', text: '#aaa' }
          return (
            <span key={arena} className="text-xs font-semibold px-2.5 py-1 rounded"
              style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
              {arena}
            </span>
          )
        })}
      </div>

      {/* ── Aspect badges ────────────────────────────────────────────────── */}
      {aspects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {aspects.map(aspect => {
            const style = ASPECT_STYLES[aspect] || DEFAULT_ASPECT
            return (
              <span key={aspect} className="text-xs font-semibold px-2.5 py-1 rounded"
                style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                {aspect}
              </span>
            )
          })}
        </div>
      )}

      {/* ── Trait chips ──────────────────────────────────────────────────── */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {traits.map(trait => (
            <span key={trait} className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
              style={{ backgroundColor: '#22222a', border: '1px solid #32323c', color: '#8e8e9e' }}>
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      {!isBase && (cost != null || power != null || hp != null) && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #32323c' }}>
          <StatChip label="Cost"  value={cost}  color="#ffe082" />
          {!isLeader && <StatChip label="Power" value={power} color="#ef5350" />}
          {!isLeader && <StatChip label="HP"    value={hp}    color="#66bb6a" />}
          {isLeader  && <StatChip label="Power" value={power} color="#ef5350" />}
          {isLeader  && <StatChip label="HP"    value={hp}    color="#66bb6a" />}
        </div>
      )}

      {/* ── Keywords ─────────────────────────────────────────────────────── */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {keywords.map(kw => (
            <span key={kw} className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: '#1a2535', border: '1px solid #1565c0', color: '#90caf9' }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* ── Card text — show front or back depending on flip state ───────── */}
      {!showingBack && (
        <>
          {isLeader && epicAction
            ? <>
                <TextBlock text={rulesText} />
                <TextBlock label="Epic Action" text={epicAction} labelColor="#ffe082" />
              </>
            : <TextBlock text={rulesText} />
          }
        </>
      )}

      {showingBack && backText && (
        <TextBlock label="Deployed" text={backText} labelColor="#66bb6a" />
      )}

    </div>
  )
}
