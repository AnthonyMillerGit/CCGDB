package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (a *App) getGames(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(),
		"SELECT id, name, slug, description, card_back_image FROM games ORDER BY name")
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	games := []Game{}
	for rows.Next() {
		var g Game
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.Description, &g.CardBackImage); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		games = append(games, g)
	}
	jsonResponse(w, games, http.StatusOK)
}

func (a *App) getGame(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var g Game
	err := a.db.QueryRow(r.Context(),
		"SELECT id, name, slug, description FROM games WHERE slug = $1", slug,
	).Scan(&g.ID, &g.Name, &g.Slug, &g.Description)
	if err != nil {
		jsonError(w, "Game not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, g, http.StatusOK)
}

func (a *App) getGameSets(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	rows, err := a.db.Query(r.Context(), `
		SELECT s.id, s.name, s.code, s.release_date::text, s.total_cards, s.icon_url, s.set_type
		FROM sets s
		JOIN games g ON g.id = s.game_id
		WHERE g.slug = $1
		ORDER BY s.release_date DESC NULLS LAST
	`, slug)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	sets := []SetSummary{}
	for rows.Next() {
		var s SetSummary
		if err := rows.Scan(&s.ID, &s.Name, &s.Code, &s.ReleaseDate, &s.TotalCards, &s.IconURL, &s.SetType); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		sets = append(sets, s)
	}
	jsonResponse(w, sets, http.StatusOK)
}
