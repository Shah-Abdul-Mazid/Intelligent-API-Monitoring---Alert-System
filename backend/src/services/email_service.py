import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict

from src.core.config import settings
from src.core.logging import logger


class EmailService:
    @classmethod
    def send_anomaly_alert(cls, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        subject = f"[{alert_data.get('severity', 'WARNING')}] Incident Alert: {alert_data.get('api_name')}"
        recipient = settings.ALERT_RECIPIENT_EMAIL

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="background-color: #f8d7da; border-left: 6px solid #dc3545; padding: 15px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #721c24;">{subject}</h2>
            </div>
            <p><strong>Service:</strong> {alert_data.get('api_name')}</p>
            <p><strong>HTTP Status:</strong> {alert_data.get('status_code')}</p>
            <p><strong>Latency:</strong> {alert_data.get('response_time_ms')} ms</p>
            <p><strong>Records:</strong> {alert_data.get('records_returned')}</p>
            <p><strong>Severity:</strong> {alert_data.get('severity')}</p>
            
            <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;">
            
            <h3 style="color: #0d6efd;">Summary:</h3>
            <blockquote style="font-size: 1.05em; background: #f0f4f8; padding: 12px; border-left: 4px solid #0d6efd; margin: 10px 0;">
                {alert_data.get('ai_alert_message')}
            </blockquote>
            
            <p><strong>Root Cause:</strong> {alert_data.get('ai_root_cause')}</p>
            <p><strong>Recommended Action:</strong> {alert_data.get('ai_recommendation')}</p>
        </body>
        </html>
        """

        if settings.EMAIL_ENABLED and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.SMTP_USER
                msg["To"] = recipient
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_USER, recipient, msg.as_string())

                logger.info(f"Alert email sent to {recipient}")
                return {"status": "sent", "recipient": recipient, "mode": "smtp"}
            except Exception as e:
                logger.error(f"Failed to send email: {e}")
                return {"status": "failed", "error": str(e), "mode": "smtp"}

        logger.info(f"Email notification logged to {recipient}: {subject}")
        return {
            "status": "logged",
            "recipient": recipient,
            "mode": "dev",
            "subject": subject,
        }
