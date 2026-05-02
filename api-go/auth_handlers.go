package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func secureToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (a *App) register(w http.ResponseWriter, r *http.Request) {
	var body RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	username := strings.ToLower(strings.TrimSpace(body.Username))
	email := strings.ToLower(strings.TrimSpace(body.Email))

	if len(username) < 3 || len(username) > 30 {
		jsonError(w, "Username must be 3–30 characters", http.StatusBadRequest)
		return
	}
	if len(email) == 0 || len(email) > 255 {
		jsonError(w, "Invalid email address", http.StatusBadRequest)
		return
	}
	if len(body.Password) < 8 || len(body.Password) > 128 {
		jsonError(w, "Password must be 8–128 characters", http.StatusBadRequest)
		return
	}

	var exists bool
	a.db.QueryRow(r.Context(),
		"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 OR username = $2)",
		email, username,
	).Scan(&exists)
	if exists {
		jsonError(w, "Username or email already in use", http.StatusConflict)
		return
	}

	hash, err := hashPassword(body.Password)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	var user User
	err = a.db.QueryRow(r.Context(),
		"INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, display_name, avatar_color, is_verified, is_admin, created_at",
		username, email, hash,
	).Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.AvatarColor, &user.IsVerified, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	token := secureToken()
	expires := time.Now().UTC().Add(24 * time.Hour)
	_, err = a.db.Exec(r.Context(),
		"INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
		user.ID, token, expires,
	)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	authToken, err := a.createToken(user.ID)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	go a.sendEmail(body.Email,
		fmt.Sprintf("Verify your %s email", a.cfg.AppName),
		fmt.Sprintf("Hi %s,\n\nPlease verify your email address by clicking the link below:\n\n%s/verify-email?token=%s\n\nThis link expires in 24 hours.\n\nThanks,\n%s",
			body.Username, a.cfg.AppURL, token, a.cfg.AppName),
	)

	jsonResponse(w, AuthResponse{Token: authToken, User: user}, http.StatusCreated)
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var body LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user User
	var passwordHash string
	err := a.db.QueryRow(r.Context(),
		"SELECT id, username, email, password_hash, display_name, avatar_color, is_verified, is_admin, created_at FROM users WHERE email = $1",
		strings.ToLower(strings.TrimSpace(body.Email)),
	).Scan(&user.ID, &user.Username, &user.Email, &passwordHash, &user.DisplayName, &user.AvatarColor, &user.IsVerified, &user.IsAdmin, &user.CreatedAt)
	if err != nil || !verifyPassword(body.Password, passwordHash) {
		jsonError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	authToken, err := a.createToken(user.ID)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, AuthResponse{Token: authToken, User: user}, http.StatusOK)
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, getUser(r), http.StatusOK)
}

func (a *App) verifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		jsonError(w, "Token required", http.StatusBadRequest)
		return
	}

	var id, userID int
	var expiresAt time.Time
	var usedAt *time.Time
	err := a.db.QueryRow(r.Context(),
		"SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token = $1",
		token,
	).Scan(&id, &userID, &expiresAt, &usedAt)
	if err != nil {
		jsonError(w, "Invalid verification link", http.StatusBadRequest)
		return
	}
	if usedAt != nil {
		jsonError(w, "This link has already been used", http.StatusBadRequest)
		return
	}
	if time.Now().UTC().After(expiresAt) {
		jsonError(w, "This link has expired", http.StatusBadRequest)
		return
	}

	if _, err := a.db.Exec(r.Context(), "UPDATE users SET is_verified = TRUE WHERE id = $1", userID); err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}
	a.db.Exec(r.Context(), "UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1", id)

	jsonResponse(w, map[string]string{"message": "Email verified successfully"}, http.StatusOK)
}

func (a *App) resendVerification(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	if user.IsVerified {
		jsonError(w, "Email is already verified", http.StatusBadRequest)
		return
	}

	token := secureToken()
	expires := time.Now().UTC().Add(24 * time.Hour)
	_, err := a.db.Exec(r.Context(),
		"INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
		user.ID, token, expires,
	)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	go a.sendEmail(user.Email,
		fmt.Sprintf("Verify your %s email", a.cfg.AppName),
		fmt.Sprintf("Hi %s,\n\nPlease verify your email address:\n\n%s/verify-email?token=%s\n\nThis link expires in 24 hours.\n\nThanks,\n%s",
			user.Username, a.cfg.AppURL, token, a.cfg.AppName),
	)

	jsonResponse(w, map[string]string{"message": "Verification email sent"}, http.StatusOK)
}

func (a *App) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var body ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	const safeMsg = "If that email is registered, you'll receive a reset link shortly"

	var userID int
	var username string
	err := a.db.QueryRow(r.Context(),
		"SELECT id, username FROM users WHERE email = $1", body.Email,
	).Scan(&userID, &username)
	if err != nil {
		// Don't leak whether the email exists
		jsonResponse(w, map[string]string{"message": safeMsg}, http.StatusOK)
		return
	}

	token := secureToken()
	expires := time.Now().UTC().Add(time.Hour)
	if _, err := a.db.Exec(r.Context(),
		"INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
		userID, token, expires,
	); err != nil {
		jsonResponse(w, map[string]string{"message": safeMsg}, http.StatusOK)
		return
	}

	go a.sendEmail(body.Email,
		fmt.Sprintf("Reset your %s password", a.cfg.AppName),
		fmt.Sprintf("Hi %s,\n\nClick the link below to reset your password:\n\n%s/reset-password?token=%s\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nThanks,\n%s",
			username, a.cfg.AppURL, token, a.cfg.AppName),
	)

	jsonResponse(w, map[string]string{"message": safeMsg}, http.StatusOK)
}

func (a *App) resetPassword(w http.ResponseWriter, r *http.Request) {
	var body ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var id, userID int
	var expiresAt time.Time
	var usedAt *time.Time
	err := a.db.QueryRow(r.Context(),
		"SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token = $1",
		body.Token,
	).Scan(&id, &userID, &expiresAt, &usedAt)
	if err != nil {
		jsonError(w, "Invalid reset link", http.StatusBadRequest)
		return
	}
	if usedAt != nil {
		jsonError(w, "This link has already been used", http.StatusBadRequest)
		return
	}
	if time.Now().UTC().After(expiresAt) {
		jsonError(w, "This link has expired", http.StatusBadRequest)
		return
	}

	if len(body.Password) < 8 || len(body.Password) > 128 {
		jsonError(w, "Password must be 8–128 characters", http.StatusBadRequest)
		return
	}

	hash, err := hashPassword(body.Password)
	if err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}

	if _, err := a.db.Exec(r.Context(), "UPDATE users SET password_hash = $1 WHERE id = $2", hash, userID); err != nil {
		jsonError(w, "Server error", http.StatusInternalServerError)
		return
	}
	a.db.Exec(r.Context(), "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", id)

	jsonResponse(w, map[string]string{"message": "Password updated successfully"}, http.StatusOK)
}

func (a *App) updateProfile(w http.ResponseWriter, r *http.Request) {
	user := getUser(r)
	var body UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.DisplayName != nil {
		name := strings.TrimSpace(*body.DisplayName)
		if len(name) > 50 {
			jsonError(w, "Display name must be 50 characters or fewer", http.StatusBadRequest)
			return
		}
		a.db.Exec(r.Context(), "UPDATE users SET display_name = $1 WHERE id = $2", name, user.ID)
	}

	if body.AvatarColor != nil {
		color := strings.TrimSpace(*body.AvatarColor)
		if len(color) != 7 || color[0] != '#' {
			jsonError(w, "Invalid color format", http.StatusBadRequest)
			return
		}
		a.db.Exec(r.Context(), "UPDATE users SET avatar_color = $1 WHERE id = $2", color, user.ID)
	}

	var updated User
	a.db.QueryRow(r.Context(),
		"SELECT id, username, email, display_name, avatar_color, is_verified, is_admin, created_at FROM users WHERE id = $1",
		user.ID,
	).Scan(&updated.ID, &updated.Username, &updated.Email, &updated.DisplayName, &updated.AvatarColor,
		&updated.IsVerified, &updated.IsAdmin, &updated.CreatedAt)

	jsonResponse(w, updated, http.StatusOK)
}
