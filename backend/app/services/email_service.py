"""
Email service with two backends:
- console (default in dev): prints the email to stdout so you can grab reset links without SMTP
- smtp: sends real email via SMTP (configure SMTP_HOST etc. in .env)
"""
import smtplib
import ssl
import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import get_settings

log = structlog.get_logger(__name__)
settings = get_settings()


def _build_message(to: str, subject: str, html: str, text: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    msg["To"] = to
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def send_email(to: str, subject: str, html: str, text: str) -> None:
    if settings.EMAIL_BACKEND == "console" or not settings.SMTP_HOST:
        _send_console(to, subject, text)
        return
    _send_smtp(to, subject, html, text)


def _send_console(to: str, subject: str, text: str) -> None:
    """Dev mode: print email to stdout so the developer can read the reset link."""
    border = "=" * 60
    log.info(
        "email.console",
        to=to,
        subject=subject,
    )
    print(f"\n{border}")
    print(f"  DEV EMAIL — To: {to}")
    print(f"  Subject: {subject}")
    print(border)
    print(text)
    print(f"{border}\n")


def _send_smtp(to: str, subject: str, html: str, text: str) -> None:
    msg = _build_message(to, subject, html, text)
    context = ssl.create_default_context()
    try:
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM_ADDRESS, to, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM_ADDRESS, to, msg.as_string())
        log.info("email.sent", to=to, subject=subject)
    except Exception as exc:
        log.error("email.send_failed", to=to, subject=subject, error=str(exc))
        raise


# ─── Templates ────────────────────────────────────────────────────────────────

def send_password_reset_email(to: str, name: str, reset_url: str) -> None:
    subject = "Reset your My Avatar password"
    text = (
        f"Hi {name},\n\n"
        f"You requested a password reset for your My Avatar account.\n\n"
        f"Click the link below to reset your password (valid for 1 hour):\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email.\n\n"
        f"— The My Avatar Team"
    )
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f14;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:40px auto;padding:40px;background:#1a1a2e;border-radius:16px;border:1px solid #2a2a3e;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;">Reset your password</h1>
    <p style="margin:0 0 24px;color:#888;font-size:14px;">Hi {name}, we received a request to reset your My Avatar password.</p>
    <a href="{reset_url}"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
      Reset password
    </a>
    <p style="margin:24px 0 0;color:#666;font-size:13px;">
      This link expires in <strong style="color:#888;">1 hour</strong>. If you didn't request a reset, ignore this email — your password won't change.
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #2a2a3e;">
    <p style="margin:0;color:#555;font-size:12px;">My Avatar · Made for creators</p>
  </div>
</body>
</html>
"""
    send_email(to, subject, html, text)
