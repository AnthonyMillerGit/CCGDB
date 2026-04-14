package main

import (
	"encoding/json"
	"net/http"
)

func (a *App) getCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	rows, err := a.db.Query(r.Context(), `
		SELECT
		    uc.id, uc.printing_id, uc.quantity, uc.added_at,
		    p.image_url, p.rarity, p.collector_number,
		    c.id AS card_id, c.name AS card_name,
		    s.id AS set_id, s.name AS set_name,
		    g.id AS game_id, g.name AS game_name, g.slug AS game_slug
		FROM user_collections uc
		JOIN printings p ON p.id = uc.printing_id
		JOIN cards c ON c.id = p.card_id
		JOIN sets s ON s.id = p.set_id
		JOIN games g ON g.id = c.game_id
		WHERE uc.user_id = $1
		ORDER BY g.name, s.name, c.name
	`, user.ID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	gamesMap := make(map[int]*CollectionGroup)
	var gameOrder []int

	for rows.Next() {
		var (
			card    CollectionCard
			gameID  int
			gameName, gameSlug string
		)
		if err := rows.Scan(
			&card.ID, &card.PrintingID, &card.Quantity, &card.AddedAt,
			&card.ImageURL, &card.Rarity, &card.CollectorNumber,
			&card.CardID, &card.CardName,
			&card.SetID, &card.SetName,
			&gameID, &gameName, &gameSlug,
		); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if _, ok := gamesMap[gameID]; !ok {
			gamesMap[gameID] = &CollectionGroup{
				GameID:   gameID,
				GameName: gameName,
				GameSlug: gameSlug,
				Cards:    []CollectionCard{},
			}
			gameOrder = append(gameOrder, gameID)
		}
		gamesMap[gameID].Cards = append(gamesMap[gameID].Cards, card)
	}

	result := make([]CollectionGroup, 0, len(gameOrder))
	for _, gid := range gameOrder {
		result = append(result, *gamesMap[gid])
	}
	jsonResponse(w, result, http.StatusOK)
}

func (a *App) addToCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	var body CollectionAddRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if body.Quantity <= 0 {
		body.Quantity = 1
	}

	var exists bool
	a.db.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM printings WHERE id = $1)", body.PrintingID).Scan(&exists)
	if !exists {
		jsonError(w, "Printing not found", http.StatusNotFound)
		return
	}

	var item CollectionItem
	err := a.db.QueryRow(r.Context(), `
		INSERT INTO user_collections (user_id, printing_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, printing_id)
		DO UPDATE SET quantity = user_collections.quantity + EXCLUDED.quantity
		RETURNING id, printing_id, quantity, added_at
	`, user.ID, body.PrintingID, body.Quantity,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.AddedAt)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, item, http.StatusCreated)
}

func (a *App) updateCollectionQuantity(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}
	var body CollectionUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var item CollectionItem
	err = a.db.QueryRow(r.Context(), `
		UPDATE user_collections SET quantity = $1
		WHERE user_id = $2 AND printing_id = $3
		RETURNING id, printing_id, quantity, added_at
	`, body.Quantity, user.ID, printingID,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.AddedAt)
	if err != nil {
		jsonError(w, "Item not in collection", http.StatusNotFound)
		return
	}
	jsonResponse(w, item, http.StatusOK)
}

func (a *App) removeFromCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}
	a.db.Exec(r.Context(),
		"DELETE FROM user_collections WHERE user_id = $1 AND printing_id = $2",
		user.ID, printingID,
	)
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) getCollectionForSet(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT uc.printing_id, uc.quantity
		FROM user_collections uc
		JOIN printings p ON p.id = uc.printing_id
		WHERE uc.user_id = $1 AND p.set_id = $2
	`, user.ID, setID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := make(map[int]int)
	for rows.Next() {
		var printingID, quantity int
		if err := rows.Scan(&printingID, &quantity); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		result[printingID] = quantity
	}
	jsonResponse(w, result, http.StatusOK)
}

func (a *App) getCollectionItem(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}

	var item CollectionItem
	err = a.db.QueryRow(r.Context(), `
		SELECT id, printing_id, quantity, added_at
		FROM user_collections
		WHERE user_id = $1 AND printing_id = $2
	`, user.ID, printingID,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.AddedAt)
	if err != nil {
		// Not found — return null (matches Python's fetchone() returning None)
		jsonResponse(w, nil, http.StatusOK)
		return
	}
	jsonResponse(w, item, http.StatusOK)
}
