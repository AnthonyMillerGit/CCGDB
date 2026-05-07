import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { GAME_COLORS } from '../theme'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`${API_URL}/api/search/suggestions?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
          setSuggestions(data)
          setShowSuggestions(true)
          setLoading(false)
        })
    }, 200)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (card) => {
    setQuery('')
    setShowSuggestions(false)
    setActiveIndex(-1)
    navigate(`/cards/${card.id}`)
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="relative w-48 sm:w-64 md:w-80 lg:w-[420px]">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder="Search cards..."
          className="w-full px-4 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: 'var(--bg-chip)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-50 border max-h-96 overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', minWidth: '420px', boxShadow: '0 8px 32px var(--shadow)' }}
        >
          {suggestions.map((card, i) => (
            <div
              key={`${card.id}-${card.game_slug}`}
              onClick={() => handleSelect(card)}
              className="px-4 py-2.5 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
              style={{
                backgroundColor: i === activeIndex ? 'var(--border)' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {/* Card thumbnail */}
              <div
                className="rounded overflow-hidden flex-shrink-0"
                style={{
                  width: '40px',
                  height: '56px',
                  backgroundColor: 'var(--bg-chip)',
                  border: '1px solid var(--border)',
                }}
              >
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span style={{ color: 'var(--border)', fontSize: '16px' }}>🃏</span>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {card.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {[card.card_type, card.set_name].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Game badge */}
              <span
                className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                style={{
                  backgroundColor: 'var(--bg-chip)',
                  color: GAME_COLORS[card.game_slug] || 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {card.game}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}