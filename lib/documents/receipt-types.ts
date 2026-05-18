export type DocumentLineItem = {
  label: string
  value: string
}

export type PrintableDocumentPayload = {
  title: string
  subtitle?: string
  customerName?: string
  referenceNo?: string
  dateLabel?: string
  lineItems: DocumentLineItem[]
  totalLabel?: string
  totalAmount: string
  paymentMethod?: string
  defaultBody: string
}

export function buildPaymentReceiptBody(customerName: string, amount: string, context: string) {
  return `Sayın ${customerName},\n\n${context} kapsamında ${amount} tutarında ödemeniz tarafımızca kaydedilmiştir.\n\nTeşekkür ederiz.`
}

export function buildProductSaleBody(customerName: string, productSummary: string) {
  const who = customerName ? `Sayın ${customerName},\n\n` : ""
  return `${who}Aşağıdaki ürün satışı gerçekleştirilmiştir:\n${productSummary}\n\nİyi günler dileriz.`
}

export function buildPackageSaleBody(customerName: string, packageName: string, amount: string) {
  return `Sayın ${customerName},\n\n"${packageName}" paketi ${amount} bedelle tarafınıza tanımlanmıştır. Paket kapsamındaki hizmetler için randevu planlaması yapılacaktır.\n\nTeşekkür ederiz.`
}

export function mapPaymentMethodLabel(m: string | null | undefined) {
  const x = (m ?? "").toLowerCase()
  if (x === "kart" || x === "pos" || x === "card") return "Kredi Kartı"
  if (x === "online") return "Online Ödeme"
  if (x === "havale" || x === "transfer") return "Havale"
  if (x === "nakit" || x === "cash") return "Nakit"
  return m || "—"
}
