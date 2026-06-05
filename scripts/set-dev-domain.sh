#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  if [[ ! -f "dev-domain.env" && -f "dev-domain.env.example" ]]; then
    cp "dev-domain.env.example" "dev-domain.env"
  fi

  if [[ -f "dev-domain.env" ]]; then
    DOMAIN="$(grep -E '^DEV_PUBLIC_DOMAIN=' dev-domain.env | tail -n 1 | cut -d= -f2-)"
  fi
fi

DOMAIN="${DOMAIN%/}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: ./scripts/set-dev-domain.sh <http://lan-ip:8000|https://your-ngrok-domain>" >&2
  echo "   or: set DEV_PUBLIC_DOMAIN=... in dev-domain.env, then run ./scripts/set-dev-domain.sh" >&2
  exit 2
fi

if [[ ! "$DOMAIN" =~ ^https?:// ]]; then
  echo "error: domain must start with http:// or https://" >&2
  exit 2
fi

ensure_file() {
  local file="$1"
  local example="$2"
  if [[ ! -f "$file" && -f "$example" ]]; then
    cp "$example" "$file"
  fi
  touch "$file"
}

set_key() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      done = 1
      next
    }
    { print }
    END {
      if (!done) print key "=" value
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

ensure_file "backend/.env" "backend/.env.example"
ensure_file "leafscan-ai/.env" "leafscan-ai/.env.example"
ensure_file "admin-web/.env" "admin-web/.env.example"

set_key "backend/.env" "PUBLIC_DOMAIN" "$DOMAIN"
set_key "backend/.env" "PUBLIC_BASE_URL" "$DOMAIN"
set_key "backend/.env" "VNPAY_RETURN_URL" "$DOMAIN/api/v1/vnpay/return"
set_key "backend/.env" "VNPAY_IPN_URL" "$DOMAIN/api/v1/vnpay/ipn"

set_key "leafscan-ai/.env" "EXPO_PUBLIC_API_DOMAIN" "$DOMAIN"
set_key "leafscan-ai/.env" "EXPO_PUBLIC_API_BASE_URL" "$DOMAIN"

set_key "admin-web/.env" "VITE_API_DOMAIN" "$DOMAIN"
set_key "admin-web/.env" "VITE_API_BASE_URL" "$DOMAIN/api/v1"

cat <<EOF
Updated local env domain:
  Backend PUBLIC_DOMAIN=$DOMAIN
  Mobile  EXPO_PUBLIC_API_DOMAIN=$DOMAIN
  Admin   VITE_API_DOMAIN=$DOMAIN

VNPAY IPN URL to register/test:
  $DOMAIN/api/v1/vnpay/ipn
VNPAY return URL:
  $DOMAIN/api/v1/vnpay/return

Restart backend, Expo, and admin-web after changing this value.
EOF
