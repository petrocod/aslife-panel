/** Varsayılan demo şirket (giriş yok veya profil bu şirkete bağlı) */
export const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001"

/** Oturum açmış kullanıcılar için demo şirkette randevu üst sınırı (DB tetikleyici ile aynı) */
export const DEMO_MAX_APPOINTMENTS = 200

/**
 * Tohum: −7 … +10 gün × günde 10 randevu = 180; sınırın altında kalmalı.
 * `DEMO_MAX_APPOINTMENTS` değişirse tetikleyici ve bunu da güncelleyin.
 */
export const DEMO_SEED_APPOINTMENT_BUDGET = 180
