import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import GamesPage from './pages/GamesPage'
import SetsPage from './pages/SetsPage'
import CardsPage from './pages/CardsPage'
import CardDetailPage from './pages/CardDetailPage'
import SearchBar from './components/SearchBar'

function Header() {
  const navigate = useNavigate()
  return (
    <header
      className="border-b px-6 py-4 flex items-center justify-between"
      style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
    >
      <h1
        className="text-2xl font-bold cursor-pointer"
        style={{ color: '#08D9D6' }}
        onClick={() => navigate('/')}
      >
        CCG Platform
      </h1>
      <SearchBar />
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: '#252A34', color: '#EAEAEA' }}>
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<GamesPage />} />
            <Route path="/games/:slug" element={<SetsPage />} />
            <Route path="/sets/:setId" element={<CardsPage />} />
            <Route path="/cards/:cardId" element={<CardDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App