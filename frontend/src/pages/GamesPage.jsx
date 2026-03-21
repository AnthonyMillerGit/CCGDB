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
      <p style={{ color: '#8892a4' }} className="text-lg">Loading games...</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2" style={{ color: '#EAEAEA' }}>Games</h2>
      <p className="mb-8" style={{ color: '#8892a4' }}>Select a game to browse cards</p>
      <div className="flex flex-wrap gap-6">
        {games.map(game => (
          <div
            key={game.id}
            onClick={() => navigate(`/games/${game.slug}`)}
            className="cursor-pointer hover:scale-105 transition-all duration-200 flex flex-col items-center w-36"
          >
            <div
              className="w-full rounded-lg px-2 py-1 mb-2 text-center border"
              style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
            >
              <h3 className="text-xs font-bold leading-tight" style={{ color: '#EAEAEA' }}>
                {game.name}
              </h3>
            </div>
            <div
              className="w-full rounded-xl overflow-hidden border transition-all duration-200"
              style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
            >
              {game.card_back_image ? (
                <img
                  src={game.card_back_image}
                  alt={game.name}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="w-full aspect-[2.5/3.5] flex items-center justify-center"
                  style={{ backgroundColor: '#363d52' }}>
                  <span className="text-xs" style={{ color: '#8892a4' }}>No image</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}