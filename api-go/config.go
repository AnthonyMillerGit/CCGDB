package main

import (
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBName     string
	DBUser     string
	DBPassword string
	DBPort     string

	// JWT
	JWTSecret             string
	AccessTokenExpireDays int

	// App
	AppName        string
	AppURL         string
	AllowedOrigins string
	Port           string
	AssetsDir      string

	// SMTP
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
}

func loadConfig() *Config {
	// Load .env from project root (one level above api-go/)
	_, file, _, _ := runtime.Caller(0)
	envPath := filepath.Join(filepath.Dir(file), "..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("No .env at %s, using environment variables", envPath)
	}

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	expireDays, _ := strconv.Atoi(getEnv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
	assetsDir := filepath.Join(filepath.Dir(file), "..", "assets")

	return &Config{
		DBHost:     getEnv("POSTGRES_HOST", "localhost"),
		DBName:     getEnv("POSTGRES_DB", ""),
		DBUser:     getEnv("POSTGRES_USER", ""),
		DBPassword: getEnv("POSTGRES_PASSWORD", ""),
		DBPort:     getEnv("POSTGRES_PORT", "5432"),

		JWTSecret:             getEnv("JWT_SECRET", ""),
		AccessTokenExpireDays: expireDays,

		AppName:        getEnv("APP_NAME", "CCGVault"),
		AppURL:         getEnv("APP_URL", "http://localhost:5173"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		Port:           getEnv("PORT", "8000"),
		AssetsDir:      assetsDir,

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     smtpPort,
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
