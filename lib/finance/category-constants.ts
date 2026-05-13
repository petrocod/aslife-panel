/** Gelir — DB’de category alanına yazılacak anahtarlar */
export const INCOME_CATEGORIES = {
  clinic_service: "Klinik hizmeti (rezervasyon)",
  product_sale: "Ürün / paket satışı",
  other_income: "Diğer gelir",
  manual_cash_in: "Manuel nakit girişi",
  bank_deposit: "Banka yatırımı",
} as const

/** Gider */
export const EXPENSE_CATEGORIES = {
  operational: "Operasyonel (sarf, ilaç, malzeme)",
  payroll: "Maaş / ücret",
  fixed: "Sabit (kira, fatura, vergi)",
  marketing: "Pazarlama / reklam",
  other: "Diğer",
} as const
