import { NextResponse } from "next/server"
import { fetchCatalog } from "@/lib/catalog/resolve"

export async function GET() {
  try {
    const catalog = await fetchCatalog(true)
    return NextResponse.json(catalog)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Katalog yüklenemedi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
