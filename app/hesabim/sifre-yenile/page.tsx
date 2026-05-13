"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react"

export default function PasswordResetPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) {
      setError("Tüm alanlar zorunludur.")
      return
    }
    if (newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.")
      return
    }

    setError("")
    setLoading(true)

    const { error: sbError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (sbError) {
      setError(sbError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/login"), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">a</div>
          <span className="text-xl font-bold text-slate-800">aSistan</span>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-800">Şifreniz Güncellendi</h1>
            <p className="text-sm text-slate-500">
              Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Giriş Sayfasına Git
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Yeni Şifre Belirle</h1>
            <p className="text-sm text-slate-500 text-center mb-6">
              Hesabınız için yeni bir şifre belirleyin.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Yeni Şifre</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-600">Şifre Tekrar</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="••••••••"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Şifreyi Güncelle
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
