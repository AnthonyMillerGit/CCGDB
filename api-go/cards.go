package main

import (
	"net/http"
)

func (a *App) getSet(w http.ResponseWriter, r *http.Request) {
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}
	var s SetDetail
	err = a.db.QueryRow(r.Context(), `
		SELECT s.id, s.name, s.code, s.release_date::text,
		       g.name AS game_name, g.slug AS game_slug
		FROM sets s
		JOIN games g ON g.id = s.game_id
		WHERE s.id = $1
	`, setID).Scan(&s.ID, &s.Name, &s.Code, &s.ReleaseDate, &s.GameName, &s.GameSlug)
	if err != nil {
		jsonError(w, "Set not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, s, http.StatusOK)
}

func (a *App) getSetCards(w http.ResponseWriter, r *http.Request) {
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}
	rows, err := a.db.Query(r.Context(), `
		SELECT DISTINCT ON (c.name)
		       c.id, c.name, c.card_type, c.rules_text, c.attributes,
		       p.id AS printing_id, p.collector_number, p.rarity, p.image_url, p.artist
		FROM cards c
		JOIN printings p ON p.card_id = c.id
		WHERE p.set_id = $1
		ORDER BY c.name, p.image_url NULLS LAST, p.id
	`, setID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cards := []SetCard{}
	for rows.Next() {
		var c SetCard
		if err := rows.Scan(&c.ID, &c.Name, &c.CardType, &c.RulesText, &c.Attributes,
			&c.PrintingID, &c.CollectorNumber, &c.Rarity, &c.ImageURL, &c.Artist); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		c.ImageURL = a.imgURL(c.ImageURL)
		cards = append(cards, c)
	}
	jsonResponse(w, cards, http.StatusOK)
}

func (a *App) searchCards(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		jsonError(w, "name query param required", http.StatusBadRequest)
		return
	}
	game := r.URL.Query().Get("game")

	query := `
		SELECT DISTINCT ON (c.id, s.id)
		    c.id, c.name, c.card_type, c.rules_text,
		    g.slug AS game, g.name AS game_name,
		    p.image_url, p.id AS printing_id, s.name AS set_name
		FROM cards c
		JOIN games g ON g.id = c.game_id
		JOIN printings p ON p.card_id = c.id
		JOIN sets s ON s.id = p.set_id
		WHERE c.name ILIKE $1`

	args := []any{"%" + escapeLike(name) + "%"}
	if game != "" {
		query += " AND g.slug = $2"
		args = append(args, game)
	}
	query += " ORDER BY c.id, s.id, p.image_url NULLS LAST LIMIT 150"

	rows, err := a.db.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cards := []CardSummary{}
	for rows.Next() {
		var c CardSummary
		if err := rows.Scan(&c.ID, &c.Name, &c.CardType, &c.RulesText,
			&c.Game, &c.GameName, &c.ImageURL, &c.PrintingID, &c.SetName); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		c.ImageURL = a.imgURL(c.ImageURL)
		cards = append(cards, c)
	}
	jsonResponse(w, cards, http.StatusOK)
}

func (a *App) getCard(w http.ResponseWriter, r *http.Request) {
	cardID, err := parseIntParam(r, "cardID")
	if err != nil {
		jsonError(w, "Invalid card ID", http.StatusBadRequest)
		return
	}

	var card CardDetail
	err = a.db.QueryRow(r.Context(), `
		SELECT c.id, c.name, c.card_type, c.rules_text, c.attributes,
		       g.id AS game_id, g.name AS game, g.slug AS game_slug
		FROM cards c
		JOIN games g ON g.id = c.game_id
		WHERE c.id = $1
	`, cardID).Scan(&card.ID, &card.Name, &card.CardType, &card.RulesText, &card.Attributes,
		&card.GameID, &card.Game, &card.GameSlug)
	if err != nil {
		jsonError(w, "Card not found", http.StatusNotFound)
		return
	}

	pRows, err := a.db.Query(r.Context(), `
		SELECT p.id, p.collector_number, p.rarity, p.image_url,
		       p.back_image_url, p.artist, p.flavor_text,
		       p.set_id, s.name AS set_name, s.code AS set_code,
		       s.release_date::text
		FROM printings p
		JOIN sets s ON s.id = p.set_id
		WHERE p.card_id = $1
		ORDER BY s.release_date
	`, cardID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer pRows.Close()

	card.Printings = []Printing{}
	for pRows.Next() {
		var p Printing
		if err := pRows.Scan(&p.ID, &p.CollectorNumber, &p.Rarity, &p.ImageURL,
			&p.BackImageURL, &p.Artist, &p.FlavorText,
			&p.SetID, &p.SetName, &p.SetCode, &p.ReleaseDate); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		p.ImageURL = a.imgURL(p.ImageURL)
		card.Printings = append(card.Printings, p)
	}
	jsonResponse(w, card, http.StatusOK)
}

func (a *App) getPrinting(w http.ResponseWriter, r *http.Request) {
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}

	var p PrintingDetail
	err = a.db.QueryRow(r.Context(), `
		SELECT p.id, p.collector_number, p.rarity, p.image_url,
		       p.back_image_url, p.artist, p.flavor_text,
		       s.name AS set_name, s.code AS set_code, s.release_date::text,
		       c.id AS card_id, c.name AS card_name, c.card_type,
		       c.rules_text, c.attributes,
		       g.name AS game, g.slug AS game_slug
		FROM printings p
		JOIN sets s ON s.id = p.set_id
		JOIN cards c ON c.id = p.card_id
		JOIN games g ON g.id = c.game_id
		WHERE p.id = $1
	`, printingID).Scan(
		&p.ID, &p.CollectorNumber, &p.Rarity, &p.ImageURL,
		&p.BackImageURL, &p.Artist, &p.FlavorText,
		&p.SetName, &p.SetCode, &p.ReleaseDate,
		&p.CardID, &p.CardName, &p.CardType,
		&p.RulesText, &p.Attributes,
		&p.Game, &p.GameSlug,
	)
	if err != nil {
		jsonError(w, "Printing not found", http.StatusNotFound)
		return
	}
	p.ImageURL = a.imgURL(p.ImageURL)
	jsonResponse(w, p, http.StatusOK)
}

func (a *App) randomCard(w http.ResponseWriter, r *http.Request) {
	var id int
	err := a.db.QueryRow(r.Context(), `
		SELECT c.id
		FROM cards c
		JOIN printings p ON p.card_id = c.id
		WHERE p.image_url IS NOT NULL
		ORDER BY RANDOM()
		LIMIT 1
	`).Scan(&id)
	if err != nil {
		jsonError(w, "No cards found", http.StatusNotFound)
		return
	}
	jsonResponse(w, map[string]int{"id": id}, http.StatusOK)
}

func (a *App) randomCards(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 5)
	slugs := r.URL.Query()["game"]
	if len(slugs) == 0 {
		slugs = []string{"mtg", "pokemon", "yugioh", "fab", "sorcery"}
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT DISTINCT ON (g.slug)
		    c.id, c.name, c.card_type, g.slug AS game, g.name AS game_name,
		    p.image_url
		FROM printings p
		JOIN cards c ON c.id = p.card_id
		JOIN games g ON g.id = c.game_id
		WHERE p.image_url IS NOT NULL
		  AND g.slug = ANY($1)
		ORDER BY g.slug, RANDOM()
		LIMIT $2
	`, slugs, limit)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cards := []CardSummary{}
	for rows.Next() {
		var c CardSummary
		if err := rows.Scan(&c.ID, &c.Name, &c.CardType, &c.Game, &c.GameName, &c.ImageURL); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		c.ImageURL = a.imgURL(c.ImageURL)
		cards = append(cards, c)
	}
	jsonResponse(w, cards, http.StatusOK)
}

func (a *App) searchSuggestions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		jsonResponse(w, []any{}, http.StatusOK)
		return
	}
	limit := parseIntQuery(r, "limit", 8)

	type Suggestion struct {
		ID       int     `json:"id"`
		Name     string  `json:"name"`
		CardType string  `json:"card_type"`
		Game     string  `json:"game"`
		GameSlug string  `json:"game_slug"`
		ImageURL *string `json:"image_url"`
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT DISTINCT ON (c.name, g.slug)
		    c.id, c.name, c.card_type, g.name AS game, g.slug AS game_slug,
		    p.image_url
		FROM cards c
		JOIN games g ON g.id = c.game_id
		JOIN printings p ON p.card_id = c.id
		WHERE c.name ILIKE $1
		ORDER BY c.name, g.slug, p.image_url NULLS LAST, c.id
		LIMIT $2
	`, "%"+escapeLike(q)+"%", limit)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	suggestions := []Suggestion{}
	for rows.Next() {
		var s Suggestion
		if err := rows.Scan(&s.ID, &s.Name, &s.CardType, &s.Game, &s.GameSlug, &s.ImageURL); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		s.ImageURL = a.imgURL(s.ImageURL)
		suggestions = append(suggestions, s)
	}
	jsonResponse(w, suggestions, http.StatusOK)
}
