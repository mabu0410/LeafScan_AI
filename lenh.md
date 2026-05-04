cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd ../leafscan-ai
npx expo start --tunnel // tránh lỗi wifi

hostname -I

# nếu cùng wifi và muốn gọi backend LAN trực tiếp:
npx expo start --host lan -c
