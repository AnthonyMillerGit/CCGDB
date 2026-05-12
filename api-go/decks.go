package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (a *App) getDeckOrForbid(w http.ResponseWriter, r *http.Request, deckID, userID int) (*DeckDetail, bool) {
	var d DeckDetail
	err := a.db.QueryRow(r.Context(),
		"SELECT id, user_id, game_id, name, COALESCE(description, ''), format, thumbnail_card_id FROM decks WHERE id = $1",
		deckID,
	).Scan(&d.ID, &d.UserID, &d.GameID, &d.Name, &d.Description, &d.Format, &d.ThumbnailCardID)
	if err != nil {
		jsonError(w, "Deck not found", http.StatusNotFound)
		return nil, false
	}
	if d.UserID != userID {
		jsonError(w, "Not your deck", http.StatusForbidden)
		return nil, false
	}
	return &d, true
}

func (a *App) listDecks(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	rows, err := a.db.Query(r.Context(), `
		SELECT d.id, d.name, COALESCE(d.description, ''), d.format, d.created_at, d.updated_at,
		       g.id AS game_id, g.name AS game_name, g.slug AS game_slug,
		       COUNT(dc.id) AS card_count,
		       COALESCE(SUM(dc.quantity), 0) AS total_cards,
		       (
		         SELECT p.image_url FROM deck_cards dc2
		         JOIN printings p ON p.card_id = dc2.card_id AND p.image_url IS NOT NULL
		         WHERE dc2.deck_id = d.id
		         ORDER BY CASE WHEN dc2.card_id = d.thumbnail_card_id THEN 0 ELSE 1 END, dc2.id LIMIT 1
		       ) AS thumbnail_url
		FROM decks d
		JOIN games g ON g.id = d.game_id
		LEFT JOIN deck_cards dc ON dc.deck_id = d.id
		WHERE d.user_id = $1
		GROUP BY d.id, g.id
		ORDER BY d.updated_at DESC
	`, user.ID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	decks := []DeckSummary{}
	for rows.Next() {
		var d DeckSummary
		if err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.Format, &d.CreatedAt, &d.UpdatedAt,
			&d.GameID, &d.GameName, &d.GameSlug, &d.CardCount, &d.TotalCards, &d.ThumbnailURL); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		d.ThumbnailURL = a.imgURL(d.ThumbnailURL)
		decks = append(decks, d)
	}
	jsonResponse(w, decks, http.StatusOK)
}

func (a *App) createDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	var body CreateDeckRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var exists bool
	a.db.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM games WHERE id = $1)", body.GameID).Scan(&exists)
	if !exists {
		jsonError(w, "Game not found", http.StatusNotFound)
		return
	}

	type Result struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		GameID      int    `json:"game_id"`
	}
	var result Result
	err := a.db.QueryRow(r.Context(), `
		INSERT INTO decks (user_id, game_id, name, description, format)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, description, game_id
	`, user.ID, body.GameID, strings.TrimSpace(body.Name), body.Description, body.Format,
	).Scan(&result.ID, &result.Name, &result.Description, &result.GameID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, result, http.StatusCreated)
}

func (a *App) getDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}

	deck, ok := a.getDeckOrForbid(w, r, deckID, user.ID)
	if !ok {
		return
	}

	// Fetch game info
	a.db.QueryRow(r.Context(),
		"SELECT name, slug FROM games WHERE id = $1", deck.GameID,
	).Scan(&deck.GameName, &deck.GameSlug)

	rows, err := a.db.Query(r.Context(), `
		SELECT dc.id, dc.card_id, dc.quantity,
		       c.name AS card_name, c.card_type, c.attributes,
		       g.name AS game_name, g.slug AS game_slug,
		       p.image_url
		FROM deck_cards dc
		JOIN cards c ON c.id = dc.card_id
		JOIN games g ON g.id = c.game_id
		LEFT JOIN LATERAL (
		    SELECT image_url FROM printings
		    WHERE card_id = c.id AND image_url IS NOT NULL
		    ORDER BY id LIMIT 1
		) p ON TRUE
		WHERE dc.deck_id = $1
		ORDER BY c.card_type, c.name
	`, deckID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	deck.Cards = []DeckCard{}
	for rows.Next() {
		var c DeckCard
		if err := rows.Scan(&c.ID, &c.CardID, &c.Quantity,
			&c.CardName, &c.CardType, &c.Attributes,
			&c.GameName, &c.GameSlug, &c.ImageURL); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		c.ImageURL = a.imgURL(c.ImageURL)
		deck.Cards = append(deck.Cards, c)
	}
	jsonResponse(w, deck, http.StatusOK)
}

func (a *App) updateDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}

	if _, ok := a.getDeckOrForbid(w, r, deckID, user.ID); !ok {
		return
	}

	var body UpdateDeckRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Name != nil {
		a.db.Exec(r.Context(), "UPDATE decks SET name = $1, updated_at = NOW() WHERE id = $2",
			strings.TrimSpace(*body.Name), deckID)
	}
	if body.Description != nil {
		a.db.Exec(r.Context(), "UPDATE decks SET description = $1, updated_at = NOW() WHERE id = $2",
			*body.Description, deckID)
	}
	if body.Format != nil {
		a.db.Exec(r.Context(), "UPDATE decks SET format = $1, updated_at = NOW() WHERE id = $2",
			*body.Format, deckID)
	}
	if body.ThumbnailCardID != nil {
		a.db.Exec(r.Context(), "UPDATE decks SET thumbnail_card_id = $1, updated_at = NOW() WHERE id = $2",
			*body.ThumbnailCardID, deckID)
	}
	jsonResponse(w, map[string]string{"message": "Deck updated"}, http.StatusOK)
}

func (a *App) deleteDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}
	if _, ok := a.getDeckOrForbid(w, r, deckID, user.ID); !ok {
		return
	}
	a.db.Exec(r.Context(), "DELETE FROM decks WHERE id = $1", deckID)
	w.WriteHeader(http.StatusNoContent)
}

type deckCardResult struct {
	ID       int `json:"id"`
	CardID   int `json:"card_id"`
	Quantity int `json:"quantity"`
}

func (a *App) addCardToDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}

	deck, ok := a.getDeckOrForbid(w, r, deckID, user.ID)
	if !ok {
		return
	}

	var body DeckCardRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if body.Quantity <= 0 {
		body.Quantity = 1
	}

	var cardGameID int
	err = a.db.QueryRow(r.Context(), "SELECT game_id FROM cards WHERE id = $1", body.CardID).Scan(&cardGameID)
	if err != nil {
		jsonError(w, "Card not found", http.StatusNotFound)
		return
	}
	if cardGameID != deck.GameID {
		jsonError(w, "Card does not belong to this deck's game", http.StatusBadRequest)
		return
	}

	var result deckCardResult
	err = a.db.QueryRow(r.Context(), `
		INSERT INTO deck_cards (deck_id, card_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (deck_id, card_id)
		DO UPDATE SET quantity = deck_cards.quantity + EXCLUDED.quantity
		RETURNING id, card_id, quantity
	`, deckID, body.CardID, body.Quantity,
	).Scan(&result.ID, &result.CardID, &result.Quantity)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	a.db.Exec(r.Context(), "UPDATE decks SET updated_at = NOW() WHERE id = $1", deckID)
	jsonResponse(w, result, http.StatusCreated)
}

func (a *App) updateDeckCard(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}
	cardID, err := parseIntParam(r, "cardID")
	if err != nil {
		jsonError(w, "Invalid card ID", http.StatusBadRequest)
		return
	}

	if _, ok := a.getDeckOrForbid(w, r, deckID, user.ID); !ok {
		return
	}

	var body DeckCardUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var result deckCardResult
	err = a.db.QueryRow(r.Context(), `
		UPDATE deck_cards SET quantity = $1
		WHERE deck_id = $2 AND card_id = $3
		RETURNING id, card_id, quantity
	`, body.Quantity, deckID, cardID,
	).Scan(&result.ID, &result.CardID, &result.Quantity)
	if err != nil {
		jsonError(w, "Card not in deck", http.StatusNotFound)
		return
	}
	a.db.Exec(r.Context(), "UPDATE decks SET updated_at = NOW() WHERE id = $1", deckID)
	jsonResponse(w, result, http.StatusOK)
}

func (a *App) copyDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}
	source, ok := a.getDeckOrForbid(w, r, deckID, user.ID)
	if !ok {
		return
	}

	var newID int
	err = a.db.QueryRow(r.Context(), `
		INSERT INTO decks (user_id, game_id, name, description, format)
		VALUES ($1, $2, $3, $4, $5) RETURNING id
	`, user.ID, source.GameID, source.Name+" (Copy)", source.Description, source.Format,
	).Scan(&newID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}

	_, err = a.db.Exec(r.Context(), `
		INSERT INTO deck_cards (deck_id, card_id, quantity)
		SELECT $1, card_id, quantity FROM deck_cards WHERE deck_id = $2
	`, newID, deckID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]any{"id": newID}, http.StatusCreated)
}

func (a *App) removeCardFromDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	deckID, err := parseIntParam(r, "deckID")
	if err != nil {
		jsonError(w, "Invalid deck ID", http.StatusBadRequest)
		return
	}
	cardID, err := parseIntParam(r, "cardID")
	if err != nil {
		jsonError(w, "Invalid card ID", http.StatusBadRequest)
		return
	}

	if _, ok := a.getDeckOrForbid(w, r, deckID, user.ID); !ok {
		return
	}
	a.db.Exec(r.Context(), "DELETE FROM deck_cards WHERE deck_id = $1 AND card_id = $2", deckID, cardID)
	a.db.Exec(r.Context(), "UPDATE decks SET updated_at = NOW() WHERE id = $1", deckID)
	w.WriteHeader(http.StatusNoContent)
}
