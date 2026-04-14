package main

import (
	"fmt"
	"net/smtp"
)

func (a *App) sendEmail(to, subject, body string) error {
	if a.cfg.SMTPHost == "" {
		fmt.Printf("\n── DEV EMAIL ──────────────────────────\nTo: %s\nSubject: %s\n\n%s\n───────────────────────────────────────\n",
			to, subject, body)
		return nil
	}
	addr := fmt.Sprintf("%s:%d", a.cfg.SMTPHost, a.cfg.SMTPPort)
	auth := smtp.PlainAuth("", a.cfg.SMTPUser, a.cfg.SMTPPassword, a.cfg.SMTPHost)
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		a.cfg.SMTPFrom, to, subject, body)
	return smtp.SendMail(addr, auth, a.cfg.SMTPFrom, []string{to}, []byte(msg))
}
