"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { BillingPeriod, CartItem, ProductType } from "@/lib/catalog/types"

const STORAGE_KEY = "inasistan_cart_v1"
const VAT_RATE = 0.2

type AddItemInput = {
  type: ProductType
  productKey: string
  title: string
  unitPrice: number
  billing?: BillingPeriod
  quantity?: number
}

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  vatAmount: number
  total: number
  addItem: (input: AddItemInput) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  hasSubscription: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadStored(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(loadStored())
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items])

  const addItem = useCallback((input: AddItemInput) => {
    const quantity = input.quantity ?? 1
    setItems((prev) => {
      if (input.type === "subscription") {
        const withoutSub = prev.filter((i) => i.type !== "subscription")
        return [
          ...withoutSub,
          {
            lineId: newLineId(),
            type: "subscription",
            productKey: input.productKey,
            title: input.title,
            unitPrice: input.unitPrice,
            billing: input.billing,
            quantity: 1,
          },
        ]
      }
      const existing = prev.find(
        (i) => i.type === input.type && i.productKey === input.productKey
      )
      if (existing) {
        return prev.map((i) =>
          i.lineId === existing.lineId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [
        ...prev,
        {
          lineId: newLineId(),
          type: input.type,
          productKey: input.productKey,
          title: input.title,
          unitPrice: input.unitPrice,
          billing: input.billing,
          quantity,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId))
  }, [])

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.lineId !== lineId))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i))
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  )
  const vatAmount = subtotal * VAT_RATE
  const total = subtotal + vatAmount
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  )
  const hasSubscription = items.some((i) => i.type === "subscription")

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      vatAmount,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      hasSubscription,
    }),
    [
      items,
      itemCount,
      subtotal,
      vatAmount,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      hasSubscription,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider")
  }
  return ctx
}

export { VAT_RATE }
