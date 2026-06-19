import type { Metadata } from "next"
import { AuthSessionSync } from "@/components/providers/AuthSessionSync"
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
      <body>
        <AuthSessionSync />
        {children}
      </body>
    </html>
  )
}
