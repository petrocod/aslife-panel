"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { completeAuthFromUrlHash } from "@/lib/auth-hash-recovery"
import { setAuthSessionCookie } from "@/lib/auth-session-cookie"
import { supabase } from "@/lib/supabase-client"

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let cancelled = false

    async function finish(destination: string) {
      if (cancelled) return
      setAuthSessionCookie(true)
      router.replace(destination)
    }

    async function fail() {
      if (cancelled) return
      router.replace("/login?error=auth_callback_failed")
    }

    async function handleCallback() {
      const next = searchParams.get("next")
      const defaultNext = next && next.startsWith("/") ? next : "/randevular/takvim"

      const hashResult = await completeAuthFromUrlHash()
      if (cancelled) return
      if (hashResult.status === "redirected") return
      if (hashResult.status === "done") {
        await finish(hashResult.destination)
        return
      }

      const code = searchParams.get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          await fail()
          return
        }
        await finish(defaultNext)
        return
      }

      const tokenHash = searchParams.get("token_hash")
      const queryType = searchParams.get("type")
      if (tokenHash && queryType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: queryType as "signup" | "recovery" | "email" | "email_change",
        })
        if (error) {
          await fail()
          return
        }
        const destination =
          queryType === "recovery" ? "/hesabim/sifre-yenile" : defaultNext
        await finish(destination)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        await finish(defaultNext)
        return
      }

      await fail()
    }

    void handleCallback()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  )
}
