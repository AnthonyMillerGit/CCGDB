import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('http://localhost:8000/api/games')
      .then(res => res.json())
      .then(data => {
        setGames(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Loading games...</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Games</h2>
      <p className="text-gray-400 mb-8">Select a game to browse cards</p>
      <div className="flex flex-wrap gap-6">
        {games.map(game => (
          <div
            key={game.id}
            onClick={() => navigate(`/games/${game.slug}`)}
            className="cursor-pointer hover:scale-105 transition-all duration-200 flex flex-col items-center w-36"
          >
            {/* Title box */}
            <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 mb-2 text-center">
              <h3 className="text-xs font-bold text-white leading-tight">{game.name}</h3>
            </div>

            {/* Card image box */}
            <div className="w-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500 transition-all duration-200">
              {game.card_back_image ? (
                <img
                  src={game.card_back_image}
                  alt={game.name}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="w-full aspect-[2.5/3.5] bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">No image</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}