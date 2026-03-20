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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map(game => (
          <div
            key={game.id}
            onClick={() => navigate(`/games/${game.slug}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-indigo-500 hover:bg-gray-800 transition-all duration-200"
          >
            <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
            <p className="text-gray-400 text-sm">{game.description}</p>
            <div className="mt-4">
              <span className="text-indigo-400 text-sm font-medium">Browse cards →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}