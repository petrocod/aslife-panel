/** Tek kaynak: sürüm package.json → next.config.mjs env */

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"
export const SALES_EMAIL =
  process.env.NEXT_PUBLIC_SALES_EMAIL || "satis@aslife.com.tr"
