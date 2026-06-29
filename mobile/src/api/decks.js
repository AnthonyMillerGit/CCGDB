import { API_URL } from './config'

// Deck-card mutation endpoints. Each returns the raw fetch Response.
// POST increments quantity; PATCH sets an absolute quantity; DELETE removes.

export function addCardToDeck(authFetch, deckId, { cardId, quantity }) {
  return authFetch(`${API_URL}/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId, quantity }),
  })
}

export function setDeckCardQuantity(authFetch, deckId, cardId, quantity) {
  return authFetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

export function removeCardFromDeck(authFetch, deckId, cardId) {
  return authFetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}`, {
    method: 'DELETE',
  })
}
