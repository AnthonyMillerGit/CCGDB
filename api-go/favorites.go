package main

import (
	"net/http"
)

func (a *App) getFavoriteGames(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	rows, err := a.db.Query(r.Context(), `
		SELECT g.id, g.name, g.slug, COALESCE(g.card_back_image, '') AS card_back_image
		FROM user_favorite_games uf
		JOIN games g ON g.id = uf.game_id
		WHERE uf.user_id = $1
		ORDER BY g.name
	`, user.ID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type gameRow struct {
		ID            int    `json:"id"`
		Name          string `json:"name"`
		Slug          string `json:"slug"`
		CardBackImage string `json:"card_back_image"`
	}

	games := []gameRow{}
	for rows.Next() {
		var g gameRow
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.CardBackImage); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		games = append(games, g)
	}
	jsonResponse(w, games, http.StatusOK)
}

func (a *App) addFavoriteGame(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	gameID, err := parseIntParam(r, "gameID")
	if err != nil {
		jsonError(w, "Invalid game ID", http.StatusBadRequest)
		return
	}

	_, err = a.db.Exec(r.Context(), `
		INSERT INTO user_favorite_games (user_id, game_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, user.ID, gameID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *App) removeFavoriteGame(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	gameID, err := parseIntParam(r, "gameID")
	if err != nil {
		jsonError(w, "Invalid game ID", http.StatusBadRequest)
		return
	}

	_, err = a.db.Exec(r.Context(), `
		DELETE FROM user_favorite_games WHERE user_id = $1 AND game_id = $2
	`, user.ID, gameID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
