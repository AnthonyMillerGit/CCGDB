import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function SetsPage() {
  const { slug } = useParams()
  const [sets, setSets] = useState([])
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:8000/api/games/${slug}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/games/${slug}/sets`).then(r => r.json())
    ]).then(([gameData, setsData]) => {
      setGame(gameData)
      setSets(setsData)
      setLoading(false)
    })
  }, [slug])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Loading sets...</p>
    </div>
  )

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 flex items-center gap-1"
      >
        ← Back to Games
      </button>
      <h2 className="text-3xl font-bold mb-1">{game?.name}</h2>
      <p className="text-gray-400 mb-8">{sets.length} sets</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map(set => (
          <div
            key={set.id}
            onClick={() => navigate(`/sets/${set.id}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-indigo-500 hover:bg-gray-800 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-1">
              {set.icon_url && (
                <img
                  src={set.icon_url}
                  alt={set.name}
                  className="w-8 h-8 invert opacity-70"
                />
              )}
              <h3 className="text-lg font-semibold text-white">{set.name}</h3>
              </div>
            <div className="mt-3">
                <span className="text-gray-500 text-sm">
                    Released: {set.release_date?.split('T')[0] ?? 'Unknown'}
                </span>
            </div>
            <div className="mt-2">
              <span className="text-indigo-400 text-sm">{set.total_cards} cards</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}