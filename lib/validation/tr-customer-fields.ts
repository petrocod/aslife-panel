/** TR: ulusal numara 10 hane, 0 ile başlamaz (+90 ayrı) */
export const TR_NATIONAL_PHONE_LEN = 10

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "")
}

/** Boş değilse tam 11 rakam olmalı */
export function validateTcKimlikOptional(raw: string): string | null {
  const d = digitsOnly(raw)
  if (d.length === 0) return null
  if (d.length !== 11) return "T.C. kimlik numarası tam 11 rakam olmalıdır."
  return null
}

export function validateTrNationalPhoneBody(digits: string): string | null {
  if (digits.length !== TR_NATIONAL_PHONE_LEN) {
    return `Telefon numarası tam ${TR_NATIONAL_PHONE_LEN} hane olmalıdır (baştaki 0 girilmez).`
  }
  if (digits.startsWith("0")) {
    return "Telefon numarası 0 ile başlamamalıdır; sadece 10 haneli ulusal numarayı girin (örn. 5XX…)."
  }
  return null
}

export function splitFullNameToParts(fullName: string): { first: string; last: string } {
  const t = fullName.trim().replace(/\s+/g, " ")
  if (!t) return { first: "", last: "" }
  const i = t.indexOf(" ")
  if (i === -1) return { first: t, last: "" }
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() }
}

export function joinNameParts(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim()
}
