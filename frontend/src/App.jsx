import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import GamesPage from './pages/GamesPage'

function Header() {
  const navigate = useNavigate()
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 cursor-pointer"
      onClick={() => navigate('/')}>
      <h1 className="text-2xl font-bold text-indigo-400">CCG Platform</h1>
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<GamesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App