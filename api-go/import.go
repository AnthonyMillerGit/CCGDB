package main

import (
	"encoding/csv"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// importCollection handles POST /api/users/me/collection/import
// Accepts multipart/form-data with a "file" field (CSV or JSON).
// CSV columns (case-insensitive): Card Name, Game, Set, Collector #, Rarity, Quantity
// JSON: array of {card_name, game_name, set_name, collector_number, quantity}
func (a *App) importCollection(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		jsonError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(header.Filename)

	type importRow struct {
		CardName        string `json:"card_name"`
		GameName        string `json:"game_name"`
		SetName         string `json:"set_name"`
		CollectorNumber string `json:"collector_number"`
		Quantity        int    `json:"quantity"`
	}

	var rows []importRow

	if strings.HasSuffix(ext, ".json") {
		data, err := io.ReadAll(file)
		if err != nil {
			jsonError(w, "Failed to read file", http.StatusBadRequest)
			return
		}
		if err := json.Unmarshal(data, &rows); err != nil {
			jsonError(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}
	} else {
		// Default: treat as CSV
		cr := csv.NewReader(file)
		cr.TrimLeadingSpace = true
		cr.LazyQuotes = true
		cr.FieldsPerRecord = -1
		headers, err := cr.Read()
		if err != nil {
			jsonError(w, "Empty or invalid CSV", http.StatusBadRequest)
			return
		}
		// Map header names to column indices (case-insensitive)
		colIdx := map[string]int{}
		for i, h := range headers {
			colIdx[strings.ToLower(strings.TrimSpace(h))] = i
		}
		// colFirst returns the value from the first matching header alias
		colFirst := func(record []string, names ...string) string {
			for _, name := range names {
				if i, ok := colIdx[name]; ok && i < len(record) {
					if v := strings.TrimSpace(record[i]); v != "" {
						return v
					}
				}
			}
			return ""
		}
		for {
			record, err := cr.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				continue
			}
			// Quantity: our format uses "quantity", Moxfield uses "count"
			qtyStr := colFirst(record, "quantity", "count", "qty")
			qty := 1
			if q, err := strconv.Atoi(qtyStr); err == nil && q > 0 {
				qty = q
			}
			rows = append(rows, importRow{
				// Card name: ours = "card name", Moxfield = "name"
				CardName: colFirst(record, "card name", "name", "card"),
				// Game: ours = "game", Moxfield doesn't have one (defaults to empty → match any game)
				GameName: colFirst(record, "game", "game name"),
				// Set: ours = "set", Moxfield = "edition"
				SetName: colFirst(record, "set", "edition", "set name", "expansion"),
				// Collector number: ours = "collector #", Moxfield = "collector number"
				CollectorNumber: colFirst(record, "collector #", "collector number", "number", "#"),
				Quantity: qty,
			})
		}
	}

	if len(rows) == 0 {
		jsonError(w, "No rows found in file", http.StatusBadRequest)
		return
	}

	log.Printf("importCollection: parsed %d rows from CSV", len(rows))

	imported := 0
	skipped := 0

	for _, row := range rows {
		if row.CardName == "" {
			skipped++
			continue
		}

		// Find the best-matching printing — prefer set/collector# but don't require them.
		// Set value may be a full name ("Magic 2010") or a code ("m10") — try both.
		var printingID int
		err := a.db.QueryRow(r.Context(), `
			SELECT p.id
			FROM printings p
			JOIN cards c ON c.id = p.card_id
			JOIN sets s ON s.id = p.set_id
			JOIN games g ON g.id = c.game_id
			WHERE LOWER(c.name) = LOWER($1)
			  AND ($2 = '' OR LOWER(g.name) = LOWER($2))
			ORDER BY
			  CASE WHEN $3 != '' AND (
			    LOWER(s.name) = LOWER($3) OR LOWER(COALESCE(s.code,'')) = LOWER($3)
			  ) THEN 0 ELSE 1 END,
			  CASE WHEN $4 != '' AND LOWER(COALESCE(p.collector_number,'')) = LOWER($4) THEN 0 ELSE 1 END,
			  p.id
			LIMIT 1
		`, row.CardName, row.GameName, row.SetName, row.CollectorNumber).Scan(&printingID)
		if err != nil {
			if skipped < 5 {
				log.Printf("skip row %q game=%q set=%q col=%q err=%v", row.CardName, row.GameName, row.SetName, row.CollectorNumber, err)
			}
			skipped++
			continue
		}

		// Upsert into user_collections (is_foil defaults to false on import)
		_, err = a.db.Exec(r.Context(), `
			INSERT INTO user_collections (user_id, printing_id, quantity, is_foil)
			VALUES ($1, $2, $3, false)
			ON CONFLICT (user_id, printing_id, is_foil)
			DO UPDATE SET quantity = user_collections.quantity + EXCLUDED.quantity
		`, user.ID, printingID, row.Quantity)
		if err != nil {
			skipped++
			continue
		}
		imported++
	}

	log.Printf("importCollection: imported=%d skipped=%d", imported, skipped)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"imported": imported,
		"skipped":  skipped,
	})
}

// importDeck handles POST /api/decks/import
// Accepts multipart/form-data with "file" (CSV/JSON) and "name" + "game_id" fields.
// CSV columns: Card Name, Card Type, Set, Collector #, Quantity
func (a *App) importDeck(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		jsonError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	deckName := strings.TrimSpace(r.FormValue("name"))
	gameIDStr := r.FormValue("game_id")
	if deckName == "" {
		jsonError(w, "Deck name is required", http.StatusBadRequest)
		return
	}
	gameID, err := strconv.Atoi(gameIDStr)
	if err != nil || gameID == 0 {
		jsonError(w, "Valid game_id is required", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(header.Filename)

	type importRow struct {
		CardName        string `json:"card_name"`
		CardType        string `json:"card_type"`
		SetName         string `json:"set_name"`
		CollectorNumber string `json:"collector_number"`
		Quantity        int    `json:"quantity"`
	}

	var rows []importRow

	if strings.HasSuffix(ext, ".json") {
		type jsonDeck struct {
			Cards []importRow `json:"cards"`
		}
		data, err := io.ReadAll(file)
		if err != nil {
			jsonError(w, "Failed to read file", http.StatusBadRequest)
			return
		}
		// Try array format first, then {deck, cards} object
		if err := json.Unmarshal(data, &rows); err != nil {
			var obj jsonDeck
			if err2 := json.Unmarshal(data, &obj); err2 != nil {
				jsonError(w, "Invalid JSON format", http.StatusBadRequest)
				return
			}
			rows = obj.Cards
		}
	} else if strings.HasSuffix(ext, ".dec") || strings.HasSuffix(ext, ".txt") {
		// Decklist format: lines of "N CardName" or "SB: N CardName", // comments ignored
		data, err := io.ReadAll(file)
		if err != nil {
			jsonError(w, "Failed to read file", http.StatusBadRequest)
			return
		}
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "//") {
				continue
			}
			// Strip sideboard prefix — we import it all as one deck
			line = strings.TrimPrefix(line, "SB: ")
			line = strings.TrimPrefix(line, "SB:")
			// Expect "N CardName"
			parts := strings.SplitN(line, " ", 2)
			if len(parts) != 2 {
				continue
			}
			qty, err := strconv.Atoi(parts[0])
			if err != nil || qty <= 0 {
				continue
			}
			rows = append(rows, importRow{
				CardName: strings.TrimSpace(parts[1]),
				Quantity: qty,
			})
		}
	} else {
		cr := csv.NewReader(file)
		cr.TrimLeadingSpace = true
		headers, err := cr.Read()
		if err != nil {
			jsonError(w, "Empty or invalid CSV", http.StatusBadRequest)
			return
		}
		colIdx := map[string]int{}
		for i, h := range headers {
			colIdx[strings.ToLower(strings.TrimSpace(h))] = i
		}
		col := func(record []string, name string) string {
			i, ok := colIdx[name]
			if !ok || i >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[i])
		}
		for {
			record, err := cr.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				continue
			}
			qty := 1
			if q, err := strconv.Atoi(col(record, "quantity")); err == nil && q > 0 {
				qty = q
			}
			rows = append(rows, importRow{
				CardName:        col(record, "card name"),
				CardType:        col(record, "card type"),
				SetName:         col(record, "set"),
				CollectorNumber: col(record, "collector #"),
				Quantity:        qty,
			})
		}
	}

	if len(rows) == 0 {
		jsonError(w, "No rows found in file", http.StatusBadRequest)
		return
	}

	// Create the deck
	var deckID int
	err = a.db.QueryRow(r.Context(), `
		INSERT INTO decks (user_id, game_id, name) VALUES ($1, $2, $3) RETURNING id
	`, user.ID, gameID, deckName).Scan(&deckID)
	if err != nil {
		jsonError(w, "Failed to create deck", http.StatusInternalServerError)
		return
	}

	imported := 0
	skipped := 0

	for _, row := range rows {
		if row.CardName == "" {
			skipped++
			continue
		}

		var cardID int
		err := a.db.QueryRow(r.Context(), `
			SELECT c.id
			FROM cards c
			JOIN games g ON g.id = c.game_id
			WHERE LOWER(c.name) = LOWER($1)
			  AND c.game_id = $2
			ORDER BY c.id
			LIMIT 1
		`, row.CardName, gameID).Scan(&cardID)
		if err != nil {
			skipped++
			continue
		}

		_, err = a.db.Exec(r.Context(), `
			INSERT INTO deck_cards (deck_id, card_id, quantity)
			VALUES ($1, $2, $3)
			ON CONFLICT (deck_id, card_id)
			DO UPDATE SET quantity = deck_cards.quantity + EXCLUDED.quantity
		`, deckID, cardID, row.Quantity)
		if err != nil {
			skipped++
			continue
		}
		imported++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id":       deckID,
		"imported": imported,
		"skipped":  skipped,
	})
}
