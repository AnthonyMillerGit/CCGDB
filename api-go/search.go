package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func parseIntList(s string) []int32 {
	if s == "" {
		return nil
	}
	var out []int32
	for _, part := range strings.Split(s, ",") {
		if n, err := strconv.Atoi(strings.TrimSpace(part)); err == nil {
			out = append(out, int32(n))
		}
	}
	return out
}

type MentionResult struct {
	Type     string  `json:"type"`
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	URL      string  `json:"url"`
	Subtitle string  `json:"subtitle,omitempty"`
	ImageURL *string `json:"image_url,omitempty"`
}

func (a *App) searchMentions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		jsonResponse(w, []any{}, http.StatusOK)
		return
	}

	pattern := "%" + escapeLike(q) + "%"
	gameIDs := parseIntList(r.URL.Query().Get("game_ids"))
	results := []MentionResult{}

	// Games — never filtered by game_ids (used to discover/add game tags)
	gameRows, err := a.db.Query(r.Context(), `
		SELECT id, name, slug FROM games
		WHERE unaccent(name) ILIKE unaccent($1)
		ORDER BY name LIMIT 8
	`, pattern)
	if err == nil {
		defer gameRows.Close()
		for gameRows.Next() {
			var id int
			var name, slug string
			if gameRows.Scan(&id, &name, &slug) == nil {
				results = append(results, MentionResult{
					Type: "game", ID: id, Name: name,
					URL: "/games/" + slug,
				})
			}
		}
	}

	// Sets — filtered by game_ids when provided
	setQuery := `SELECT s.id, s.name, g.name AS game_name FROM sets s
		JOIN games g ON g.id = s.game_id
		WHERE unaccent(s.name) ILIKE unaccent($1)`
	setArgs := []any{pattern}
	if len(gameIDs) > 0 {
		setQuery += fmt.Sprintf(" AND s.game_id = ANY($%d)", len(setArgs)+1)
		setArgs = append(setArgs, gameIDs)
	}
	setQuery += " ORDER BY s.name LIMIT 8"

	setRows, err := a.db.Query(r.Context(), setQuery, setArgs...)
	if err == nil {
		defer setRows.Close()
		for setRows.Next() {
			var id int
			var name, gameName string
			if setRows.Scan(&id, &name, &gameName) == nil {
				results = append(results, MentionResult{
					Type: "set", ID: id, Name: name,
					URL:      "/sets/" + strconv.Itoa(id),
					Subtitle: gameName,
				})
			}
		}
	}

	// Cards — one row per card entry (no name-deduplication so all set versions appear)
	cardQuery := `SELECT c.id, c.name, g.name AS game_name,
		       (SELECT s.name FROM printings p
		        JOIN sets s ON s.id = p.set_id
		        WHERE p.card_id = c.id
		        ORDER BY p.id LIMIT 1) AS set_name,
		       (SELECT p.image_url FROM printings p
		        WHERE p.card_id = c.id AND p.image_url IS NOT NULL
		        ORDER BY p.id LIMIT 1) AS image_url
		FROM cards c
		JOIN games g ON g.id = c.game_id
		WHERE unaccent(c.name) ILIKE unaccent($1)`
	cardArgs := []any{pattern}
	if len(gameIDs) > 0 {
		cardQuery += fmt.Sprintf(" AND c.game_id = ANY($%d)", len(cardArgs)+1)
		cardArgs = append(cardArgs, gameIDs)
	}
	cardQuery += " ORDER BY c.name, c.id LIMIT 40"

	cardRows, err := a.db.Query(r.Context(), cardQuery, cardArgs...)
	if err == nil {
		defer cardRows.Close()
		for cardRows.Next() {
			var id int
			var name, gameName string
			var setName, rawImageURL *string
			if cardRows.Scan(&id, &name, &gameName, &setName, &rawImageURL) == nil {
				subtitle := gameName
				if setName != nil && *setName != "" {
					subtitle = *setName + " · " + gameName
				}
				imgURL := a.imgURL(rawImageURL)
				results = append(results, MentionResult{
					Type:     "card",
					ID:       id,
					Name:     name,
					URL:      "/cards/" + strconv.Itoa(id),
					Subtitle: subtitle,
					ImageURL: imgURL,
				})
			}
		}
	}

	// Decks (optional auth — only returned when a valid token is present)
	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		if userID, err := a.parseToken(strings.TrimPrefix(authHeader, "Bearer ")); err == nil {
			deckQuery := `SELECT d.id, d.name, g.name AS game_name,
				       COALESCE(SUM(dc.quantity), 0) AS total_cards
				FROM decks d
				JOIN games g ON g.id = d.game_id
				LEFT JOIN deck_cards dc ON dc.deck_id = d.id
				WHERE d.user_id = $1 AND unaccent(d.name) ILIKE unaccent($2)`
			deckArgs := []any{userID, pattern}
			if len(gameIDs) > 0 {
				deckQuery += fmt.Sprintf(" AND d.game_id = ANY($%d)", len(deckArgs)+1)
				deckArgs = append(deckArgs, gameIDs)
			}
			deckQuery += " GROUP BY d.id, g.name ORDER BY d.name LIMIT 12"

			deckRows, err := a.db.Query(r.Context(), deckQuery, deckArgs...)
			if err == nil {
				defer deckRows.Close()
				for deckRows.Next() {
					var id int
					var name, gameName string
					var totalCards int
					if deckRows.Scan(&id, &name, &gameName, &totalCards) == nil {
						results = append(results, MentionResult{
							Type:     "deck",
							ID:       id,
							Name:     name,
							URL:      "/decks/" + strconv.Itoa(id),
							Subtitle: strconv.Itoa(totalCards) + " cards · " + gameName,
						})
					}
				}
			}
		}
	}

	jsonResponse(w, results, http.StatusOK)
}
