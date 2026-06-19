"use client"

export const dynamic = "force-dynamic"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { completeAuthFromUrlHash } from "@/lib/auth-hash-recovery"
import { setAuthSessionCookie } from "@/lib/auth-session-cookie"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Phone, Mail, ArrowLeft } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [step, setStep] = useState<"form" | "otp" | "plan" | "forgot">("form")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const hashResult = await completeAuthFromUrlHash()
      if (cancelled) return
      if (hashResult.status === "redirected") return
      if (hashResult.status === "done") {
        router.replace(hashResult.destination)
        return
      }

      const err = searchParams.get("error")
      if (err && hashResult.status === "none") {
        setError("Kimlik doğrulama başarısız. Lütfen tekrar giriş yapın.")
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) {
        setAuthSessionCookie(true)
        const next = searchParams.get("next")
        router.push(next && next.startsWith("/") ? next : "/randevular/takvim")
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleLogin() {
    if (!email || !password) { setError("E-posta ve şifre zorunludur."); return }
    setError(""); setLoading(true)

    const { data, error: sbError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (sbError) {
      if (sbError.message.includes("Email not confirmed")) {
        setError("E-postanız henüz doğrulanmamış. Lütfen e-postanızdaki doğrulama bağlantısına tıklayın.")
      } else if (sbError.message.includes("Invalid login credentials")) {
        setError("E-posta veya şifre hatalı.")
      } else {
        setError(sbError.message)
      }
      return
    }

    if (data.session) {
      setAuthSessionCookie(true)
      const next = searchParams.get("next")
      router.push(next && next.startsWith("/") ? next : "/randevular/takvim")
      router.refresh()
    }
  }

  async function handleSendOtp() {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length < 10) {
      setError("Geçerli bir telefon numarası girin.")
      return
    }
    setError("")
    setSuccess("")
    setOtpSending(true)

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleaned }),
    })
    const data = await res.json()
    setOtpSending(false)

    if (data.ok) {
      setOtpSent(true)
      setStep("otp")
      setCountdown(60)
      if (data.devCode) {
        setSuccess(`Doğrulama kodu: ${data.devCode} (SMS geçici olarak devre dışı)`)
      }
    } else {
      setError(data.error || "Kod gönderilemedi.")
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) { setError("6 haneli kodu girin."); return }
    setError("")
    setLoading(true)

    const cleaned = phone.replace(/\D/g, "")
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleaned, code: otpCode }),
    })
    const data = await res.json()

    if (!data.ok) {
      setLoading(false)
      setError(data.error || "Kod doğrulanamadı.")
      return
    }

    // Phone verified, now create the account
    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName: fullName.trim(), phone: cleaned }),
    })
    const regData = await regRes.json()

    if (!regData.ok) {
      setLoading(false)
      setError(regData.error || "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.")
      return
    }

    const { data: signInData, error: sbError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (sbError) {
      setError(sbError.message || "Giriş yapılamadı. Lütfen giriş sayfasından deneyin.")
      return
    }

    if (signInData.session) {
      setAuthSessionCookie(true)
      router.push("/hesabim/plan-sec")
      router.refresh()
      return
    }

    setSuccess("Kayıt başarılı! Giriş yapabilirsiniz.")
    setMode("login")
    setStep("form")
  }

  function handleRegisterNext() {
    if (!fullName.trim() || !email || !password || !phone) {
      setError("Tüm alanlar zorunludur.")
      return
    }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalıdır."); return }
    setError("")
    handleSendOtp()
  }

  async function handleForgotPassword() {
    if (!email) { setError("E-posta adresi zorunludur."); return }
    setError(""); setLoading(true)

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)

    if (!data.ok) {
      setError(data.error || "Bağlantı gönderilemedi.")
      return
    }

    setSuccess("Şifre sıfırlama bağlantısı e-postanıza gönderildi.")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">a</div>
          <span className="text-xl font-bold text-slate-800">aSistan</span>
        </div>

        {step === "otp" ? (
          <>
            <button onClick={() => { setStep("form"); setError("") }} className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Geri
            </button>
            <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Telefon Doğrulama</h1>
            <p className="text-sm text-slate-500 text-center mb-6">
              <Phone className="inline w-4 h-4 mr-1" />
              {phone} numarasına gönderilen 6 haneli kodu girin.
            </p>
          </>
        ) : step === "forgot" ? (
          <>
            <button onClick={() => { setStep("form"); setError(""); setSuccess("") }} className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Geri
            </button>
            <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Şifremi Unuttum</h1>
            <p className="text-sm text-slate-500 text-center mb-6">
              E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-800 text-center mb-1">
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </h1>
            <p className="text-sm text-slate-500 text-center mb-6">
              {mode === "login" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
            </p>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
        )}

        {step === "otp" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-600">Doğrulama Kodu</Label>
              <Input
                placeholder="000000"
                className="mt-1 text-center text-2xl tracking-widest"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
            </div>
            <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Doğrula ve Kayıt Ol
            </Button>
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-slate-500">Tekrar göndermek için {countdown}s bekleyin</p>
              ) : (
                <button onClick={handleSendOtp} className="text-xs text-blue-600 hover:underline" disabled={otpSending}>
                  {otpSending ? "Gönderiliyor..." : "Kodu tekrar gönder"}
                </button>
              )}
            </div>
          </div>
        ) : step === "forgot" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-600">E-posta</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ornek@email.com"
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Şifre Sıfırlama Bağlantısı Gönder
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <Label className="text-sm text-slate-600">Ad Soyad</Label>
                  <Input
                    placeholder="Adınızı ve soyadınızı girin"
                    className="mt-1"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Telefon Numarası</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex items-center gap-1 border rounded-md px-3 bg-slate-50 text-sm text-slate-600 shrink-0">
                      <Phone className="w-3 h-3" /> +90
                    </div>
                    <Input
                      placeholder="5XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      maxLength={10}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="text-sm text-slate-600">E-posta</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ornek@email.com"
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-600">Şifre</Label>
              <div className="relative mt-1">
                <Input
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegisterNext())}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "login" && (
                <div className="mt-1 text-right">
                  <button
                    type="button"
                    onClick={() => { setStep("forgot"); setError(""); setSuccess("") }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Şifremi Unuttum
                  </button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={mode === "login" ? handleLogin : handleRegisterNext}
              disabled={loading || otpSending}
            >
              {(loading || otpSending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Giriş Yap" : otpSending ? "Kod gönderiliyor..." : "Devam Et"}
            </Button>
          </div>
        )}

        {(step === "form" || step === "forgot") && (
          <div className="mt-6 text-center text-sm text-slate-500">
            {step === "forgot" ? (
              <>Şifrenizi hatırladınız mı?{" "}
                <button onClick={() => { setStep("form"); setError(""); setSuccess("") }} className="text-blue-600 hover:underline font-medium">
                  Giriş Yap
                </button>
              </>
            ) : mode === "login" ? (
              <>Hesabınız yok mu?{" "}
                <button onClick={() => { setMode("register"); setError(""); setSuccess("") }} className="text-blue-600 hover:underline font-medium">
                  Kayıt Ol
                </button>
              </>
            ) : (
              <>Zaten hesabınız var mı?{" "}
                <button onClick={() => { setMode("login"); setError(""); setSuccess("") }} className="text-blue-600 hover:underline font-medium">
                  Giriş Yap
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
