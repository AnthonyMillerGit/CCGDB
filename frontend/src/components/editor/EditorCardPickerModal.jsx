import { useState, useRef, useEffect } from 'react'
import { API_URL } from '../../config'

export default function EditorCardPickerModal({ onInsert, onClose }) {
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('')
  const [games, setGames] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/api/games`).then(r => r.json()).then(d => setGames(Array.isArray(d) ? d : []))
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(query)}${game ? `&game=${game}` : ''}`
        const data = await fetch(url).then(r => r.json())
        const seen = new Set()
        const deduped = (Array.isArray(data) ? data : []).filter(c => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
        setResults(deduped.slice(0, 24))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, game])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Insert Card Image</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        <div className="flex gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search card name…"
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select value={game} onChange={e => setGame(e.target.value)}
            className="px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)', maxWidth: 160 }}>
            <option value="">All games</option>
            {games.map(g => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Searching…</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No cards found.</p>
          )}
          {!loading && query.length < 2 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Type at least 2 characters to search.</p>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {results.map(card => (
              <button
                key={`${card.id}-${card.printing_id}`}
                type="button"
                onClick={() => onInsert({
                  cardId: card.id,
                  cardName: card.name,
                  imageUrl: card.image_url || null,
                  cardUrl: `/cards/${card.id}`,
                })}
                className="flex flex-col items-center gap-1 rounded-lg p-1 transition-opacity hover:opacity-80"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-chip)' }}
                title={card.name}
              >
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} className="w-full rounded" style={{ aspectRatio: '5/7', objectFit: 'cover' }} />
                ) : (
                  <div className="w-full rounded flex items-center justify-center p-2 text-xs text-center" style={{ aspectRatio: '5/7', backgroundColor: '#2e2e38', color: 'var(--text-muted)' }}>
                    {card.name}
                  </div>
                )}
                <span className="text-xs truncate w-full text-center" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                  {card.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
