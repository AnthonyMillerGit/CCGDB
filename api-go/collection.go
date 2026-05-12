package main

import (
	"encoding/json"
	"net/http"
)

func (a *App) getCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	rows, err := a.db.Query(r.Context(), `
		SELECT
		    uc.id, uc.printing_id, uc.quantity, uc.finish, uc.condition, uc.added_at,
		    p.image_url, p.rarity, p.collector_number,
		    c.id AS card_id, c.name AS card_name, c.card_type,
		    s.id AS set_id, s.name AS set_name,
		    g.id AS game_id, g.name AS game_name, g.slug AS game_slug, g.card_back_image
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
			card                       CollectionCard
			gameID                     int
			gameName, gameSlug         string
			cardBackImage              *string
		)
		if err := rows.Scan(
			&card.ID, &card.PrintingID, &card.Quantity, &card.Finish, &card.Condition, &card.AddedAt,
			&card.ImageURL, &card.Rarity, &card.CollectorNumber,
			&card.CardID, &card.CardName, &card.CardType,
			&card.SetID, &card.SetName,
			&gameID, &gameName, &gameSlug, &cardBackImage,
		); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if _, ok := gamesMap[gameID]; !ok {
			gamesMap[gameID] = &CollectionGroup{
				GameID:        gameID,
				GameName:      gameName,
				GameSlug:      gameSlug,
				CardBackImage: cardBackImage,
				Cards:         []CollectionCard{},
			}
			gameOrder = append(gameOrder, gameID)
		}
		card.ImageURL = a.imgURL(card.ImageURL)
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
	if body.Finish == "" {
		body.Finish = "normal"
	}

	var exists bool
	a.db.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM printings WHERE id = $1)", body.PrintingID).Scan(&exists)
	if !exists {
		jsonError(w, "Printing not found", http.StatusNotFound)
		return
	}

	condition := body.Condition
	if condition == "" {
		condition = "NM"
	}

	var item CollectionItem
	err := a.db.QueryRow(r.Context(), `
		INSERT INTO user_collections (user_id, printing_id, quantity, finish, condition)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, printing_id, finish)
		DO UPDATE SET quantity = user_collections.quantity + EXCLUDED.quantity
		RETURNING id, printing_id, quantity, finish, condition, added_at
	`, user.ID, body.PrintingID, body.Quantity, body.Finish, condition,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.Finish, &item.Condition, &item.AddedAt)
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

	if body.Finish == "" {
		body.Finish = "normal"
	}

	var item CollectionItem
	err = a.db.QueryRow(r.Context(), `
		UPDATE user_collections
		SET quantity = $1, condition = CASE WHEN $5 = '' THEN condition ELSE $5 END
		WHERE user_id = $2 AND printing_id = $3 AND finish = $4
		RETURNING id, printing_id, quantity, finish, condition, added_at
	`, body.Quantity, user.ID, printingID, body.Finish, body.Condition,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.Finish, &item.Condition, &item.AddedAt)
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
	finish := r.URL.Query().Get("finish")
	if finish == "" {
		finish = "normal"
	}
	if _, err := a.db.Exec(r.Context(),
		"DELETE FROM user_collections WHERE user_id = $1 AND printing_id = $2 AND finish = $3",
		user.ID, printingID, finish,
	); err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) addSetToCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	_, err = a.db.Exec(r.Context(), `
		INSERT INTO user_collections (user_id, printing_id, quantity, finish)
		SELECT $1, p.id, 1, 'normal'
		FROM printings p
		WHERE p.set_id = $2
		ON CONFLICT (user_id, printing_id, finish)
		DO UPDATE SET quantity = user_collections.quantity + 1
	`, user.ID, setID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) clearCollectionForGame(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	gameID, err := parseIntParam(r, "gameID")
	if err != nil {
		jsonError(w, "Invalid game ID", http.StatusBadRequest)
		return
	}
	_, err = a.db.Exec(r.Context(), `
		DELETE FROM user_collections
		WHERE user_id = $1
		  AND printing_id IN (
		    SELECT p.id FROM printings p
		    JOIN cards c ON c.id = p.card_id
		    WHERE c.game_id = $2
		  )
	`, user.ID, gameID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
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

func (a *App) getCollectionForCard(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	cardID, err := parseIntParam(r, "cardID")
	if err != nil {
		jsonError(w, "Invalid card ID", http.StatusBadRequest)
		return
	}
	rows, err := a.db.Query(r.Context(), `
		SELECT uc.id, uc.printing_id, uc.quantity, uc.finish, uc.condition, uc.added_at,
		       s.id, s.name, s.code, s.release_date::text,
		       p.collector_number, p.rarity, p.image_url
		FROM user_collections uc
		JOIN printings p ON p.id = uc.printing_id
		JOIN sets s ON s.id = p.set_id
		JOIN cards c ON c.id = p.card_id
		WHERE uc.user_id = $1 AND c.id = $2
		ORDER BY s.release_date, s.name, uc.finish
	`, user.ID, cardID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []CollectionCardItem{}
	for rows.Next() {
		var item CollectionCardItem
		if err := rows.Scan(
			&item.ID, &item.PrintingID, &item.Quantity, &item.Finish, &item.Condition, &item.AddedAt,
			&item.SetID, &item.SetName, &item.SetCode, &item.ReleaseDate,
			&item.CollectorNumber, &item.Rarity, &item.ImageURL,
		); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		item.ImageURL = a.imgURL(item.ImageURL)
		items = append(items, item)
	}
	jsonResponse(w, items, http.StatusOK)
}

func (a *App) getCollectionItem(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}

	itemFinish := r.URL.Query().Get("finish")
	if itemFinish == "" {
		itemFinish = "normal"
	}
	var item CollectionItem
	err = a.db.QueryRow(r.Context(), `
		SELECT id, printing_id, quantity, finish, condition, added_at
		FROM user_collections
		WHERE user_id = $1 AND printing_id = $2 AND finish = $3
	`, user.ID, printingID, itemFinish,
	).Scan(&item.ID, &item.PrintingID, &item.Quantity, &item.Finish, &item.Condition, &item.AddedAt)
	if err != nil {
		// Not found — return null (matches Python's fetchone() returning None)
		jsonResponse(w, nil, http.StatusOK)
		return
	}
	jsonResponse(w, item, http.StatusOK)
}

type SetStats struct {
	SetID      int    `json:"set_id"`
	SetName    string `json:"set_name"`
	OwnedCards int    `json:"owned_cards"`
	TotalCards int    `json:"total_cards"`
}

type GameStats struct {
	GameID     int        `json:"game_id"`
	GameName   string     `json:"game_name"`
	GameSlug   string     `json:"game_slug"`
	OwnedCards int        `json:"owned_cards"`
	TotalCards int        `json:"total_cards"`
	Sets       []SetStats `json:"sets"`
}

func (a *App) getCollectionStats(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	// Per-game: distinct cards owned vs total cards in game
	gameRows, err := a.db.Query(r.Context(), `
		SELECT g.id, g.name, g.slug,
		       COUNT(DISTINCT p.card_id) AS owned_cards,
		       (SELECT COUNT(id) FROM cards WHERE game_id = g.id) AS total_cards
		FROM user_collections uc
		JOIN printings p ON p.id = uc.printing_id
		JOIN cards c ON c.id = p.card_id
		JOIN games g ON g.id = c.game_id
		WHERE uc.user_id = $1
		GROUP BY g.id, g.name, g.slug
		ORDER BY g.name
	`, user.ID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer gameRows.Close()

	gamesMap := map[int]*GameStats{}
	var gameOrder []int
	for gameRows.Next() {
		var gs GameStats
		if err := gameRows.Scan(&gs.GameID, &gs.GameName, &gs.GameSlug, &gs.OwnedCards, &gs.TotalCards); err != nil {
			continue
		}
		gs.Sets = []SetStats{}
		gamesMap[gs.GameID] = &gs
		gameOrder = append(gameOrder, gs.GameID)
	}

	if len(gameOrder) == 0 {
		jsonResponse(w, []GameStats{}, http.StatusOK)
		return
	}

	// Per-set: distinct cards owned vs total cards in set (only sets where user has ≥1 card)
	setRows, err := a.db.Query(r.Context(), `
		SELECT s.id, s.name, s.game_id,
		       COUNT(DISTINCT p.card_id) AS owned_cards,
		       (SELECT COUNT(DISTINCT card_id) FROM printings WHERE set_id = s.id) AS total_cards
		FROM user_collections uc
		JOIN printings p ON p.id = uc.printing_id
		JOIN sets s ON s.id = p.set_id
		WHERE uc.user_id = $1
		GROUP BY s.id, s.name, s.game_id
		ORDER BY
		  COUNT(DISTINCT p.card_id)::float /
		  NULLIF((SELECT COUNT(DISTINCT card_id) FROM printings WHERE set_id = s.id), 0) DESC,
		  s.name
	`, user.ID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer setRows.Close()

	for setRows.Next() {
		var ss SetStats
		var gameID int
		if err := setRows.Scan(&ss.SetID, &ss.SetName, &gameID, &ss.OwnedCards, &ss.TotalCards); err != nil {
			continue
		}
		if gs, ok := gamesMap[gameID]; ok {
			gs.Sets = append(gs.Sets, ss)
		}
	}

	result := make([]GameStats, 0, len(gameOrder))
	for _, gid := range gameOrder {
		result = append(result, *gamesMap[gid])
	}
	jsonResponse(w, result, http.StatusOK)
}

func (a *App) getMissingCardsForSet(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT DISTINCT ON (c.id) c.id, c.name, p.id AS printing_id
		FROM printings p
		JOIN cards c ON c.id = p.card_id
		WHERE p.set_id = $2
		  AND c.id NOT IN (
		    SELECT DISTINCT p2.card_id
		    FROM user_collections uc
		    JOIN printings p2 ON p2.id = uc.printing_id
		    WHERE uc.user_id = $1 AND p2.set_id = $2
		  )
		ORDER BY c.id, p.id
	`, user.ID, setID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type MissingCard struct {
		ID         int    `json:"id"`
		Name       string `json:"name"`
		PrintingID int    `json:"printing_id"`
	}
	cards := []MissingCard{}
	for rows.Next() {
		var c MissingCard
		if err := rows.Scan(&c.ID, &c.Name, &c.PrintingID); err != nil {
			continue
		}
		cards = append(cards, c)
	}
	jsonResponse(w, cards, http.StatusOK)
}
