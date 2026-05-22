# Hướng dẫn Deploy Backend LeafScan AI

Backend có thể deploy lên Render, Railway, Fly.io, hoặc bất kỳ platform nào
hỗ trợ Docker. File `Dockerfile` + `render.yaml` có sẵn trong thư mục này.

## Option 1: Render.com (khuyến nghị cho đồ án)

### Bước 1: Chuẩn bị
1. Tạo tài khoản https://render.com (login bằng GitHub)
2. Connect repo GitHub của bạn

### Bước 2: Deploy bằng render.yaml (Blueprint)
1. Push code lên GitHub main branch
2. Vào https://dashboard.render.com → **New +** → **Blueprint**
3. Chọn repo → Render tự detect `backend/render.yaml`
4. Apply → Render sẽ tạo:
   - **Web Service** `leafscan-backend` (Docker, free tier)
   - **PostgreSQL Database** `leafscan-db` (free tier, 1 GB)
5. Sau khi deploy xong, vào Service → **Environment** và điền các secret:
   - `GEMINI_API_KEY` (bắt buộc)
   - `SMTP_USER` + `SMTP_PASSWORD` (tùy chọn, cho reset password email)
   - `GOOGLE_CLIENT_ID` (tùy chọn, cho Google OAuth)

### Bước 3: Lấy URL public
Render cấp URL dạng: `https://leafscan-backend.onrender.com`

Cập nhật mobile app:
```bash
# leafscan-ai/.env
EXPO_PUBLIC_API_BASE_URL=https://leafscan-backend.onrender.com
```

### Lưu ý free tier
- Service **tự ngủ sau 15 phút không có traffic** → request đầu tiên mất ~30s wake up
- DB free tier **90 ngày rồi bị xóa**, nâng lên $7/mo để persistent
- Mỗi tháng 750h free (đủ chạy 1 service 24/7)

## Option 2: Railway.app

### Bước 1: Cài CLI
```bash
npm install -g @railway/cli
railway login
```

### Bước 2: Init + Deploy
```bash
cd backend
railway init
railway link

# Add PostgreSQL addon
railway add --plugin postgresql

# Deploy
railway up
```

### Bước 3: Set env vars
```bash
railway variables set GEMINI_API_KEY=AIza...
railway variables set GEMINI_MODEL=gemini-2.5-flash
railway variables set SMTP_USER=your-email@gmail.com
# ... (tương tự các biến khác)
```

Railway tự detect Dockerfile và expose port qua biến `$PORT`.

## Option 3: Fly.io

```bash
# Cài flyctl: curl -L https://fly.io/install.sh | sh
cd backend
fly launch --no-deploy
# → fly.toml tự tạo
fly postgres create leafscan-db
fly postgres attach leafscan-db
fly secrets set GEMINI_API_KEY=AIza...
fly deploy
```

## Option 4: Chạy Docker local (test trước khi deploy)

```bash
cd backend
docker build -t leafscan-backend .
docker run --rm -p 8000:8000 --env-file .env leafscan-backend

# Test
curl http://localhost:8000/api/v1/health
```

## Checklist trước khi deploy production

- [ ] `SECRET_KEY` set bằng giá trị random dài (64+ ký tự)
- [ ] `GEMINI_API_KEY` là key production, không phải dev key
- [ ] `DATABASE_URL` trỏ tới managed Postgres (không SQLite)
- [ ] `CORS_ORIGINS` đổi từ `*` sang domain cụ thể
- [ ] `SMTP_*` điền credentials thật nếu muốn email OTP
- [ ] Backup dataset `disease_db.json` trước khi deploy
- [ ] Test `/api/v1/health` endpoint sau deploy
- [ ] Update `leafscan-ai/.env` → `EXPO_PUBLIC_API_BASE_URL=https://...`
- [ ] Test từ app mobile: đăng ký → quét → chat end-to-end

## Lỗi thường gặp

### "Port already in use"
```bash
# Check:
sudo lsof -i :8000
# Kill process đang chiếm port hoặc đổi PORT env
```

### "Database connection refused"
- Kiểm tra `DATABASE_URL` đúng format: `postgresql://user:pass@host:port/db`
- Với Render, dùng **internal URL** (không phải external) cho service nội bộ

### Render service "spinning up" mãi
- Free tier ngủ sau 15p — request đầu tiên mất 30-60s
- Upgrade lên Starter plan ($7/mo) để service luôn chạy

### Build fail "onnxruntime" install
- Docker image không hỗ trợ AVX → đổi base image sang `python:3.12-slim-bullseye`
- Hoặc tăng resource plan lên Starter
