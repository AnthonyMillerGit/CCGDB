import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const TYPE_STYLES = {
  game: { bg: '#1a3a2a', color: '#08D9D6' },
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
      <div className="px-3 py-2 text-sm" style={{ color: '#8892a4' }}>
        No results
      </div>
    )
  }

  return (
    <div style={{ minWidth: 260, maxWidth: 360 }}>
      {items.map((item, index) => {
        const ts = TYPE_STYLES[item.type] || TYPE_STYLES.card
        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => selectItem(index)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: index === selectedIndex ? '#363d52' : 'transparent',
              color: '#EAEAEA',
              borderBottom: index < items.length - 1 ? '1px solid #363d52' : 'none',
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
              <span className="text-xs flex-shrink-0 ml-auto" style={{ color: '#8892a4' }}>
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
