package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

type WishlistItem struct {
	ID         int       `json:"id"`
	PrintingID int       `json:"printing_id"`
	CardID     int       `json:"card_id"`
	CardName   string    `json:"card_name"`
	SetName    string    `json:"set_name"`
	GameSlug   string    `json:"game_slug"`
	GameName   string    `json:"game_name"`
	ImageURL   *string   `json:"image_url"`
	CardType   *string   `json:"card_type"`
	AddedAt    time.Time `json:"added_at"`
}

func (a *App) getWishlist(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	rows, err := a.db.Query(r.Context(), `
		SELECT wl.id, wl.printing_id, c.id, c.name, s.name, g.slug, g.name,
		       p.image_url, c.card_type, wl.added_at
		FROM wishlists wl
		JOIN printings p ON p.id = wl.printing_id
		JOIN cards c ON c.id = p.card_id
		JOIN sets s ON s.id = p.set_id
		JOIN games g ON g.id = s.game_id
		WHERE wl.user_id = $1
		ORDER BY wl.added_at DESC
	`, user.ID)
	if err != nil {
		jsonError(w, "Failed to fetch wishlist", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []WishlistItem{}
	for rows.Next() {
		var item WishlistItem
		if err := rows.Scan(&item.ID, &item.PrintingID, &item.CardID, &item.CardName,
			&item.SetName, &item.GameSlug, &item.GameName,
			&item.ImageURL, &item.CardType, &item.AddedAt); err != nil {
			continue
		}
		items = append(items, item)
	}
	jsonResponse(w, items, http.StatusOK)
}

func (a *App) addToWishlist(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	var body struct {
		PrintingID int `json:"printing_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PrintingID == 0 {
		jsonError(w, "printing_id is required", http.StatusBadRequest)
		return
	}

	var id int
	err := a.db.QueryRow(r.Context(), `
		INSERT INTO wishlists (user_id, printing_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, printing_id) DO NOTHING
		RETURNING id
	`, user.ID, body.PrintingID).Scan(&id)

	if err == pgx.ErrNoRows {
		jsonResponse(w, map[string]string{"status": "already_exists"}, http.StatusOK)
		return
	}
	if err != nil {
		jsonError(w, "Failed to add to wishlist", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]any{"id": id, "status": "added"}, http.StatusCreated)
}

func (a *App) removeFromWishlist(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	printingID, err := parseIntParam(r, "printingID")
	if err != nil || printingID == 0 {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}

	_, err = a.db.Exec(r.Context(), `
		DELETE FROM wishlists WHERE user_id = $1 AND printing_id = $2
	`, user.ID, printingID)
	if err != nil {
		jsonError(w, "Failed to remove from wishlist", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"status": "removed"}, http.StatusOK)
}

func (a *App) addMissingSetToWishlist(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	setID, err := parseIntParam(r, "setID")
	if err != nil {
		jsonError(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	tag, err := a.db.Exec(r.Context(), `
		INSERT INTO wishlists (user_id, printing_id)
		SELECT $1, p.id
		FROM printings p
		WHERE p.set_id = $2
		  AND p.card_id NOT IN (
		    SELECT DISTINCT p2.card_id
		    FROM user_collections uc
		    JOIN printings p2 ON p2.id = uc.printing_id
		    WHERE uc.user_id = $1 AND p2.set_id = $2
		  )
		ON CONFLICT (user_id, printing_id) DO NOTHING
	`, user.ID, setID)
	if err != nil {
		log.Printf("addMissingSetToWishlist error (user=%d set=%d): %v", user.ID, setID, err)
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]int{"added": int(tag.RowsAffected())}, http.StatusOK)
}

func (a *App) checkWishlistItem(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	printingID, err := parseIntParam(r, "printingID")
	if err != nil {
		jsonError(w, "Invalid printing ID", http.StatusBadRequest)
		return
	}
	var exists bool
	a.db.QueryRow(r.Context(),
		"SELECT EXISTS(SELECT 1 FROM wishlists WHERE user_id = $1 AND printing_id = $2)",
		user.ID, printingID,
	).Scan(&exists)
	jsonResponse(w, map[string]bool{"wishlisted": exists}, http.StatusOK)
}

func (a *App) clearWishlist(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	a.db.Exec(r.Context(), "DELETE FROM wishlists WHERE user_id = $1", user.ID)
	w.WriteHeader(http.StatusNoContent)
}
