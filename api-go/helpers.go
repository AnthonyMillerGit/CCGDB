package main

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func jsonResponse(w http.ResponseWriter, data any, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	jsonResponse(w, map[string]string{"detail": message}, status)
}

func parseIntParam(r *http.Request, name string) (int, error) {
	return strconv.Atoi(chi.URLParam(r, name))
}

func parseIntQuery(r *http.Request, name string, fallback int) int {
	return parseIntQueryMax(r, name, fallback, 100)
}

func parseIntQueryMax(r *http.Request, name string, fallback, max int) int {
	s := r.URL.Query().Get(name)
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 1 {
		return fallback
	}
	if v > max {
		return max
	}
	return v
}
