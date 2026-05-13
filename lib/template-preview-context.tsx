"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { applyTemplatePreview } from "@/lib/musteri-bildirimleri"

const TemplatePreviewContext = createContext<(source: string) => string>((s) => applyTemplatePreview(s))

export function TemplatePreviewProvider({
  overrides,
  children,
}: {
  overrides?: Record<string, string>
  children: ReactNode
}) {
  const apply = useMemo(() => (source: string) => applyTemplatePreview(source, overrides), [overrides])
  return <TemplatePreviewContext.Provider value={apply}>{children}</TemplatePreviewContext.Provider>
}

export function useTemplatePreview(): (source: string) => string {
  return useContext(TemplatePreviewContext)
}
