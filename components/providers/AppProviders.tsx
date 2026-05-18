"use client"

import { CartProvider } from "@/contexts/CartContext"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
