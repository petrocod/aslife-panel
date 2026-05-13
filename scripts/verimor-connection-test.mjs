/**
 * Verimor bakiye sorgusu — SMS göndermez.
 * Kullanım: npm run test:sms-connection
 * Önce .env.local içine VERIMOR_USERNAME ve VERIMOR_PASSWORD ekleyin.
 */
const base = "https://sms.verimor.com.tr/v2/balance"
const u = (process.env.VERIMOR_USERNAME || "").trim()
const p = (process.env.VERIMOR_PASSWORD || "").trim()

if (!u || !p) {
  console.error(
    "Eksik: VERIMOR_USERNAME / VERIMOR_PASSWORD (.env.local). OİM: https://oim.verimor.com.tr/sms_settings/edit"
  )
  process.exit(1)
}

const url = new URL(base)
url.searchParams.set("username", u)
url.searchParams.set("password", p)

const res = await fetch(url, { cache: "no-store" })
const text = (await res.text()).trim()
console.log("HTTP", res.status, res.ok ? "OK" : "HATA")
console.log("Gövde:", text)
if (res.ok) {
  const n = parseInt(text, 10)
  if (!Number.isNaN(n)) {
    console.log("Kalan kredi (tahmini):", n)
  }
  process.exit(0)
}
process.exit(1)
