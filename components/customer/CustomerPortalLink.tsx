"use client"

import { useState } from "react"
import { Copy, ExternalLink, Loader2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { generatePortalToken } from "@/lib/customer-communication"

type Props = {
  customerId: string
  portalToken: string | null
  onTokenReady: (token: string) => void
}

export function CustomerPortalLink({ customerId, portalToken, onTokenReady }: Props) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const base = typeof window !== "undefined" ? window.location.origin : ""
  const url = portalToken ? `${base}/r/${portalToken}` : null

  async function ensureToken() {
    if (portalToken) return portalToken
    setBusy(true)
    const token = generatePortalToken()
    const { error } = await supabase
      .from("customers")
      .update({ portal_token: token })
      .eq("id", customerId)
    setBusy(false)
    if (!error) {
      onTokenReady(token)
      return token
    }
    return null
  }

  async function handleCopy() {
    const t = await ensureToken()
    if (!t) return
    const link = `${base}/r/${t}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            Randevu geçmişim (müşteri linki)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Müşteriye kısa link gönderin; giriş yapmadan randevu geçmişini görür.
          </p>
          {url && (
            <p className="text-xs font-mono text-blue-700 mt-2 break-all">{url}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={busy} onClick={handleCopy} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Kopyalandı" : "Linki kopyala"}
          </Button>
          {url && (
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Aç
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
