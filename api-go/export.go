package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// exportCollection handles GET /api/users/me/collection/export?format=csv|json|txt
func (a *App) exportCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "csv"
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT
		    c.name AS card_name,
		    g.name AS game_name,
		    s.name AS set_name,
		    COALESCE(p.collector_number, '') AS collector_number,
		    COALESCE(p.rarity, '') AS rarity,
		    uc.quantity,
		    uc.finish,
		    uc.condition
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

	type collectionRow struct {
		CardName        string `json:"card_name"`
		GameName        string `json:"game_name"`
		SetName         string `json:"set_name"`
		CollectorNumber string `json:"collector_number"`
		Rarity          string `json:"rarity"`
		Quantity        int    `json:"quantity"`
		Finish          string `json:"finish"`
		Condition       string `json:"condition"`
	}

	var records []collectionRow
	for rows.Next() {
		var rec collectionRow
		if err := rows.Scan(&rec.CardName, &rec.GameName, &rec.SetName,
			&rec.CollectorNumber, &rec.Rarity, &rec.Quantity, &rec.Finish, &rec.Condition); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		records = append(records, rec)
	}

	switch format {
	case "json":
		w.Header().Set("Content-Disposition", `attachment; filename="collection.json"`)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(records)

	case "txt":
		w.Header().Set("Content-Disposition", `attachment; filename="collection.txt"`)
		w.Header().Set("Content-Type", "text/plain")
		for _, rec := range records {
			fmt.Fprintf(w, "%dx %s (%s)\n", rec.Quantity, rec.CardName, rec.SetName)
		}

	default: // csv
		w.Header().Set("Content-Disposition", `attachment; filename="collection.csv"`)
		w.Header().Set("Content-Type", "text/csv")
		cw := csv.NewWriter(w)
		cw.Write([]string{"Card Name", "Game", "Set", "Collector #", "Rarity", "Quantity", "Finish", "Condition"})
		for _, rec := range records {
			cw.Write([]string{
				rec.CardName, rec.GameName, rec.SetName,
				rec.CollectorNumber, rec.Rarity,
				strconv.Itoa(rec.Quantity),
				rec.Finish,
				rec.Condition,
			})
		}
		cw.Flush()
	}
}

// exportDeck handles GET /api/decks/{deckID}/export?format=csv|json|txt
func (a *App) exportDeck(w http.ResponseWriter, r *http.Request) {
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

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "txt"
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT
		    c.name AS card_name,
		    c.card_type,
		    COALESCE(p.collector_number, '') AS collector_number,
		    COALESCE(p.set_name, '') AS set_name,
		    dc.quantity
		FROM deck_cards dc
		JOIN cards c ON c.id = dc.card_id
		LEFT JOIN LATERAL (
		    SELECT p2.collector_number, s2.name AS set_name
		    FROM printings p2
		    JOIN sets s2 ON s2.id = p2.set_id
		    WHERE p2.card_id = c.id
		    ORDER BY p2.id LIMIT 1
		) p ON TRUE
		WHERE dc.deck_id = $1
		ORDER BY c.card_type, c.name
	`, deckID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type deckRow struct {
		CardName        string `json:"card_name"`
		CardType        string `json:"card_type"`
		CollectorNumber string `json:"collector_number"`
		SetName         string `json:"set_name"`
		Quantity        int    `json:"quantity"`
	}

	var records []deckRow
	for rows.Next() {
		var rec deckRow
		if err := rows.Scan(&rec.CardName, &rec.CardType,
			&rec.CollectorNumber, &rec.SetName, &rec.Quantity); err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}
		records = append(records, rec)
	}

	deckName := deck.Name

	switch format {
	case "json":
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, deckName))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"deck":  deckName,
			"cards": records,
		})

	case "csv":
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.csv"`, deckName))
		w.Header().Set("Content-Type", "text/csv")
		cw := csv.NewWriter(w)
		cw.Write([]string{"Card Name", "Card Type", "Set", "Collector #", "Quantity"})
		for _, rec := range records {
			cw.Write([]string{
				rec.CardName, rec.CardType, rec.SetName,
				rec.CollectorNumber, strconv.Itoa(rec.Quantity),
			})
		}
		cw.Flush()

	default: // txt — classic decklist format people share on Reddit/Discord
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.txt"`, deckName))
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "// %s\n\n", deckName)
		currentType := ""
		for _, rec := range records {
			if rec.CardType != currentType {
				if currentType != "" {
					fmt.Fprintln(w)
				}
				fmt.Fprintf(w, "// %s\n", rec.CardType)
				currentType = rec.CardType
			}
			fmt.Fprintf(w, "%d %s\n", rec.Quantity, rec.CardName)
		}
	}
}
