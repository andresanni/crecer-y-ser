#!/usr/bin/env python3
import os
import smtplib
import sys
from email.message import EmailMessage


def load_env(path):
    values = {}
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or "=" not in line:
                continue
            key, val = line.split("=", 1)
            values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def main():
    if len(sys.argv) < 3:
        sys.exit(1)

    status = sys.argv[1]
    body = sys.argv[2]
    env_path = os.environ.get("NOTIFY_ENV_FILE", "/etc/cys-backup-notify.env")

    if not os.path.isfile(env_path):
        sys.exit(0)

    cfg = load_env(env_path)
    host = cfg.get("SMTP_HOST", "smtp.gmail.com")
    port = int(cfg.get("SMTP_PORT", "587"))
    user = cfg.get("SMTP_USER", "")
    password = cfg.get("SMTP_PASS", "")
    mail_to = cfg.get("NOTIFY_TO", "")
    mail_from = cfg.get("NOTIFY_FROM", user)

    if not (user and password and mail_to):
        sys.exit(0)

    msg = EmailMessage()
    msg["Subject"] = f"[{status}] Backup VPS Crecer y Ser"
    msg["From"] = mail_from
    msg["To"] = mail_to
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, password)
        server.send_message(msg)


if __name__ == "__main__":
    main()
