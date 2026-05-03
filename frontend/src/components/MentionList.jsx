import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const TYPE_STYLES = {
  game: { bg: '#1a3a2a', color: '#6A7EFC' },
  set:  { bg: '#1a1a3a', color: '#a78bfa' },
  card: { bg: '#2a1a3a', color: '#f472b6' },
}

const MentionList = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  function selectItem(index) {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === 'ArrowUp') {
        setSelectedIndex(i => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex(i => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (!items.length) {
    return (
      <div className="px-3 py-2 text-sm" style={{ color: '#8e8e9e' }}>
        No results
      </div>
    )
  }

  return (
    <div style={{ minWidth: 220, maxWidth: 'min(360px, 90vw)' }}>
      {items.map((item, index) => {
        const ts = TYPE_STYLES[item.type] || TYPE_STYLES.card
        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => selectItem(index)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: index === selectedIndex ? '#42424e' : 'transparent',
              color: '#EDF2F6',
              borderBottom: index < items.length - 1 ? '1px solid #42424e' : 'none',
            }}
          >
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
              style={{ backgroundColor: ts.bg, color: ts.color }}
            >
              {item.type}
            </span>
            <span className="truncate text-sm">{item.name}</span>
            {item.subtitle && (
              <span className="text-xs flex-shrink-0 ml-auto" style={{ color: '#8e8e9e' }}>
                {item.subtitle}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})

MentionList.displayName = 'MentionList'
export default MentionList
