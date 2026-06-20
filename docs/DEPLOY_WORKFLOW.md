# جریان کار: لوکال → GitHub → VPS

این سند **مرحله‌به‌مرحله** است: اول لوکال تست، بعد publish روی `asixtan.com`.

---

## نمای کلی

```
Cursor (هر PC)  →  git push  →  GitHub (master)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            push خودکار                    Run workflow دستی
            (GitHub Actions)               (Actions → Deploy)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                         VPS: git pull + docker build
                                    ▼
                         https://asixtan.com
```

---

## مرحله ۰ — یک‌بار روی هر سیستم (Cursor)

```bash
git clone https://github.com/petrocod/aslife-panel.git
cd aslife-panel   # یا Inasistan-app
npm install
cp env.docker.example .env.local
# .env.local را با Supabase و BASE_URL=http://localhost:3000 پر کنید
npm run dev
```

مرورگر: `http://localhost:3000` — تغییرات را اینجا ببینید و تأیید کنید.

---

## مرحله ۱ — یک‌بار روی VPS (Hostinger)

Terminal پنل Hostinger:

```bash
mkdir -p /docker/asistan
cd /docker/asistan
git clone https://github.com/petrocod/aslife-panel.git .
git checkout master
cp env.docker.example .env
nano .env
```

در `.env` حتماً:

```env
NEXT_PUBLIC_BASE_URL=https://asixtan.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
PUBLIC_SIGNUP_ENABLED=false
```

اولین اجرا:

```bash
docker compose --env-file .env up -d --build
docker compose ps
curl -s https://asixtan.com/api/health
```

---

## مرحله ۲ — یک‌بار GitHub Secrets (برای deploy خودکار)

**GitHub → petrocod/aslife-panel → Settings → Secrets and variables → Actions → New repository secret**

| Secret | مقدار |
|--------|--------|
| `DEPLOY_HOST` | IP سرور (مثلاً از پنل Hostinger) |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | کل محتوای فایل کلید خصوصی SSH |
| `DEPLOY_PATH` | `/docker/asistan` |

### ساخت کلید SSH (روی PC خودتان)

```powershell
ssh-keygen -t ed25519 -C "github-deploy-asistan" -f $env:USERPROFILE\.ssh\asistan_deploy
```

- محتوای **`asistan_deploy`** (بدون .pub) → Secret `DEPLOY_SSH_KEY`
- محتوای **`asistan_deploy.pub`** → روی VPS:

```bash
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

تست از PC:

```powershell
ssh -i $env:USERPROFILE\.ssh\asistan_deploy root@SERVER_IP "echo OK"
```

---

## مرحله ۳ — روزمره: لوکال تست → deploy

### ۳.۱ تست در Cursor (لوکال)

```bash
git pull origin master
npm run dev
```

صفحه/قابلیت را در `localhost:3000` بررسی کنید. راضی بودید → مرحله بعد.

### ۳.۲ Publish — روش A (از Cursor / ترمینال)

```bash
git add .
git commit -m "توضیح کوتاه تغییر"
git push origin master
```

بعد از push:
- **GitHub → Actions → Deploy Asistan** — باید سبز شود (~۳–۸ دقیقه برای build Docker)
- سایت: `https://asixtan.com`

### ۳.۳ Publish — روش B (GitHub Desktop)

1. Commit
2. Push origin **master**
3. همان Actions را چک کنید

### ۳.۴ Publish — روش C (دستی بدون push جدید)

**GitHub → Actions → Deploy Asistan → Run workflow**

- Branch: `master`
- روی همان commit فعلی روی GitHub دوباره deploy می‌کند

### ۳.۵ Publish — روش D (SSH مستقیم روی VPS)

```bash
cd /docker/asistan
git pull origin master
docker compose --env-file .env up -d --build
```

---

## چک بعد از deploy

| تست | آدرس |
|-----|------|
| Health | `https://asixtan.com/api/health` → `hasSupabaseUrl: true` |
| Login | `https://asixtan.com/login` |
| Admin | `https://asixtan.com/admin` |

لاگ:

```bash
cd /docker/asistan
docker compose logs -f asistan-app --tail 100
```

---

## عیب‌یابی Actions

| خطا | راه‌حل |
|-----|--------|
| Secret not found | چهار Secret بالا را بگذارید |
| Permission denied (SSH) | `authorized_keys` روی VPS |
| `.env` not found | `cp env.docker.example .env` و پر کردن |
| git pull fail روی VPS | `git remote -v` و دسترسی clone |
| build timeout | RAM سرور؛ دوباره Run workflow |

---

## نکات

- **`.env` فقط روی VPS** — در git commit نشود.
- **Supabase SQL** با push اجرا نمی‌شود — فایل‌های `supabase/*.sql` را دستی در SQL Editor بزنید.
- قبل از کار روی PC دیگر: `git pull origin master`
- Branch اصلی: **`master`**
