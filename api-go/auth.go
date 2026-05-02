package main

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const userContextKey contextKey = "user"

// ── Password helpers ──────────────────────────────────────────────────────────

func hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func verifyPassword(plain, hashed string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)) == nil
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

func (a *App) createToken(userID int) (string, error) {
	expiry := time.Now().Add(time.Duration(a.cfg.AccessTokenExpireDays) * 24 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": strconv.Itoa(userID),
		"exp": expiry.Unix(),
	})
	return token.SignedString([]byte(a.cfg.JWTSecret))
}

func (a *App) parseToken(tokenStr string) (int, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(a.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid claims")
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		return 0, fmt.Errorf("missing sub")
	}
	return strconv.Atoi(sub)
}

// ── Auth middleware ───────────────────────────────────────────────────────────

func (a *App) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			jsonError(w, "Not authenticated", http.StatusUnauthorized)
			return
		}
		userID, err := a.parseToken(strings.TrimPrefix(authHeader, "Bearer "))
		if err != nil {
			jsonError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}
		var user User
		err = a.db.QueryRow(r.Context(),
			"SELECT id, username, email, display_name, avatar_color, is_verified, is_admin, created_at FROM users WHERE id = $1",
			userID,
		).Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.AvatarColor, &user.IsVerified, &user.IsAdmin, &user.CreatedAt)
		if err != nil {
			jsonError(w, "User not found", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getUser(r *http.Request) User {
	return r.Context().Value(userContextKey).(User)
}
