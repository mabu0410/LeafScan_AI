"""
Browser-facing VNPAY return page helpers.
"""
from __future__ import annotations

from html import escape
from urllib.parse import urlencode

from fastapi.responses import HTMLResponse


APP_PAYMENT_RESULT_PATH = "leafscan://payment-result"


def infer_payment_type(txn_ref: str, fallback: str = "unknown") -> str:
    if txn_ref.startswith("USER"):
        return "user"
    if txn_ref.startswith("PARTNER"):
        return "partner"
    return fallback


def _status_from_vnpay(response_code: str, transaction_status: str) -> str:
    if response_code == "00" and (not transaction_status or transaction_status == "00"):
        return "success"
    if response_code:
        return "failed"
    return "pending"


def _status_copy(status: str) -> tuple[str, str, str, str]:
    if status == "success":
        return (
            "Thanh toán thành công",
            "VNPAY đã trả về kết quả thành công. Ứng dụng sẽ kiểm tra xác nhận từ server để kích hoạt gói.",
            "#007C39",
            "✓",
        )
    if status == "failed":
        return (
            "Thanh toán chưa thành công",
            "Giao dịch đã bị hủy hoặc không hoàn tất. Bạn có thể quay lại ứng dụng để thử lại.",
            "#D64545",
            "!",
        )
    return (
        "Đã nhận kết quả thanh toán",
        "Ứng dụng đang chờ server xác nhận trạng thái giao dịch từ VNPAY.",
        "#D97300",
        "…",
    )


def render_vnpay_return_page(params: dict[str, str], payment_type: str | None = None) -> HTMLResponse:
    txn_ref = str(params.get("vnp_TxnRef") or "")
    response_code = str(params.get("vnp_ResponseCode") or "")
    transaction_status = str(params.get("vnp_TransactionStatus") or "")
    vnp_transaction_no = str(params.get("vnp_TransactionNo") or "")
    resolved_type = payment_type or infer_payment_type(txn_ref)
    status = _status_from_vnpay(response_code, transaction_status)
    title, body, color, symbol = _status_copy(status)

    app_query = urlencode({
        'paymentType': resolved_type,
        'txnRef': txn_ref,
        'responseCode': response_code,
        'transactionStatus': transaction_status,
        'transactionNo': vnp_transaction_no,
        'status': status,
    })
    app_url = f"{APP_PAYMENT_RESULT_PATH}?{app_query}"

    html = f"""<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fffdf8;
      color: #171326;
    }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      box-sizing: border-box;
    }}
    main {{
      width: min(440px, 100%);
      border: 1px solid #e3ebdd;
      border-radius: 12px;
      background: #ffffff;
      padding: 28px 22px;
      box-shadow: 0 18px 40px rgba(23, 19, 38, 0.08);
      text-align: center;
    }}
    .icon {{
      width: 72px;
      height: 72px;
      border-radius: 50%;
      margin: 0 auto 18px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, {color} 14%, white);
      color: {color};
      font-size: 38px;
      font-weight: 900;
    }}
    h1 {{
      margin: 0;
      font-size: 24px;
      line-height: 1.25;
      font-weight: 900;
    }}
    p {{
      margin: 10px 0 0;
      color: #6f7180;
      font-size: 15px;
      line-height: 1.55;
    }}
    dl {{
      margin: 20px 0 0;
      text-align: left;
      border-radius: 8px;
      background: #f6f7f3;
      padding: 12px;
    }}
    .row {{
      display: flex;
      gap: 12px;
      justify-content: space-between;
      font-size: 13px;
      line-height: 1.45;
    }}
    .row + .row {{
      margin-top: 8px;
    }}
    dt {{
      color: #6f7180;
      font-weight: 700;
    }}
    dd {{
      margin: 0;
      color: #171326;
      font-weight: 800;
      text-align: right;
      overflow-wrap: anywhere;
    }}
    a.button {{
      margin-top: 22px;
      min-height: 48px;
      border-radius: 8px;
      background: #007c39;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 15px;
      font-weight: 900;
    }}
    .hint {{
      margin-top: 12px;
      font-size: 12px;
      line-height: 1.45;
    }}
  </style>
</head>
<body>
  <main>
    <div class="icon" aria-hidden="true">{escape(symbol)}</div>
    <h1>{escape(title)}</h1>
    <p>{escape(body)}</p>
    <dl>
      <div class="row"><dt>Mã giao dịch</dt><dd>{escape(txn_ref or "Không có")}</dd></div>
      <div class="row"><dt>Mã phản hồi</dt><dd>{escape(response_code or "Chưa có")}</dd></div>
      <div class="row"><dt>Loại giao dịch</dt><dd>{escape(resolved_type)}</dd></div>
    </dl>
    <a class="button" href="{escape(app_url)}">Quay lại ứng dụng LeafScan</a>
    <p class="hint">Nếu ứng dụng không tự mở, hãy bấm nút trên rồi kiểm tra lại trạng thái trong app.</p>
  </main>
  <script>
    setTimeout(function () {{
      window.location.href = {app_url!r};
    }}, 900);
  </script>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)
