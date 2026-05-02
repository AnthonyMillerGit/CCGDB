package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// ── Models ────────────────────────────────────────────────────────────────────

type Post struct {
	ID          int             `json:"id"`
	AuthorID    int             `json:"author_id"`
	AuthorName  string          `json:"author_name"`
	Title       string          `json:"title"`
	Slug        string          `json:"slug"`
	Excerpt     *string         `json:"excerpt"`
	Body        json.RawMessage `json:"body"`
	PublishedAt *time.Time      `json:"published_at"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	GameTags    []PostGameTag   `json:"game_tags"`
	SetTags     []PostSetTag    `json:"set_tags"`
	CardTags    []PostCardTag   `json:"card_tags"`
}

type PostSummary struct {
	ID          int        `json:"id"`
	AuthorName  string     `json:"author_name"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Excerpt     *string    `json:"excerpt"`
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type PostGameTag struct {
	GameID   int    `json:"game_id"`
	GameName string `json:"game_name"`
	GameSlug string `json:"game_slug"`
}

type PostSetTag struct {
	SetID   int    `json:"set_id"`
	SetName string `json:"set_name"`
}

type PostCardTag struct {
	CardID   int    `json:"card_id"`
	CardName string `json:"card_name"`
}

type CreatePostRequest struct {
	Title       string          `json:"title"`
	Slug        string          `json:"slug"`
	Excerpt     *string         `json:"excerpt"`
	Body        json.RawMessage `json:"body"`
	PublishedAt *time.Time      `json:"published_at"`
	GameIDs     []int           `json:"game_ids"`
	SetIDs      []int           `json:"set_ids"`
	CardIDs     []int           `json:"card_ids"`
}

type UpdatePostRequest struct {
	Title       *string         `json:"title"`
	Slug        *string         `json:"slug"`
	Excerpt     *string         `json:"excerpt"`
	Body        json.RawMessage `json:"body"`
	PublishedAt *time.Time      `json:"published_at"`
	GameIDs     *[]int          `json:"game_ids"`
	SetIDs      *[]int          `json:"set_ids"`
	CardIDs     *[]int          `json:"card_ids"`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, r := range s {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			b.WriteRune('-')
		}
	}
	return strings.Trim(b.String(), "-")
}

func (a *App) loadPostTags(r *http.Request, postID int) ([]PostGameTag, []PostSetTag, []PostCardTag) {
	gameTags := []PostGameTag{}
	setTags := []PostSetTag{}
	cardTags := []PostCardTag{}

	rows, err := a.db.Query(r.Context(), `
		SELECT g.id, g.name, g.slug FROM post_game_tags pgt
		JOIN games g ON g.id = pgt.game_id
		WHERE pgt.post_id = $1
	`, postID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t PostGameTag
			rows.Scan(&t.GameID, &t.GameName, &t.GameSlug)
			gameTags = append(gameTags, t)
		}
	}

	srows, err := a.db.Query(r.Context(), `
		SELECT s.id, s.name FROM post_set_tags pst
		JOIN sets s ON s.id = pst.set_id
		WHERE pst.post_id = $1
	`, postID)
	if err == nil {
		defer srows.Close()
		for srows.Next() {
			var t PostSetTag
			srows.Scan(&t.SetID, &t.SetName)
			setTags = append(setTags, t)
		}
	}

	crows, err := a.db.Query(r.Context(), `
		SELECT c.id, c.name FROM post_card_tags pct
		JOIN cards c ON c.id = pct.card_id
		WHERE pct.post_id = $1
	`, postID)
	if err == nil {
		defer crows.Close()
		for crows.Next() {
			var t PostCardTag
			crows.Scan(&t.CardID, &t.CardName)
			cardTags = append(cardTags, t)
		}
	}

	return gameTags, setTags, cardTags
}

func (a *App) syncPostTags(r *http.Request, postID int, gameIDs, setIDs, cardIDs []int) {
	a.db.Exec(r.Context(), "DELETE FROM post_game_tags WHERE post_id = $1", postID)
	a.db.Exec(r.Context(), "DELETE FROM post_set_tags WHERE post_id = $1", postID)
	a.db.Exec(r.Context(), "DELETE FROM post_card_tags WHERE post_id = $1", postID)

	for _, id := range gameIDs {
		a.db.Exec(r.Context(), "INSERT INTO post_game_tags (post_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", postID, id)
	}
	for _, id := range setIDs {
		a.db.Exec(r.Context(), "INSERT INTO post_set_tags (post_id, set_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", postID, id)
	}
	for _, id := range cardIDs {
		a.db.Exec(r.Context(), "INSERT INTO post_card_tags (post_id, card_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", postID, id)
	}
}

// ── Public handlers ───────────────────────────────────────────────────────────

func scanPostSummaries(rows interface {
	Next() bool
	Scan(...any) error
}) []PostSummary {
	posts := []PostSummary{}
	for rows.Next() {
		var p PostSummary
		if err := rows.Scan(&p.ID, &p.AuthorName, &p.Title, &p.Slug,
			&p.Excerpt, &p.PublishedAt, &p.CreatedAt); err != nil {
			continue
		}
		posts = append(posts, p)
	}
	return posts
}

func (a *App) listPosts(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 20)
	offset := 0
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v > 0 {
		offset = v
	}

	rows, err := a.db.Query(r.Context(), `
		SELECT p.id, u.username, p.title, p.slug, p.excerpt, p.published_at, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		WHERE p.published_at IS NOT NULL AND p.published_at <= NOW()
		ORDER BY p.published_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonResponse(w, scanPostSummaries(rows), http.StatusOK)
}

func (a *App) getPost(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var p Post
	err := a.db.QueryRow(r.Context(), `
		SELECT p.id, p.author_id, u.username, p.title, p.slug, p.excerpt,
		       p.body, p.published_at, p.created_at, p.updated_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		WHERE p.slug = $1 AND p.published_at IS NOT NULL AND p.published_at <= NOW()
	`, slug).Scan(&p.ID, &p.AuthorID, &p.AuthorName, &p.Title, &p.Slug,
		&p.Excerpt, &p.Body, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		jsonError(w, "Post not found", http.StatusNotFound)
		return
	}
	p.GameTags, p.SetTags, p.CardTags = a.loadPostTags(r, p.ID)
	jsonResponse(w, p, http.StatusOK)
}

func (a *App) getGamePosts(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	rows, err := a.db.Query(r.Context(), `
		SELECT p.id, u.username, p.title, p.slug, p.excerpt, p.published_at, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		JOIN post_game_tags pgt ON pgt.post_id = p.id
		JOIN games g ON g.id = pgt.game_id
		WHERE g.slug = $1 AND p.published_at IS NOT NULL AND p.published_at <= NOW()
		ORDER BY p.published_at DESC
	`, slug)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonResponse(w, scanPostSummaries(rows), http.StatusOK)
}

func (a *App) getCardPosts(w http.ResponseWriter, r *http.Request) {
	cardID, err := parseIntParam(r, "cardID")
	if err != nil {
		jsonError(w, "Invalid card ID", http.StatusBadRequest)
		return
	}
	rows, err := a.db.Query(r.Context(), `
		SELECT p.id, u.username, p.title, p.slug, p.excerpt, p.published_at, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		JOIN post_card_tags pct ON pct.post_id = p.id
		WHERE pct.card_id = $1 AND p.published_at IS NOT NULL AND p.published_at <= NOW()
		ORDER BY p.published_at DESC
	`, cardID)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonResponse(w, scanPostSummaries(rows), http.StatusOK)
}

// ── Admin handlers ────────────────────────────────────────────────────────────

func (a *App) createPost(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}

	var body CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(body.Title) == "" {
		jsonError(w, "Title is required", http.StatusBadRequest)
		return
	}

	slug := body.Slug
	if slug == "" {
		slug = slugify(body.Title)
	} else {
		slug = slugify(slug)
	}

	if body.Body == nil {
		body.Body = json.RawMessage(`{}`)
	}

	var p Post
	err := a.db.QueryRow(r.Context(), `
		INSERT INTO posts (author_id, title, slug, excerpt, body, published_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, author_id, title, slug, excerpt, body, published_at, created_at, updated_at
	`, user.ID, strings.TrimSpace(body.Title), slug, body.Excerpt, body.Body, body.PublishedAt,
	).Scan(&p.ID, &p.AuthorID, &p.Title, &p.Slug, &p.Excerpt,
		&p.Body, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		jsonError(w, "Database error — slug may already be in use", http.StatusConflict)
		return
	}

	p.AuthorName = user.Username
	a.syncPostTags(r, p.ID, body.GameIDs, body.SetIDs, body.CardIDs)
	p.GameTags, p.SetTags, p.CardTags = a.loadPostTags(r, p.ID)
	jsonResponse(w, p, http.StatusCreated)
}

func (a *App) updatePost(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}

	slug := chi.URLParam(r, "slug")
	var postID int
	err := a.db.QueryRow(r.Context(), "SELECT id FROM posts WHERE slug = $1", slug).Scan(&postID)
	if err != nil {
		jsonError(w, "Post not found", http.StatusNotFound)
		return
	}

	var body UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Title != nil {
		a.db.Exec(r.Context(), "UPDATE posts SET title = $1, updated_at = NOW() WHERE id = $2",
			strings.TrimSpace(*body.Title), postID)
	}
	if body.Slug != nil {
		a.db.Exec(r.Context(), "UPDATE posts SET slug = $1, updated_at = NOW() WHERE id = $2",
			slugify(*body.Slug), postID)
	}
	if body.Excerpt != nil {
		a.db.Exec(r.Context(), "UPDATE posts SET excerpt = $1, updated_at = NOW() WHERE id = $2",
			body.Excerpt, postID)
	}
	if body.Body != nil {
		a.db.Exec(r.Context(), "UPDATE posts SET body = $1, updated_at = NOW() WHERE id = $2",
			body.Body, postID)
	}
	if body.PublishedAt != nil {
		a.db.Exec(r.Context(), "UPDATE posts SET published_at = $1, updated_at = NOW() WHERE id = $2",
			body.PublishedAt, postID)
	}
	if body.GameIDs != nil || body.SetIDs != nil || body.CardIDs != nil {
		gameIDs := []int{}
		setIDs := []int{}
		cardIDs := []int{}
		if body.GameIDs != nil {
			gameIDs = *body.GameIDs
		}
		if body.SetIDs != nil {
			setIDs = *body.SetIDs
		}
		if body.CardIDs != nil {
			cardIDs = *body.CardIDs
		}
		a.syncPostTags(r, postID, gameIDs, setIDs, cardIDs)
	}

	jsonResponse(w, map[string]string{"message": "Post updated"}, http.StatusOK)
}

func (a *App) deletePost(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}
	slug := chi.URLParam(r, "slug")
	a.db.Exec(r.Context(), "DELETE FROM posts WHERE slug = $1", slug)
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) unpublishPost(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}
	slug := chi.URLParam(r, "slug")
	result, err := a.db.Exec(r.Context(),
		"UPDATE posts SET published_at = NULL, updated_at = NOW() WHERE slug = $1", slug)
	if err != nil || result.RowsAffected() == 0 {
		jsonError(w, "Post not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, map[string]string{"message": "Post unpublished"}, http.StatusOK)
}

func (a *App) listDraftPosts(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}
	rows, err := a.db.Query(r.Context(), `
		SELECT p.id, u.username, p.title, p.slug, p.excerpt, p.published_at, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonResponse(w, scanPostSummaries(rows), http.StatusOK)
}

func (a *App) getPostAdmin(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if !user.IsAdmin {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return
	}
	slug := chi.URLParam(r, "slug")
	var p Post
	err := a.db.QueryRow(r.Context(), `
		SELECT p.id, p.author_id, u.username, p.title, p.slug, p.excerpt,
		       p.body, p.published_at, p.created_at, p.updated_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		WHERE p.slug = $1
	`, slug).Scan(&p.ID, &p.AuthorID, &p.AuthorName, &p.Title, &p.Slug,
		&p.Excerpt, &p.Body, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		jsonError(w, "Post not found", http.StatusNotFound)
		return
	}
	p.GameTags, p.SetTags, p.CardTags = a.loadPostTags(r, p.ID)
	jsonResponse(w, p, http.StatusOK)
}
