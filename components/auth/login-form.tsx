"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")

  const isAllowedDomain = (email: string): boolean => {
    const allowedDomains = ['1cbit.ru', 'abt.ru']
    const domain = email.split('@')[1]?.toLowerCase()
    return allowedDomains.includes(domain)
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!isAllowedDomain(email)) {
      setError("Доступ разрешен только для email-адресов с доменами @1cbit.ru и @abt.ru")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/send-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.status === 429) {
        // Обработка ошибки rate limiting
        const retryAfter = response.headers.get('X-RateLimit-Reset') || data.reset || 60
        const remaining = response.headers.get('X-RateLimit-Remaining')
        setError(`Слишком много запросов. Пожалуйста, подождите ${retryAfter} секунд перед следующей попыткой.`)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Ошибка отправки кода подтверждения")
      }

      setStep("code")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Произошла непредвиденная ошибка")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        code,
        redirect: false,
      })

      if (result?.error) {
        setError("Неверный код подтверждения. Пожалуйста, попробуйте снова.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      setError("Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Вход в систему</CardTitle>
        <CardDescription>Доступ к корпоративному хранилищу файлов</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "email" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка кода...
                </>
              ) : (
                "Запросить код"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmitCode} className="space-y-4">
            <div className="space-y-2">
              <Label>Введите код подтверждения, отправленный на ваш email</Label>
              <InputOTP
                value={code}
                onChange={setCode}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("email")}
              >
                Назад
              </Button>
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  "Вход"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground"></p>
      </CardFooter>
    </Card>
  )
}

