
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

./node_modules/.bin/expo start --host lan --clear

cd /home/manhbao/Downloads/DO_AN_VMB/admin-web
./node_modules/.bin/vite --host 0.0.0.0
 