package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
)

type App struct {
	db  *pgxpool.Pool
	cfg *Config
}

func main() {
	cfg := loadConfig()

	db, err := connectDB(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable must be set")
	}

	app := &App{db: db, cfg: cfg}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, app.routes()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func (a *App) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)

	c := cors.New(cors.Options{
		AllowedOrigins:   strings.Split(a.cfg.AllowedOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	r.Use(c.Handler)

	// Static assets (card images, card backs)
	if _, err := os.Stat(a.cfg.AssetsDir); err == nil {
		r.Handle("/assets/*",
			http.StripPrefix("/assets", http.FileServer(http.Dir(a.cfg.AssetsDir))))
	}

	// Catch-all OPTIONS handler so chi doesn't return 405 on CORS preflights
	r.Options("/*", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// ── Public routes ─────────────────────────────────────────────────────────
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, map[string]string{"message": "CCG Platform API", "version": "0.1.0"}, http.StatusOK)
	})

	r.Get("/api/stats", a.getStats)
	r.Get("/api/games", a.getGames)
	r.Get("/api/games/{slug}", a.getGame)
	r.Get("/api/games/{slug}/sets", a.getGameSets)

	// Specific set routes before parameterized card route
	r.Get("/api/sets/{setID}", a.getSet)
	r.Get("/api/sets/{setID}/cards", a.getSetCards)

	// /api/cards/search, /api/cards/random, /api/cards/random-one must be before /api/cards/{cardID}
	r.Get("/api/cards/search", a.searchCards)
	r.Get("/api/cards/random", a.randomCards)
	r.Get("/api/cards/random-one", a.randomCard)
	r.Get("/api/cards/{cardID}", a.getCard)
	r.Get("/api/printings/{printingID}", a.getPrinting)
	r.Get("/api/search/suggestions", a.searchSuggestions)
	r.Get("/api/search/mentions", a.searchMentions)

	// Blog — public
	r.Get("/api/blog", a.listPosts)
	r.Get("/api/blog/{slug}", a.getPost)
	r.Get("/api/games/{slug}/posts", a.getGamePosts)
	r.Get("/api/cards/{cardID}/posts", a.getCardPosts)

	loginLimiter    := newRateLimiter(10, 15*time.Minute)
	registerLimiter := newRateLimiter(5, time.Hour)
	resetLimiter    := newRateLimiter(5, time.Hour)

	r.Post("/api/auth/register", registerLimiter.middleware(a.register))
	r.Post("/api/auth/login", loginLimiter.middleware(a.login))
	r.Get("/api/auth/verify-email", a.verifyEmail)
	r.Post("/api/auth/forgot-password", resetLimiter.middleware(a.forgotPassword))
	r.Post("/api/auth/reset-password", resetLimiter.middleware(a.resetPassword))

	// ── Authenticated routes ──────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(a.requireAuth)

		r.Get("/api/auth/me", a.me)
		r.Patch("/api/auth/me", a.updateProfile)
		r.Post("/api/auth/resend-verification", a.resendVerification)

		// Blog — admin
		r.Get("/api/admin/posts", a.listDraftPosts)
		r.Get("/api/admin/posts/{slug}", a.getPostAdmin)
		r.Post("/api/admin/posts", a.createPost)
		r.Patch("/api/admin/posts/{slug}", a.updatePost)
		r.Post("/api/admin/posts/{slug}/unpublish", a.unpublishPost)
		r.Delete("/api/admin/posts/{slug}", a.deletePost)

		// Collection — specific paths before parameterized ones
		r.Get("/api/users/me/collection", a.getCollection)
		r.Post("/api/users/me/collection", a.addToCollection)
		r.Get("/api/users/me/collection/stats", a.getCollectionStats)
		r.Get("/api/users/me/collection/export", a.exportCollection)
		r.Post("/api/users/me/collection/upload", a.importCollection)
		r.Delete("/api/users/me/collection/game/{gameID}", a.clearCollectionForGame)
		r.Get("/api/users/me/collection/set/{setID}", a.getCollectionForSet)
		r.Post("/api/users/me/collection/set/{setID}", a.addSetToCollection)
		r.Get("/api/users/me/collection/set/{setID}/missing", a.getMissingCardsForSet)
		r.Get("/api/users/me/collection/printing/{printingID}", a.getCollectionItem)
		r.Patch("/api/users/me/collection/{printingID}", a.updateCollectionQuantity)
		r.Delete("/api/users/me/collection/{printingID}", a.removeFromCollection)

		// Wishlist
		r.Get("/api/users/me/wishlist", a.getWishlist)
		r.Post("/api/users/me/wishlist", a.addToWishlist)
		r.Get("/api/users/me/wishlist/check/{printingID}", a.checkWishlistItem)
		r.Post("/api/users/me/wishlist/set/{setID}", a.addMissingSetToWishlist)
		r.Delete("/api/users/me/wishlist", a.clearWishlist)
		r.Delete("/api/users/me/wishlist/{printingID}", a.removeFromWishlist)

		// Favorite games
		r.Get("/api/users/me/favorites/games", a.getFavoriteGames)
		r.Post("/api/users/me/favorites/games/{gameID}", a.addFavoriteGame)
		r.Delete("/api/users/me/favorites/games/{gameID}", a.removeFavoriteGame)

		// Decks
		r.Get("/api/users/me/decks", a.listDecks)
		r.Post("/api/users/me/decks", a.createDeck)
		r.Get("/api/decks/{deckID}", a.getDeck)
		r.Get("/api/decks/{deckID}/export", a.exportDeck)
		r.Post("/api/decks/upload", a.importDeck)
		r.Patch("/api/decks/{deckID}", a.updateDeck)
		r.Delete("/api/decks/{deckID}", a.deleteDeck)
		r.Post("/api/decks/{deckID}/copy", a.copyDeck)
		r.Post("/api/decks/{deckID}/cards", a.addCardToDeck)
		r.Patch("/api/decks/{deckID}/cards/{cardID}", a.updateDeckCard)
		r.Delete("/api/decks/{deckID}/cards/{cardID}", a.removeCardFromDeck)
	})

	return r
}
