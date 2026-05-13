import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "aSistan - Randevu Yönetim Sistemi",
  description: "İşletmenizi kolayca yönetin",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
