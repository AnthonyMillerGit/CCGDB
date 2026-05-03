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
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
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
            backgroundColor: '#1f1f25',
            border: '1px solid #42424e',
            color: '#EDF2F6',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#6A7EFC', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 border max-h-80 overflow-y-auto"
          style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}
        >
          {suggestions.map((card, i) => (
            <div
              key={`${card.id}-${card.game_slug}`}
              onClick={() => handleSelect(card)}
              className="px-3 py-2 cursor-pointer flex items-center gap-3"
              style={{
                backgroundColor: i === activeIndex ? '#42424e' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {/* Card thumbnail */}
              <div
                className="rounded overflow-hidden flex-shrink-0"
                style={{
                  width: '36px',
                  height: '50px',
                  backgroundColor: '#1f1f25',
                  border: '1px solid #42424e',
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
                    <span style={{ color: '#42424e', fontSize: '16px' }}>🃏</span>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#EDF2F6' }}>
                  {card.name}
                </p>
                <p className="text-xs truncate" style={{ color: '#8e8e9e' }}>
                  {card.card_type || card.game}
                </p>
              </div>

              {/* Game badge */}
              <span
                className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  backgroundColor: '#1f1f25',
                  color: GAME_COLORS[card.game_slug] || '#8e8e9e'
                }}
              >
                {card.game_slug?.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}