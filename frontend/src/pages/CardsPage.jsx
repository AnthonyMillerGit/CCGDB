import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

export default function CardsPage() {
  const { setId } = useParams()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/api/sets/${setId}/cards`)
      .then(r => r.json())
      .then(data => {
        setCards(data)
        setLoading(false)
      })
  }, [setId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8892a4' }}>Loading cards...</p>
    </div>
  )

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#08D9D6' }}
      >
        ← Back to Sets
      </button>

      <h2 className="text-3xl font-bold mb-1" style={{ color: '#EAEAEA' }}>Cards</h2>
      <p className="mb-8" style={{ color: '#8892a4' }}>{cards.length} cards in this set</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => navigate(`/cards/${card.id}`)}
            className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border"
            style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#08D9D6'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#363d52'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                className="w-full"
              />
            ) : (
              <div className="aspect-[2.5/3.5] flex items-center justify-center p-3"
                style={{ backgroundColor: '#363d52' }}>
                <span className="text-sm text-center" style={{ color: '#8892a4' }}>{card.name}</span>
              </div>
            )}
            <div className="p-2">
              <p className="text-xs font-medium truncate" style={{ color: '#EAEAEA' }}>{card.name}</p>
              <p className="text-xs" style={{ color: '#8892a4' }}>{card.rarity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}