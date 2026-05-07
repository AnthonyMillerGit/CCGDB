import { EnergySymbol, EnergyCost } from '../PokemonEnergy'

// ── Stage / subtype badge styles ──────────────────────────────────────────────
const SUBTYPE_STYLES = {
  'Basic':         { bg: 'var(--bg-chip)', border: 'var(--border)',  text: 'var(--text-muted)' },
  'Stage 1':       { bg: '#0d2010', border: '#2e7d32',  text: '#a5d6a7' },
  'Stage 2':       { bg: '#0d1b2e', border: '#1565c0',  text: '#90caf9' },
  'V':             { bg: '#1e0d2e', border: '#7b1fa2',  text: '#ce93d8' },
  'VMAX':          { bg: '#2a1a00', border: '#e65100',  text: '#ffcc80' },
  'VSTAR':         { bg: '#2a2000', border: '#f9a825',  text: '#fff176' },
  'GX':            { bg: '#0d2a25', border: '#00796b',  text: '#80cbc4' },
  'EX':            { bg: '#2a1500', border: '#bf360c',  text: '#ffab91' },
  'ex':            { bg: '#2e0d0d', border: '#b71c1c',  text: '#ef9a9a' },
  'Mega':          { bg: '#1a0d2e', border: '#4a148c',  text: '#ea80fc' },
  'TAG TEAM':      { bg: '#251520', border: '#880e4f',  text: '#f48fb1' },
  'Prism Star':    { bg: '#25200d', border: '#f57f17',  text: '#ffe082' },
  'Radiant':       { bg: '#1a2535', border: '#0288d1',  text: '#81d4fa' },
  'ACE SPEC':      { bg: '#2a1a0d', border: '#ef6c00',  text: '#ffcc80' },
  'Item':          { bg: '#1a2a1a', border: '#388e3c',  text: '#a5d6a7' },
  'Supporter':     { bg: '#2a2010', border: '#f57f17',  text: '#ffe082' },
  'Stadium':       { bg: '#0d2a25', border: '#00695c',  text: '#80cbc4' },
  'Pokémon Tool':  { bg: '#2a1500', border: '#6d4c41',  text: '#bcaaa4' },
  'Technical Machine': { bg: '#1a1a2e', border: '#303f9f', text: '#9fa8da' },
  'Trainer':       { bg: 'var(--bg-chip)', border: 'var(--border)',  text: 'var(--text-muted)' },
  'Special':       { bg: '#251520', border: '#880e4f',  text: '#f48fb1' },
  'Basic Energy':  { bg: 'var(--bg-chip)', border: 'var(--border)',  text: 'var(--text-muted)' },
}
const DEFAULT_SUBTYPE = { bg: 'var(--bg-chip)', border: 'var(--border)', text: 'var(--text-muted)' }

// Stage subtypes shown as the primary badge; others shown as secondary chips
const STAGE_TYPES = new Set(['Basic','Stage 1','Stage 2','VMAX','VSTAR','V','GX','EX','ex',
  'Mega','TAG TEAM','Prism Star','Radiant','ACE SPEC'])
const TRAINER_TYPES = new Set(['Item','Supporter','Stadium','Pokémon Tool','Technical Machine','Trainer'])

// ── Ability block ─────────────────────────────────────────────────────────────
function AbilityBlock({ ability }) {
  return (
    <div className="mb-3 rounded-lg overflow-hidden border" style={{ borderColor: '#c62828' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: '#3a1212' }}>
        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: '#c62828', color: '#fff' }}>
          {ability.type || 'Ability'}
        </span>
        <span className="font-bold text-sm" style={{ color: '#fde0e0' }}>{ability.name}</span>
      </div>
      {ability.text && (
        <div className="px-3 py-2" style={{ backgroundColor: '#2a1a1a' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#ccc' }}>{ability.text}</p>
        </div>
      )}
    </div>
  )
}

// ── Attack block ──────────────────────────────────────────────────────────────
function AttackBlock({ attack }) {
  return (
    <div className="mb-2 rounded-lg border px-3 py-2.5" style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <EnergyCost cost={attack.cost} />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{attack.name}</span>
        </div>
        {attack.damage && (
          <span className="font-bold text-xl ml-2 flex-shrink-0" style={{ color: '#90caf9' }}>{attack.damage}</span>
        )}
      </div>
      {attack.text && (
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{attack.text}</p>
      )}
    </div>
  )
}

// ── Combat stats footer (weakness / resistance / retreat) ─────────────────────
function CombatStats({ attrs }) {
  const hasWeakness   = attrs.weaknesses?.length > 0
  const hasResistance = attrs.resistances?.length > 0
  const hasRetreat    = attrs.retreatCost?.length > 0
  if (!hasWeakness && !hasResistance && !hasRetreat) return null

  return (
    <div className="flex flex-wrap gap-5 px-4 py-3 rounded-lg mt-3"
      style={{ backgroundColor: '#22222a', border: '1px solid var(--border)' }}>
      {hasWeakness && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Weakness</span>
          {attrs.weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <EnergySymbol type={w.type} size="sm" />
              <span className="text-xs font-bold" style={{ color: '#ef9a9a' }}>{w.value}</span>
            </div>
          ))}
        </div>
      )}
      {hasResistance && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Resist</span>
          {attrs.resistances.map((r, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <EnergySymbol type={r.type} size="sm" />
              <span className="text-xs font-bold" style={{ color: '#a5d6a7' }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {hasRetreat && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Retreat</span>
          <div className="flex gap-0.5">
            {attrs.retreatCost.map((t, i) => <EnergySymbol key={i} type={t} size="sm" />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Legality row ──────────────────────────────────────────────────────────────
function LegalityRow({ legalities }) {
  if (!legalities) return null
  const entries = Object.entries(legalities).filter(([, v]) => v)
  if (!entries.length) return null
  return (
    <div className="mt-5 mb-2">
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Legality</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([format, status]) => {
          const legal = status === 'Legal'
          return (
            <span key={format} className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: legal ? '#0d2010' : '#2e0d0d',
                border: `1px solid ${legal ? '#2e7d3255' : '#b71c1c55'}`,
                color: legal ? '#66a06a' : '#ef9a9a',
              }}>
              {format.charAt(0).toUpperCase() + format.slice(1)}: {status}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function PokemonCardInfo({ attrs, rulesText, cardType }) {
  const isPokemon  = cardType === 'Pokémon'
  const isEnergy   = cardType === 'Energy'
  const subtypes   = attrs.subtypes || []

  const stageType    = subtypes.find(s => STAGE_TYPES.has(s))
  const trainerType  = subtypes.find(s => TRAINER_TYPES.has(s))
  const otherSubtypes = subtypes.filter(s => !STAGE_TYPES.has(s) && !TRAINER_TYPES.has(s))

  return (
    <div>

      {/* ── Identity row: stage badge + evolves-from chip ─────────────────── */}
      {(stageType || trainerType || otherSubtypes.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(stageType || trainerType) && (() => {
            const key   = stageType || trainerType
            const style = SUBTYPE_STYLES[key] || DEFAULT_SUBTYPE
            return (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
                style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                {key}
              </span>
            )
          })()}
          {attrs.evolvesFrom && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-panel)' }}>
              Evolves from <span style={{ color: 'var(--text-primary)' }}>{attrs.evolvesFrom}</span>
            </span>
          )}
          {otherSubtypes.map(s => {
            const style = SUBTYPE_STYLES[s] || DEFAULT_SUBTYPE
            return (
              <span key={s} className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                {s}
              </span>
            )
          })}
        </div>
      )}

      {/* ── Pokémon stats: HP + type + level + pokédex # ──────────────────── */}
      {isPokemon && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 pb-4"
          style={{ borderBottom: '1px solid #faf6ee' }}>
          {attrs.hp && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>HP</span>
              <span className="text-3xl font-extrabold leading-none" style={{ color: '#ef5350' }}>{attrs.hp}</span>
            </div>
          )}
          {attrs.types?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Type</span>
              <div className="flex gap-1">
                {attrs.types.map(t => <EnergySymbol key={t} type={t} size="md" />)}
              </div>
            </div>
          )}
          {attrs.level && (
            <div className="flex items-baseline gap-1">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Lv.</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{attrs.level}</span>
            </div>
          )}
          {attrs.nationalPokedexNumbers?.length > 0 && (
            <span className="text-xs font-mono" style={{ color: '#555' }}>
              №&nbsp;{attrs.nationalPokedexNumbers.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* ── Trainer rules text ─────────────────────────────────────────────── */}
      {!isPokemon && rulesText && (
        <div className="rounded-lg p-4 mb-4 border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-panel)' }}>
            {rulesText}
          </p>
        </div>
      )}

      {/* ── Abilities ─────────────────────────────────────────────────────── */}
      {attrs.abilities?.length > 0 && (
        <div className="mb-3">
          {attrs.abilities.map((ability, i) => <AbilityBlock key={i} ability={ability} />)}
        </div>
      )}

      {/* ── Attacks ───────────────────────────────────────────────────────── */}
      {attrs.attacks?.length > 0 && (
        <div className="mb-2">
          {attrs.attacks.map((attack, i) => <AttackBlock key={i} attack={attack} />)}
        </div>
      )}

      {/* ── Weakness / Resistance / Retreat ───────────────────────────────── */}
      {isPokemon && <CombatStats attrs={attrs} />}

      {/* ── Legality ──────────────────────────────────────────────────────── */}
      {!isEnergy && <LegalityRow legalities={attrs.legalities} />}

    </div>
  )
}
