"use client"

import { useCallback, useState } from "react"
import type { PrintableDocumentPayload } from "@/lib/documents/receipt-types"

export function usePrintableReceipt() {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptPayload, setReceiptPayload] = useState<PrintableDocumentPayload | null>(null)

  const openReceipt = useCallback((payload: PrintableDocumentPayload) => {
    setReceiptPayload(payload)
    setReceiptOpen(true)
  }, [])

  const closeReceipt = useCallback(() => {
    setReceiptOpen(false)
  }, [])

  return {
    receiptOpen,
    setReceiptOpen,
    receiptPayload,
    openReceipt,
    closeReceipt,
  }
}
