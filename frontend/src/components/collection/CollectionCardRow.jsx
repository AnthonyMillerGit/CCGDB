import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { rarityColor } from '../../theme'

export const CONDITION_LABELS = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DM: 'Damaged' }
export const CONDITION_COLORS = { NM: '#4ade80', LP: '#a3e635', MP: '#facc15', HP: '#fb923c', DM: '#f87171' }
export const FINISHES = ['normal', 'foil', 'special foil']

export function QuantityControl({ quantity, onIncrease, onDecrease, onSet, finish }) {
  const [val, setVal] = useState(String(quantity))
  useEffect(() => { setVal(String(quantity)) }, [quantity])
  const isFoil = finish && finish !== 'normal'

  function commit() {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0 && n !== quantity) onSet(n)
    else setVal(String(quantity))
  }

  return (
    <div className="flex items-center justify-center gap-1 w-full">
      {isFoil && <span className="foil-rainbow" style={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}>◆</span>}
      <input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="text-xs font-medium text-center rounded"
        style={{ width: '2rem', backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)' }}
      />
      <button
        onClick={e => { e.preventDefault(); onIncrease() }}
        className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >+</button>
      <button
        onClick={e => { e.preventDefault(); onDecrease() }}
        className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', color: '#e05c5c', border: '1px solid var(--border)' }}
      >−</button>
    </div>
  )
}

export function ListCardRow({ group, gameSlug, onIncrease, onDecrease, onSet, editMode, onFinishChange, onConditionChange }) {
  const [preview, setPreview] = useState(false)
  return (
    <div className="relative flex flex-col gap-1 px-1.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${editMode ? 'var(--accent)' : 'var(--border)'}` }}>
      {preview && group.image_url && (
        <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}>
          <img src={group.image_url} alt={group.card_name} className="rounded-lg" style={{ width: '160px' }} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Link
          to={`/collection/${gameSlug}/cards/${group.card_id}`}
          className="flex-1 min-w-0"
          onMouseEnter={() => setPreview(true)}
          onMouseLeave={() => setPreview(false)}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate" style={{ color: 'var(--text-primary)', fontSize: '0.7rem', fontWeight: 500 }} title={group.card_name}>{group.card_name}</span>
            {group.rarity && (
              <span className="shrink-0 capitalize" style={{ color: rarityColor(group.rarity, gameSlug), fontSize: '0.65rem' }}>· {group.rarity}</span>
            )}
          </div>
        </Link>
        <div className="flex flex-col gap-0.5 shrink-0">
          {group.items.map(item => (
            <QuantityControl
              key={item.finish}
              quantity={item.quantity}
              finish={item.finish}
              onIncrease={() => onIncrease(item)}
              onDecrease={() => onDecrease(item)}
              onSet={n => onSet(item, n)}
            />
          ))}
        </div>
      </div>
      {editMode && group.items.map(item => {
        const condColor = CONDITION_COLORS[item.condition] || CONDITION_COLORS.NM
        return (
          <div key={item.finish} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', minWidth: '2.5rem' }}>
              {item.finish === 'normal' ? 'Normal' : item.finish === 'foil' ? '✦ Foil' : '✦ Spec.'}
            </span>
            <select
              value={item.finish}
              onChange={e => onFinishChange(item, e.target.value)}
              className="text-xs px-1.5 py-1.5 rounded capitalize"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', flex: 1 }}
            >
              {FINISHES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={item.condition || 'NM'}
              onChange={e => onConditionChange(item, e.target.value)}
              className="text-xs px-1.5 py-1.5 rounded font-medium"
              style={{ backgroundColor: 'var(--bg-chip)', border: `1px solid ${condColor}55`, color: condColor, outline: 'none', flex: 1 }}
            >
              {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{val} — {label}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
