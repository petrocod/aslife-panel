"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase-client"

export function AdminNavbar() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userInitials, setUserInitials] = useState("A")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const meta = data.user.user_metadata
        const name = meta?.full_name || data.user.email?.split("@")[0] || "Admin"
        const email = data.user.email || ""
        setUserName(name)
        setUserEmail(email)
        const parts = name.trim().split(" ")
        setUserInitials(
          parts
            .map((p: string) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        )
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="bg-white shrink-0 border-b border-slate-200">
      <div className="h-14 min-h-14 flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-slate-800 sm:text-base">
            Admin Panel
          </h1>
          <span className="hidden sm:inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-inset ring-orange-200">
            SUPER ADMIN
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <span className="font-medium max-w-[160px] truncate text-right hidden sm:inline">
                  {userName || "Admin"}
                </span>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{userName || "Admin"}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
