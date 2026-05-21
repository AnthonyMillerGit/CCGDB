export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function goToRandomCard(navigate) {
  try {
    const res = await fetch(`${API_URL}/api/cards/random-one`)
    if (!res.ok) return
    const data = await res.json()
    if (data.id) navigate(`/cards/${data.id}`)
  } catch (err) {
    console.error('goToRandomCard:', err)
  }
}
