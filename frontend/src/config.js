export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function goToRandomCard(navigate) {
  try {
    const res = await fetch(`${API_URL}/api/cards/random-one`)
    const data = await res.json()
    if (data.id) navigate(`/cards/${data.id}`)
  } catch {}
}
