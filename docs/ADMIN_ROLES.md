# نقش‌های پنل ادمین aSistan

این سند دسترسی نقش‌های پلتفرم را توضیح می‌دهد. جدول `admin_users.role` منبع حقیقت است.

## نقش‌ها

### `super_admin` (سوپر ادمین)

- دسترسی کامل به همه بخش‌های `/admin`
- **Feature flags:** فقط این نقش می‌تواند `public_self_serve_trial` را روشن/خاموش کند
- **Deneme (۱۴ روز):** فقط super_admin می‌تواند برای یک şirket از صفحه şirket detayı deneme aç/kapat کند
- مدیریت `admin_users`، تنظیمات سیستم، pricing
- حذف/تغییرات حساس دیتابیس (خارج از UI، با احتیاط)

### `support_agent` (پشتیبانی)

- **Destek talepleri:** مشاهده، پاسخ، تغییر وضعیت/اولویت تیکت
- **Şirketler / Kullanıcılar:** مشاهده (برای رفع مشکل)
- **Feature flags:** می‌تواند `online_randevu` و `siniflar_module` را فعال کند؛ **نه** `public_self_serve_trial`
- **Analytics / Revenue:** معمولاً فقط خواندن
- **بدون:** تغییر pricing، حذف سازمان، مدیریت admin_users

### `sales` (فروش)

- **Şirketler، Abonelikler، Organizations:** مشاهده و پیگیری مشتری B2B
- **Analytics / Gelir:** گزارش MRR و ثبت‌نام
- **Destek:** می‌تواند تیکت ببیند؛ پاسخ رسمی ترجیحاً support_agent
- **Feature flags:** بدون دسترسی تغییر trial؛ در صورت نیاز از super_admin بخواهید

## کنترل فنی

| لایه | مکانیزم |
|------|---------|
| UI ادمین | `hooks/useAdmin` → redirect به `/login` اگر `admin_users` نباشد |
| API ادمین | `verifyAdmin` در `lib/admin-auth.ts` + Bearer JWT |
| Feature flag حساس | `SUPER_ADMIN_ONLY_FLAGS` در `lib/platform-flags.ts` |
| Audit | `admin_audit_log` برای toggle flag و trial |

## نقش‌های داخل کسب‌وکار (tenant)

جدا از ادمین پلتفرم:

| نقش | `profiles.role` | دسترسی |
|-----|-----------------|--------|
| Sahip | `owner` | همه ماژول‌ها + مالی |
| Yönetici | `manager` | مانند owner؛ ویرایش yetkiler کارمندان |
| Çalışan | `employee` | طبق `feature_permissions` و پیش‌فرض محدود |

تنظیم yetkiler: **Ayarlar → Kullanıcı yetkileri** (owner/manager).

## پیشنهاد عملیاتی

1. حداقل یک `super_admin` فعال نگه دارید.
2. پشتیبان‌ها را `support_agent` کنید، نه super_admin.
3. تیم فروش را `sales` — بدون دسترسی trial عمومی.
4. هر ۹۰ روز `admin_audit_log` را آرشیو کنید.
