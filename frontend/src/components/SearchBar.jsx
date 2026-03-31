import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

const GAME_COLORS = {
  mtg: '#08D9D6',
  pokemon: '#FFCC00',
  yugioh: '#8844FF',
  startrek_1e: '#4B9CD3',  // Starfleet blue
}

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

    // Debounce the search
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
    <div className="relative" style={{ width: '320px' }}>
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
            backgroundColor: '#1a1f2e',
            border: '1px solid #363d52',
            color: '#EAEAEA',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#08D9D6', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 border"
          style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
        >
          {suggestions.map((card, i) => (
            <div
              key={`${card.id}-${card.game_slug}`}
              onClick={() => handleSelect(card)}
              className="px-4 py-2 cursor-pointer flex items-center justify-between"
              style={{
                backgroundColor: i === activeIndex ? '#363d52' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#EAEAEA' }}>
                  {card.name}
                </p>
                <p className="text-xs" style={{ color: '#8892a4' }}>
                  {card.card_type}
                </p>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: '#1a1f2e',
                  color: GAME_COLORS[card.game_slug] || '#8892a4'
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