"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { setAuthSessionCookie } from "@/lib/auth-session-cookie"

/** Keeps middleware-visible cookie in sync with Supabase localStorage session. */
export function AuthSessionSync() {
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthSessionCookie(!!session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSessionCookie(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
