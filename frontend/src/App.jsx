import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-400">CCG Platform</h1>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-3xl font-bold mb-2">Welcome</h2>
          <p className="text-gray-400">Your collectible card game database</p>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App