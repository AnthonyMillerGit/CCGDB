package main

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

type rateLimiter struct {
	mu      sync.Mutex
	entries map[string][]time.Time
	limit   int
	window  time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		entries: make(map[string][]time.Time),
		limit:   limit,
		window:  window,
	}
	// Periodically clean up old entries
	go func() {
		for range time.Tick(5 * time.Minute) {
			rl.mu.Lock()
			cutoff := time.Now().Add(-rl.window)
			for ip, times := range rl.entries {
				filtered := pruneOld(times, cutoff)
				if len(filtered) == 0 {
					delete(rl.entries, ip)
				} else {
					rl.entries[ip] = filtered
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func pruneOld(times []time.Time, cutoff time.Time) []time.Time {
	i := 0
	for i < len(times) && times[i].Before(cutoff) {
		i++
	}
	return times[i:]
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-rl.window)
	rl.entries[ip] = pruneOld(rl.entries[ip], cutoff)
	if len(rl.entries[ip]) >= rl.limit {
		return false
	}
	rl.entries[ip] = append(rl.entries[ip], now)
	return true
}

func (rl *rateLimiter) middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := realIP(r)
		if !rl.allow(ip) {
			jsonError(w, "Too many requests, please try again later", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}

func realIP(r *http.Request) string {
	// Use RemoteAddr only — X-Forwarded-For and X-Real-IP can be spoofed by
	// clients and must not be trusted for rate limiting without a verified
	// trusted-proxy config. When deploying behind a reverse proxy, configure
	// the proxy to use PROXY protocol or handle rate limiting at the proxy layer.
	addr := r.RemoteAddr
	if i := strings.LastIndex(addr, ":"); i != -1 {
		return addr[:i]
	}
	return addr
}
