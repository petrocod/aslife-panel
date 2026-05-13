"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase-client"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import {
  FALLBACK_SOLO,
  TRIAL_BANNER_WARNING_DAYS,
  canAddEmployees,
  trialDaysRemaining,
} from "@/lib/subscription"

export type SubscriptionState = {
  loading: boolean
  planId: string
  planName: string
  maxUsers: number
  status: "trialing" | "active" | "canceled" | "past_due" | string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  trialDaysLeft: number | null
  /** Üst bar turuncu deneme şeridi (şirket bağlı + trialing) */
  trialBannerVisible: boolean
  isFallback: boolean
  refetch: () => void
  canAddEmployees: (employeeCount: number) => boolean
}

export function useSubscription(): SubscriptionState {
  const { companyId, userId, loading: companyLoading } = useCompany()
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [planId, setPlanId] = useState(FALLBACK_SOLO.planId)
  const [planName, setPlanName] = useState(FALLBACK_SOLO.nameTr)
  const [maxUsers, setMaxUsers] = useState(FALLBACK_SOLO.maxUsers)
  const [status, setStatus] = useState<string>(FALLBACK_SOLO.status)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(true)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (companyLoading) return

      if (!userId || !companyId || companyId === DEMO_COMPANY_ID) {
        if (!cancelled) {
          setPlanId(FALLBACK_SOLO.planId)
          setPlanName(FALLBACK_SOLO.nameTr)
          setMaxUsers(FALLBACK_SOLO.maxUsers)
          setStatus(FALLBACK_SOLO.status)
          const demoEnd = new Date()
          demoEnd.setDate(demoEnd.getDate() + FALLBACK_SOLO.trialDaysDefault)
          setTrialEndsAt(demoEnd.toISOString())
          setCurrentPeriodEnd(null)
          setIsFallback(true)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      const { data: sub, error: subErr } = await supabase
        .from("company_subscriptions")
        .select("plan_id, status, trial_ends_at, current_period_end")
        .eq("company_id", companyId)
        .maybeSingle()

      if (cancelled) return

      if (subErr || !sub) {
        setPlanId(FALLBACK_SOLO.planId)
        setPlanName(FALLBACK_SOLO.nameTr)
        setMaxUsers(FALLBACK_SOLO.maxUsers)
        setStatus("trialing")
        const fe = new Date()
        fe.setDate(fe.getDate() + FALLBACK_SOLO.trialDaysDefault)
        setTrialEndsAt(fe.toISOString())
        setCurrentPeriodEnd(null)
        setIsFallback(true)
        setLoading(false)
        return
      }

      const { data: planRow } = await supabase
        .from("subscription_plans")
        .select("name_tr, max_users")
        .eq("id", sub.plan_id)
        .maybeSingle()

      if (cancelled) return

      setPlanId(sub.plan_id)
      setPlanName(planRow?.name_tr ?? FALLBACK_SOLO.nameTr)
      setMaxUsers(planRow?.max_users ?? FALLBACK_SOLO.maxUsers)
      setStatus(sub.status)
      setTrialEndsAt(sub.trial_ends_at)
      setCurrentPeriodEnd(sub.current_period_end)
      setIsFallback(false)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, userId, companyLoading, version])

  const trialDaysLeft = useMemo(() => trialDaysRemaining(trialEndsAt), [trialEndsAt])

  const trialBannerVisible = useMemo(() => {
    if (companyLoading || loading) return false
    if (!userId || !companyId || companyId === DEMO_COMPANY_ID) return false
    if (status !== "trialing" || trialDaysLeft === null) return false
    return trialDaysLeft <= TRIAL_BANNER_WARNING_DAYS
  }, [companyLoading, loading, userId, companyId, status, trialDaysLeft])

  const canAdd = useCallback((employeeCount: number) => canAddEmployees(employeeCount, maxUsers), [maxUsers])

  return {
    loading: companyLoading || loading,
    planId,
    planName,
    maxUsers,
    status,
    trialEndsAt,
    currentPeriodEnd,
    trialDaysLeft,
    trialBannerVisible,
    isFallback,
    refetch,
    canAddEmployees: canAdd,
  }
}
