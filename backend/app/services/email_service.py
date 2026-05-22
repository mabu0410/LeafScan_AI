"""
Email Service - Gửi email qua SMTP (Gmail App Password hoặc bất kỳ SMTP provider).

Cấu hình qua biến môi trường:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASSWORD=your-app-password
  SMTP_FROM_NAME=LeafScan AI
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Leaf_AI")


def is_email_configured() -> bool:
    """Kiểm tra SMTP đã được cấu hình chưa."""
    return bool(SMTP_USER and SMTP_PASSWORD)


def send_otp_email(to_email: str, otp: str, expire_minutes: int = 10) -> bool:
    """
    Gửi email chứa mã OTP reset mật khẩu.
    Returns True nếu gửi thành công, False nếu thất bại.
    """
    if not is_email_configured():
        logger.warning(
            "SMTP chưa cấu hình (SMTP_USER/SMTP_PASSWORD trống). "
            "OTP chỉ được log ra console."
        )
        return False

    subject = "Leaf_AI - Mã xác nhận đặt lại mật khẩu"
    html_body = _build_otp_html(otp, expire_minutes)
    text_body = (
        f"[Leaf_AI] Mã OTP của bạn là: {otp}\n\n"
        f"Mã có hiệu lực trong {expire_minutes} phút.\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n"
        "— Đội ngũ Leaf_AI"
    )

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        logger.info("OTP email sent successfully to %s", to_email)
        return True

    except Exception:
        logger.exception("Failed to send OTP email to %s", to_email)
        return False


def _build_otp_html(otp: str, expire_minutes: int) -> str:
    """Tạo HTML email đẹp, dễ nhìn cho OTP — thương hiệu Leaf_AI."""
    otp_digits = "".join(
        f'<td style="width:44px;height:52px;text-align:center;font-size:26px;font-weight:800;'
        f'background:#E8F5E9;border:2px solid #66BB6A;border-radius:10px;color:#1B5E20;'
        f'font-family:monospace;letter-spacing:1px;">{digit}</td>'
        for digit in otp
    )

    return f"""\
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F1F8E9;font-family:-apple-system,BlinkMacSystemFont,
             'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:440px;background:#FFFFFF;border-radius:20px;
                      box-shadow:0 4px 24px rgba(46,125,50,0.08);overflow:hidden;">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#2E7D32 0%,#43A047 50%,#66BB6A 100%);
                       padding:28px 24px;text-align:center;">
              <div style="font-size:32px;margin-bottom:6px;">🍃</div>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;
                         letter-spacing:0.5px;">Leaf_AI</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:12px;
                        font-weight:500;">Trợ lý chẩn đoán bệnh cây thông minh</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 20px;">
              <p style="margin:0 0 8px;color:#333;font-size:15px;font-weight:600;">
                Xin chào! 👋
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
                Bạn vừa yêu cầu đặt lại mật khẩu tài khoản Leaf_AI.
                Nhập mã bên dưới vào ứng dụng để tiếp tục:
              </p>

              <!-- OTP Box -->
              <table cellpadding="0" cellspacing="6" style="margin:0 auto;">
                <tr>{otp_digits}</tr>
              </table>

              <p style="margin:20px 0 0;text-align:center;color:#888;font-size:12px;">
                ⏱ Mã có hiệu lực trong <strong style="color:#2E7D32;">{expire_minutes} phút</strong>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none;border-top:1px solid #E8F5E9;margin:0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px 28px;">
              <p style="margin:0 0 8px;color:#999;font-size:12px;line-height:1.6;text-align:center;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                Tài khoản của bạn vẫn an toàn.
              </p>
              <p style="margin:0;color:#AAA;font-size:11px;text-align:center;">
                — Đội ngũ <strong>Leaf_AI</strong> 🌱
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
