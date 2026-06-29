import { API_URL } from './config'

// Collection mutation endpoints. Each returns the raw fetch Response so callers
// can check `res.ok` and parse the body as needed.
// POST increments quantity; PATCH sets an absolute quantity; DELETE removes.

export function addToCollection(authFetch, { printingId, quantity, finish = 'normal', condition }) {
  return authFetch(`${API_URL}/api/users/me/collection`, {
    method: 'POST',
    body: JSON.stringify({
      printing_id: printingId,
      quantity,
      finish,
      ...(condition ? { condition } : {}),
    }),
  })
}

export function setCollectionQuantity(authFetch, printingId, { quantity, finish = 'normal' }) {
  return authFetch(`${API_URL}/api/users/me/collection/${printingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity, finish }),
  })
}

export function removeFromCollection(authFetch, printingId, finish = 'normal') {
  return authFetch(`${API_URL}/api/users/me/collection/${printingId}?finish=${finish}`, {
    method: 'DELETE',
  })
}
