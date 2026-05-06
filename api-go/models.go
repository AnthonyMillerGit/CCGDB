package main

import (
	"encoding/json"
	"time"
)

// ── Games ─────────────────────────────────────────────────────────────────────

type Game struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Slug          string  `json:"slug"`
	Description   string  `json:"description"`
	CardBackImage *string `json:"card_back_image"`
}

// ── Sets ──────────────────────────────────────────────────────────────────────

type SetSummary struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	ReleaseDate *string `json:"release_date"`
	TotalCards  *int    `json:"total_cards"`
	IconURL     *string `json:"icon_url"`
	SetType     *string `json:"set_type"`
	Publisher   *string `json:"publisher"`
}

type RecentSet struct {
	SetID         int     `json:"set_id"`
	SetName       string  `json:"set_name"`
	ReleaseDate   *string `json:"release_date"`
	TotalCards    *int    `json:"total_cards"`
	GameName      string  `json:"game_name"`
	GameSlug      string  `json:"game_slug"`
	CardBackImage *string `json:"card_back_image"`
}

type SetDetail struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	ReleaseDate *string `json:"release_date"`
	GameName    string  `json:"game_name"`
	GameSlug    string  `json:"game_slug"`
}

type SetCard struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	CardType        string  `json:"card_type"`
	RulesText       *string `json:"rules_text"`
	PrintingID      int     `json:"printing_id"`
	CollectorNumber *string `json:"collector_number"`
	Rarity          *string `json:"rarity"`
	ImageURL        *string `json:"image_url"`
	Artist          *string `json:"artist"`
}

// ── Cards ─────────────────────────────────────────────────────────────────────

type CardSummary struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	CardType string  `json:"card_type"`
	RulesText *string `json:"rules_text"`
	Game     string  `json:"game"`
	GameName string  `json:"game_name"`
	ImageURL *string `json:"image_url"`
}

type Printing struct {
	ID              int     `json:"id"`
	CollectorNumber *string `json:"collector_number"`
	Rarity          *string `json:"rarity"`
	ImageURL        *string `json:"image_url"`
	BackImageURL    *string `json:"back_image_url"`
	Artist          *string `json:"artist"`
	FlavorText      *string `json:"flavor_text"`
	SetID           int     `json:"set_id"`
	SetName         string  `json:"set_name"`
	SetCode         string  `json:"set_code"`
	ReleaseDate     *string `json:"release_date"`
}

type CardDetail struct {
	ID         int             `json:"id"`
	Name       string          `json:"name"`
	CardType   string          `json:"card_type"`
	RulesText  *string         `json:"rules_text"`
	Attributes json.RawMessage `json:"attributes"`
	GameID     int             `json:"game_id"`
	Game       string          `json:"game"`
	GameSlug   string          `json:"game_slug"`
	Printings  []Printing      `json:"printings"`
}

type PrintingDetail struct {
	ID              int             `json:"id"`
	CollectorNumber *string         `json:"collector_number"`
	Rarity          *string         `json:"rarity"`
	ImageURL        *string         `json:"image_url"`
	BackImageURL    *string         `json:"back_image_url"`
	Artist          *string         `json:"artist"`
	FlavorText      *string         `json:"flavor_text"`
	SetName         string          `json:"set_name"`
	SetCode         string          `json:"set_code"`
	ReleaseDate     *string         `json:"release_date"`
	CardID          int             `json:"card_id"`
	CardName        string          `json:"card_name"`
	CardType        string          `json:"card_type"`
	RulesText       *string         `json:"rules_text"`
	Attributes      json.RawMessage `json:"attributes"`
	Game            string          `json:"game"`
	GameSlug        string          `json:"game_slug"`
}

// ── Auth ──────────────────────────────────────────────────────────────────────

type User struct {
	ID          int       `json:"id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
	AvatarColor string    `json:"avatar_color"`
	IsVerified  bool      `json:"is_verified"`
	IsAdmin     bool      `json:"is_admin"`
	CreatedAt   time.Time `json:"created_at"`
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	AvatarColor *string `json:"avatar_color"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// ── Collection ────────────────────────────────────────────────────────────────

type CollectionCard struct {
	ID              int       `json:"id"`
	PrintingID      int       `json:"printing_id"`
	Quantity        int       `json:"quantity"`
	Finish          string    `json:"finish"`
	Condition       string    `json:"condition"`
	AddedAt         time.Time `json:"added_at"`
	ImageURL        *string   `json:"image_url"`
	Rarity          *string   `json:"rarity"`
	CollectorNumber *string   `json:"collector_number"`
	CardID          int       `json:"card_id"`
	CardName        string    `json:"card_name"`
	SetID           int       `json:"set_id"`
	SetName         string    `json:"set_name"`
}

type CollectionGroup struct {
	GameID   int              `json:"game_id"`
	GameName string           `json:"game_name"`
	GameSlug string           `json:"game_slug"`
	Cards    []CollectionCard `json:"cards"`
}

type CollectionItem struct {
	ID         int       `json:"id"`
	PrintingID int       `json:"printing_id"`
	Quantity   int       `json:"quantity"`
	Finish     string    `json:"finish"`
	Condition  string    `json:"condition"`
	AddedAt    time.Time `json:"added_at"`
}

type CollectionCardItem struct {
	ID              int       `json:"id"`
	PrintingID      int       `json:"printing_id"`
	Quantity        int       `json:"quantity"`
	Finish          string    `json:"finish"`
	Condition       string    `json:"condition"`
	AddedAt         time.Time `json:"added_at"`
	SetID           int       `json:"set_id"`
	SetName         string    `json:"set_name"`
	SetCode         string    `json:"set_code"`
	ReleaseDate     *string   `json:"release_date"`
	CollectorNumber *string   `json:"collector_number"`
	Rarity          *string   `json:"rarity"`
	ImageURL        *string   `json:"image_url"`
}

type CollectionAddRequest struct {
	PrintingID int    `json:"printing_id"`
	Quantity   int    `json:"quantity"`
	Finish     string `json:"finish"`
	Condition  string `json:"condition"`
}

type CollectionUpdateRequest struct {
	Quantity  int    `json:"quantity"`
	Finish    string `json:"finish"`
	Condition string `json:"condition"`
}

// ── Decks ─────────────────────────────────────────────────────────────────────

type DeckSummary struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Format       string    `json:"format"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	GameID       int       `json:"game_id"`
	GameName     string    `json:"game_name"`
	GameSlug     string    `json:"game_slug"`
	CardCount    int       `json:"card_count"`
	TotalCards   int       `json:"total_cards"`
	ThumbnailURL *string   `json:"thumbnail_url"`
}

type DeckCard struct {
	ID         int             `json:"id"`
	CardID     int             `json:"card_id"`
	Quantity   int             `json:"quantity"`
	CardName   string          `json:"card_name"`
	CardType   string          `json:"card_type"`
	Attributes json.RawMessage `json:"attributes"`
	GameName   string          `json:"game_name"`
	GameSlug   string          `json:"game_slug"`
	ImageURL   *string         `json:"image_url"`
}

type DeckDetail struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Format      string     `json:"format"`
	UserID      int        `json:"user_id"`
	GameID      int        `json:"game_id"`
	GameName    string     `json:"game_name"`
	GameSlug    string     `json:"game_slug"`
	Cards       []DeckCard `json:"cards"`
}

type CreateDeckRequest struct {
	GameID      int    `json:"game_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Format      string `json:"format"`
}

type UpdateDeckRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Format      *string `json:"format"`
}

type DeckCardRequest struct {
	CardID   int `json:"card_id"`
	Quantity int `json:"quantity"`
}

type DeckCardUpdateRequest struct {
	Quantity int `json:"quantity"`
}
