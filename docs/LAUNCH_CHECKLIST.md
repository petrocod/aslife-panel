# چک‌لیست لانچ aSistan — برندهای Aslife (به‌روز)

## فاز A — بلوکر (قبل هر مشتری واقعی)

### دیتابیس Supabase
- [ ] اجرای `supabase/platform_enhancements.sql` روی production
- [ ] تأیید seedهای `feature_flags` (همه `enabled = false` به‌جز نیاز شما)
- [ ] ممیزی RLS؛ عدم استفاده از `fix-rls.sql` / `DEV_BYPASS` در prod
- [ ] PITR / backup روزانه فعال

### امنیت (پیاده‌سازی شده در کد — باید deploy شود)
- [x] Middleware احراز هویت مسیرهای `(app)` و `/admin`
- [x] `/api/payment/checkout` — Bearer + تطبیق company
- [x] `/api/demo-seed` — admin یا demo owner/manager
- [x] حذف bypass کرون از `/api/admin/stats`
- [x] Rate limit IP برای OTP
- [ ] `NEXT_PUBLIC_SUPABASE_DEV_BYPASS` حذف از `.env.local` سرور
- [ ] `CRON_SECRET` قوی و cron روی VPS تست شده

### محصول
- [x] Online randevu — پیش‌فرض مخفی؛ فعال از Admin → Feature Flags
- [x] Sınıflar — پیش‌فرض مخفی؛ همان‌جا
- [x] Trial ۱۴ روز — پیش‌فرض بسته؛ super_admin per-şirket یا flag `public_self_serve_trial`
- [ ] Kampanya / online-randevular mock — مخفی یا تکمیل
- [ ] یک تست E2E دستی: ثبت‌نام → randevu → SMS → ödeme

### حقوقی / عملیاتی
- [ ] KVKK / Gizlilik / kullanım şartları
- [ ] `NEXT_PUBLIC_BASE_URL` دامنه نهایی HTTPS
- [ ] SMTP، Verimor، iyzico production

---

## فاز B — هفته اول بعد لانچ

- [ ] Sentry یا مشابه
- [ ] UptimeRobot
- [ ] Runbook: deploy، rollback، restore DB
- [ ] Onboarding ۳ قدم برای مشتری جدید
- [ ] SLA destek: ۲۴h (UI + `sla_due_at`)

---

## فاز C — رشد (۱–۳ ماه)

- [ ] Online booking کامل B2C
- [ ] Kampanya SMS واقعی
- [ ] e-Fatura / Paraşüt
- [ ] PWA موبایل

---

## Deploy

1. Secrets GitHub: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`
2. `.env.local` روی VPS
3. Push `main` → workflow deploy
4. `curl -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/notifications`

---

## مستندات مرتبط

- [ADMIN_ROLES.md](./ADMIN_ROLES.md) — نقش‌های super_admin / support_agent / sales
