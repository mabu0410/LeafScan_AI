# Database Seeds (LeafScan AI)

Thư mục này chứa dữ liệu seed SQL cho PostgreSQL, dùng để nạp dữ liệu mẫu ổn định cho môi trường local/dev.

## Cấu trúc

```text
backend/database/
  run_seeds.py
  seeds/
    001_seed_care_tips.sql
    002_seed_marketplace.sql
    003_seed_demo_accounts.sql
```

## Chạy migration trước seed

```bash
cd backend
psql "$DATABASE_URL" -f migrations/20260504_create_care_tips.sql
psql "$DATABASE_URL" -f migrations/20260504_add_care_tips_slug_source_fields.sql
psql "$DATABASE_URL" -f migrations/20260518_partner_marketplace.sql
psql "$DATABASE_URL" -f migrations/20260519_user_subscriptions.sql
psql "$DATABASE_URL" -f migrations/20260519_home_dashboard_real_data.sql
```

## Chạy seed

```bash
cd backend
python database/run_seeds.py
```

Log sẽ có dạng:
- `Running seed: ...`
- `Done seed: ...`
- `Seed failed: ...`

## Chạy lại nhiều lần

- Seed file bắt buộc dùng `ON CONFLICT` để idempotent.
- `001_seed_care_tips.sql` dùng `ON CONFLICT (slug) DO UPDATE`, nên chạy lại không tạo duplicate theo `slug`.
- `003_seed_demo_accounts.sql` reset mật khẩu 2 tài khoản demo mỗi lần chạy để đảm bảo đăng nhập ổn định.

## Tài khoản demo

Seed `003_seed_demo_accounts.sql` tạo:

| Vai trò | Tài khoản | Mật khẩu | Email |
| --- | --- | --- | --- |
| Admin | `admin` | `admin123` | `admin@example.com` |
| Đối tác | `doitac` | `doitac123` | `doitac@example.com` |

Alias `admin` và `doitac` được lưu trong cột `users.phone`, vì API login hiện chấp nhận email hoặc số điện thoại/tài khoản. Để tài khoản admin truy cập endpoint `/api/v1/admin/*`, cấu hình `ADMIN_EMAILS` trong `backend/.env` phải chứa `admin@example.com`.

## Quy ước thêm seed mới

1. Tạo file mới trong `database/seeds` theo thứ tự tăng dần, ví dụ: `002_seed_more_tips.sql`.
2. Chỉ dùng SQL an toàn cho dữ liệu hiện có (không `DROP TABLE`, không `TRUNCATE` ngoài khi đã có yêu cầu rõ ràng).
3. Luôn dùng upsert (`ON CONFLICT`) cho bảng cần idempotent.
4. Không hard-code thông tin kết nối DB trong seed/runner.

## Quy ước slug

- Chỉ dùng chữ thường, số, dấu `-`.
- Không dấu tiếng Việt.
- Duy nhất trên bảng `care_tips`.
- Ví dụ: `tuoi-nuoc-vao-buoi-sang`.

## Quy ước nguồn tham khảo

Mỗi care tip nên có:
- `source_name`
- `source_url`
- `source_note`

Ưu tiên nguồn extension/đại học đáng tin cậy.

## Lưu ý nội dung

- Viết lại ngắn gọn, dễ hiểu cho app mobile.
- Không copy nguyên văn dài từ nguồn.
- Không đưa hướng dẫn liều lượng thuốc hoặc khuyến nghị thuốc hóa học cụ thể.
