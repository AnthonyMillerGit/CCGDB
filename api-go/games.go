package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

func (a *App) getGames(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	var (
		rows pgx.Rows
		err  error
	)
	if q != "" {
		rows, err = a.db.Query(r.Context(),
			"SELECT id, name, slug, description, card_back_image FROM games WHERE name ILIKE $1 ORDER BY name",
			"%"+escapeLike(q)+"%")
	} else {
		rows, err = a.db.Query(r.Context(),
			"SELECT id, name, slug, description, card_back_image FROM games ORDER BY name")
	}
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

func (a *App) getRecentSets(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 10)
	if limit > 50 {
		limit = 50
	}
	rows, err := a.db.Query(r.Context(), `
		SELECT s.id, s.name, s.release_date::text, s.total_cards,
		       g.name, g.slug, g.card_back_image
		FROM sets s
		JOIN games g ON g.id = s.game_id
		WHERE s.release_date IS NOT NULL AND s.release_date <= CURRENT_DATE
		ORDER BY s.release_date DESC
		LIMIT $1
	`, limit)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	sets := []RecentSet{}
	for rows.Next() {
		var s RecentSet
		if err := rows.Scan(&s.SetID, &s.SetName, &s.ReleaseDate, &s.TotalCards,
			&s.GameName, &s.GameSlug, &s.CardBackImage); err != nil {
			continue
		}
		sets = append(sets, s)
	}
	jsonResponse(w, sets, http.StatusOK)
}

func (a *App) getStats(w http.ResponseWriter, r *http.Request) {
	type Stats struct {
		Games int `json:"games"`
		Sets  int `json:"sets"`
		Cards int `json:"cards"`
	}
	var s Stats
	err := a.db.QueryRow(r.Context(), `
		SELECT
		    (SELECT COUNT(*) FROM games) AS games,
		    (SELECT COUNT(*) FROM sets)  AS sets,
		    (SELECT COUNT(*) FROM cards) AS cards
	`).Scan(&s.Games, &s.Sets, &s.Cards)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, s, http.StatusOK)
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
