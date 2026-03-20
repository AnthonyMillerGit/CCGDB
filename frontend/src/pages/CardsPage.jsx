import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function CardsPage() {
  const { setId } = useParams()
  const [cards, setCards] = useState([])
  const [setInfo, setSetInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`http://localhost:8000/api/sets/${setId}/cards`)
      .then(r => r.json())
      .then(data => {
        setCards(data)
        setLoading(false)
      })
  }, [setId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Loading cards...</p>
    </div>
  )

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 flex items-center gap-1"
      >
        ← Back to Sets
      </button>

      <h2 className="text-3xl font-bold mb-1">Cards</h2>
      <p className="text-gray-400 mb-8">{cards.length} cards in this set</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => navigate(`/cards/${card.id}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 hover:scale-105 transition-all duration-200"
          >
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                className="w-full"
              />
            ) : (
              <div className="aspect-[2.5/3.5] bg-gray-800 flex items-center justify-center p-3">
                <span className="text-gray-400 text-sm text-center">{card.name}</span>
              </div>
            )}
            <div className="p-2">
              <p className="text-white text-xs font-medium truncate">{card.name}</p>
              <p className="text-gray-500 text-xs truncate">{card.rarity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}