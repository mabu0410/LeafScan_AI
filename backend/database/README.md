# Database Seeds (LeafScan AI)

Thư mục này chứa dữ liệu seed SQL cho PostgreSQL, dùng để nạp dữ liệu mẫu ổn định cho môi trường local/dev.

## Cấu trúc

```text
backend/database/
  run_seeds.py
  seeds/
    001_seed_care_tips.sql
```

## Chạy migration trước seed

```bash
cd backend
psql "$DATABASE_URL" -f migrations/20260504_create_care_tips.sql
psql "$DATABASE_URL" -f migrations/20260504_add_care_tips_slug_source_fields.sql
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
