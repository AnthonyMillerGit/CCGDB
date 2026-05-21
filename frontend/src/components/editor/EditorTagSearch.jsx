import { useState, useEffect, useRef } from 'react'

export default function EditorTagSearch({ label, searchUrl, selected, onAdd, onRemove, displayKey, idKey }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetch(`${searchUrl}${encodeURIComponent(query)}`).then(r => r.json())
        setResults(Array.isArray(data) ? data.slice(0, 10) : [])
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, searchUrl])

  return (
    <div>
      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(item => (
          <span key={item[idKey]} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
            {item[displayKey]}
            <button type="button" onClick={() => onRemove(item[idKey])} className="ml-1 opacity-60 hover:opacity-100" style={{ color: 'var(--accent-maroon)' }}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full px-3 py-1.5 rounded text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10 py-1 max-h-48 overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {results.map(item => (
              <button key={item[idKey] ?? item.id} type="button"
                onMouseDown={() => { onAdd(item); setQuery(''); setResults([]); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
