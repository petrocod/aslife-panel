"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SiniflarPage() {
  return (
    <div className="p-6">
      <div className="flex justify-end mb-6">
        <Link href="/hizmetler/siniflar/yeni">
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            Yeni Sınıf
          </Button>
        </Link>
      </div>
      <div className="text-center py-16 text-slate-500 text-sm">
        Henüz sınıf oluşturulmamış
      </div>
    </div>
  )
}
