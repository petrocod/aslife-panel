# استقرار aSistan (دامنه یا IP)

این سند مسیر **رسمی** پروژه برای publish است. بعد از هر تغییر در کد، بخش [«به‌روزرسانی بعد از تغییر»](#به‌روزرسانی-بعد-از-تغییر) را دنبال کنید.

---

## دو روش کلی

| روش | مناسب برای | فایل مرتبط |
|-----|------------|------------|
| **Docker روی VPS** (Hostinger و …) | production فعلی `asixtan.com` | `docker-compose.yml`, `Dockerfile` |
| **GitHub Actions → Docker** | deploy خودکار بعد از push | `.github/workflows/deploy.yml` |
| **راهنمای مرحله‌به‌مرحله** | لوکال → push → VPS | `docs/DEPLOY_WORKFLOW.md` |
| **Vercel** | تست سریع بدون سرور | `vercel.json` |

---

## Hostinger VPS — Docker (پیشنهاد برای srv589781)

روی سرور شما الان سه پروژه Docker دیده می‌شود: `root`, `seyahatmarket`, `wordpress-plus`.  
**پروژه‌ای به نام asistan / inasistan وجود ندارد** → aSistan هنوز روی این VPS با Docker نصب **نشده**.

در repo هم تا الان فقط deploy با **pm2** بود (نه Docker). اگر GitHub Secrets (`DEPLOY_*`) تنظیم نشده باشد، deploy خودکار هم اجرا نشده.

### چرا Docker جدا؟

| | Docker جدید `asistan` | قاطی با root/wordpress |
|--|------------------------|-------------------------|
| ایزوله | ✅ | ❌ |
| restart / log جدا | ✅ | ❌ |
| HTTPS با Traefik Hostinger | ✅ | پیچیده |
| build سنگین Next.js | RAM جدا | ریسک روی سایت‌های دیگر |

### مراحل (Docker Manager Hostinger)

**۱. Terminal سرور** (دکمه Terminal در پنل):

```bash
sudo mkdir -p /docker/asistan
cd /docker/asistan
git clone https://github.com/YOUR_ORG/Inasistan-app.git .
cp env.docker.example .env.local
nano .env.local   # Supabase anon + BASE_URL + CRON_SECRET
```

**۲. Build و اجرا** (پورت داخلی 3002 روی localhost — با سایت‌های دیگر تداخل ندارد):

```bash
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:3002/api/health
```

**۳. HTTPS + دامنه** — در Docker Manager بنر «Traefik'i Dağıt» را بزنید (اگر هنوز نیست).  
DNS: رکورد A دامنه → IP سرور. سپس:

```bash
# نام شبکه را چک کنید:
docker network ls | grep root

# در .env.local: ASISTAN_DOMAIN=asistan.sizindomain.com
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

**۴. Cron اعلان (روی خود VPS، خارج از container):**

```bash
crontab -e
# هر ساعت:
0 * * * * curl -fsS -H "Authorization: Bearer CRON_SECRET" https://asistan.sizindomain.com/api/cron/notifications
```

**۵. Supabase** → Authentication → Redirect URLs:  
`https://asistan.sizindomain.com/auth/callback`

### به‌روزرسانی بعد از تغییر کد

```bash
cd /docker/asistan
git pull origin master
docker compose --env-file .env up -d --build
```

### عیب‌یابی Docker

```bash
docker compose logs -f asistan-app
docker compose exec asistan-app node -e "console.log(process.env.NEXT_PUBLIC_BASE_URL)"
```

---

## VPS کلاسیک (pm2 + nginx)

### ۱. سرور (VPS)

- Ubuntu 22/24 یا مشابه
- حداقل 1 GB RAM (build Next.js بهتر است 2 GB)
- پورت‌های باز: **22** (SSH)، **80** و **443** (وب)، یا موقت **3000** فقط برای تست IP

روی سرور نصب کنید:

```bash
sudo apt update && sudo apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### ۲. کلون پروژه

```bash
sudo mkdir -p /var/www/asistan
sudo chown $USER:$USER /var/www/asistan
git clone https://github.com/YOUR_ORG/Inasistan-app.git /var/www/asistan
cd /var/www/asistan
npm install
```

مسیر را یادداشت کنید — همان `DEPLOY_PATH` در GitHub Secrets (مثلاً `/var/www/asistan`).

### ۳. فایل `.env.local` روی سرور (مهم)

روی **سرور** (نه فقط لپ‌تاپ) فایل `.env.local` بسازید. از `.env.local` محلی کپی کنید و این‌ها را **حتماً** برای production اصلاح کنید:

```env
# Supabase — anon واقعی، نه service_role
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...

# آدرس عمومی سایت (دامنه یا IP)
NEXT_PUBLIC_BASE_URL=https://asistan.example.com
# فقط IP بدون SSL موقت:
# NEXT_PUBLIC_BASE_URL=http://123.45.67.89

NEXT_PUBLIC_SALES_EMAIL=satis@aslife.com.tr
CRON_SECRET=یک-رشته-تصادفی-طولانی

# production — این‌ها را خاموش کنید
# NEXT_PUBLIC_SUPABASE_DEV_BYPASS=
# DEMO_SEED_OPEN_IN_DEV=
# OTP_DEV_FALLBACK=false

# Verimor / iyzico / SMTP — همان مقادیر واقعی
VERIMOR_USERNAME=...
VERIMOR_PASSWORD=...
VERIMOR_SOURCE_ADDR=...
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

**کجا ویرایش می‌کنید:** فقط روی سرور → `DEPLOY_PATH/.env.local`  
بعد از تغییر env: `pm2 restart asistan-app --update-env`

### ۴. Supabase Dashboard

1. **Authentication → URL Configuration**
   - Site URL: `https://دامنه-شما`
   - Redirect URLs: `https://دامنه-شما/auth/callback`
2. **SQL Editor** — یک‌بار اجرا کنید (اگر نشده):
   - `supabase/verification_codes.sql`
   - `supabase/demo_access_fix.sql` (فقط اگر demo عمومی می‌خواهید)
   - `supabase/platform_enhancements.sql` (production)

### ۵. Nginx (دامنه یا IP)

فایل `/etc/nginx/sites-available/asistan`:

```nginx
server {
    listen 80;
    server_name asistan.example.com;   # یا IP: server_name 123.45.67.89;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/asistan /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

SSL (دامنه):

```bash
sudo certbot --nginx -d asistan.example.com
```

DNS: رکورد **A** دامنه → IP سرور.

### ۶. اولین build و اجرا

```bash
cd /var/www/asistan
npm run build
pm2 start npm --name asistan-app -- run start
pm2 save
pm2 startup   # دستور چاپ‌شده را اجرا کنید
```

تست: `https://دامنه/api/health` باید `hasSupabaseUrl: true` برگرداند.

### ۷. Cron اعلان‌ها (ساعتی)

روی سرور `crontab -e`:

```cron
0 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://دامنه/api/cron/notifications >/dev/null
```

`YOUR_CRON_SECRET` همان `CRON_SECRET` در `.env.local`.

---

## GitHub Actions — deploy خودکار (Docker)

**راهنمای کامل:** [`docs/DEPLOY_WORKFLOW.md`](./DEPLOY_WORKFLOW.md)

هر **push به `master`** (یا `main`) یا **Run workflow دستی** در Actions:

1. SSH به VPS
2. `git pull` همان branch
3. `docker compose --env-file .env up -d --build`
4. health check داخل container

**Secrets** (GitHub → Settings → Secrets → Actions):

| Secret | مثال |
|--------|------|
| `DEPLOY_HOST` | IP سرور Hostinger |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | کل محتوای کلید خصوصی SSH |
| `DEPLOY_PATH` | `/docker/asistan` |

**Deploy دستی از GitHub:** Actions → **Deploy Asistan** → Run workflow → branch: `master`

**فایل workflow:** `.github/workflows/deploy.yml`

---

## به‌روزرسانی بعد از تغییر

**جریان پیشنهادی:** لوکال `npm run dev` → تأیید → `git push origin master` → Actions سبز → `asixtan.com`

### چک‌لیست سریع

| کار | کجا |
|-----|-----|
| تست قبل از publish | لوکال `npm run dev` |
| شماره نسخه در UI | `package.json` → `"version"` |
| env production | VPS → `/docker/asistan/.env` |
| کد اپ | commit + push به **`master`** |

### روش ۱ — خودکار (پیشنهادی)

```bash
git add .
git commit -m "توضیح تغییر"
git push origin master
```

GitHub Actions: `git pull` + `docker compose up -d --build`

### روش ۲ — دستی از GitHub

Actions → **Deploy Asistan** → **Run workflow** → branch: `master`

### روش ۳ — دستی روی VPS

```bash
ssh root@SERVER
cd /docker/asistan
git pull origin master
docker compose --env-file .env up -d --build
```

### بعد از deploy

1. مرورگر: `https://دامنه/` و `/login`
2. `https://دامنه/api/health`
3. ورود super admin → `/admin`

---

## فقط IP (بدون دامنه)

1. `NEXT_PUBLIC_BASE_URL=http://IP-سرور`
2. Nginx با `server_name IP;` یا موقت `http://IP:3000` (pm2 مستقیم — برای production توصیه نمی‌شود)
3. Supabase Redirect URL: `http://IP/auth/callback` (HTTPS برای auth production بهتر است)

---

## عیب‌یابی

| مشکل | بررسی |
|------|--------|
| صفحه سفید / 500 | `pm2 logs asistan-app` — معمولاً `.env.local` یا anon key |
| لاگین loop | `NEXT_PUBLIC_SUPABASE_ANON_KEY` باید **anon** باشد |
| OTP کار نمی‌کند | `verification_codes.sql` روی Supabase |
| deploy fail | Secrets GitHub + وجود `.env.local` روی سرور |
| نسخه قدیمی در UI | `package.json` را بالا ببرید و دوباره build |

---

## فایل‌های کلیدی پروژه (مرجع)

```
package.json              ← version
.env.local                ← secrets (لوکال + سرور، در git نیست)
Dockerfile                ← image
docker-compose.yml        ← پروژه جدا Hostinger
docker-compose.traefik.yml
env.docker.example
.github/workflows/deploy.yml
docs/DEPLOY.md
```
