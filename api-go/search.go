package main

import (
	"net/http"
	"strconv"
)

type MentionResult struct {
	Type     string `json:"type"`
	ID       int    `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Subtitle string `json:"subtitle,omitempty"`
}

func (a *App) searchMentions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		jsonResponse(w, []any{}, http.StatusOK)
		return
	}

	pattern := "%" + escapeLike(q) + "%"
	results := []MentionResult{}

	// Games
	gameRows, err := a.db.Query(r.Context(), `
		SELECT id, name, slug FROM games
		WHERE name ILIKE $1
		ORDER BY name LIMIT 4
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

	// Sets
	setRows, err := a.db.Query(r.Context(), `
		SELECT s.id, s.name, g.name AS game_name FROM sets s
		JOIN games g ON g.id = s.game_id
		WHERE s.name ILIKE $1
		ORDER BY s.name LIMIT 4
	`, pattern)
	if err == nil {
		defer setRows.Close()
		for setRows.Next() {
			var id int
			var name, gameName string
			if setRows.Scan(&id, &name, &gameName) == nil {
				results = append(results, MentionResult{
					Type: "set", ID: id, Name: name,
					URL: "/sets/" + strconv.Itoa(id),
					Subtitle: gameName,
				})
			}
		}
	}

	// Cards
	cardRows, err := a.db.Query(r.Context(), `
		SELECT DISTINCT ON (c.name) c.id, c.name, g.name AS game_name
		FROM cards c
		JOIN games g ON g.id = c.game_id
		WHERE c.name ILIKE $1
		ORDER BY c.name LIMIT 8
	`, pattern)
	if err == nil {
		defer cardRows.Close()
		for cardRows.Next() {
			var id int
			var name, gameName string
			if cardRows.Scan(&id, &name, &gameName) == nil {
				results = append(results, MentionResult{
					Type: "card", ID: id, Name: name,
					URL: "/cards/" + strconv.Itoa(id),
					Subtitle: gameName,
				})
			}
		}
	}

	jsonResponse(w, results, http.StatusOK)
}
