#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/docker/asistan}"
REPO="${REPO:-https://github.com/petrocod/aslife-panel.git}"
BRANCH="${BRANCH:-master}"

echo "==> aSistan VPS deploy -> $APP_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found." >&2
  exit 1
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d .git ]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  find "$APP_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  git clone --branch "$BRANCH" --depth 1 "$REPO" .
fi

if [ ! -f .env ]; then
  cat > .env <<'EOF'
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://nhnecizqphvnqwvjrxqt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVICE_ROLE_HERE
NEXT_PUBLIC_BASE_URL=https://asixtan.com
NEXT_PUBLIC_SALES_EMAIL=satis@aslife.com.tr
CRON_SECRET=edc71dc047c623a7cec90a9be1ed03268ccfb29b9a0c5434cecedd94ec8d02aa
VERIMOR_USERNAME=902323352218
VERIMOR_PASSWORD=JAT*877rpr
VERIMOR_SOURCE_ADDR=Seyahat Mkt
IYZICO_API_KEY=4GrQqRplWyYvOjnkkYK3DowMeihO3uyy
IYZICO_SECRET_KEY=zScwNVZBAibYAr1eidum61rMuKgpl1Pt
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
EOF
  echo "Created .env — edit anon/service_role keys then re-run."
  exit 1
fi

docker compose -f docker-compose.yml --env-file .env up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health || true

echo "Done. Test: https://asixtan.com/api/health"
