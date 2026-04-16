package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func (a *App) sendEmail(to, subject, body string) error {
	if a.cfg.ResendAPIKey == "" {
		fmt.Printf("\n── DEV EMAIL ──────────────────────────\nTo: %s\nSubject: %s\n\n%s\n───────────────────────────────────────\n",
			to, subject, body)
		return nil
	}

	payload := map[string]any{
		"from":    "CCGVault <noreply@ccgvault.io>",
		"to":      []string{to},
		"subject": subject,
		"text":    body,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+a.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend API error: %s", resp.Status)
	}
	return nil
}
