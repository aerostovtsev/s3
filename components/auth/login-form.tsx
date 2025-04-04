"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { toast } from "sonner"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")

  const isAllowedDomain = (email: string): boolean => {
    const allowedDomains = ["1cbit.ru", "abt.ru"]
    const domain = email.split("@")[1]?.toLowerCase()
    return allowedDomains.includes(domain)
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!isAllowedDomain(email)) {
      setError("Доступ разрешен только для корпоративных email-адресов")
      setLoading(false)
      return
    }

    setStep("code")

    try {
      const response = await fetch("/api/auth/send-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.status === 429) {
        const retryAfter = data.reset || "60"
        toast.error(
          `Слишком много попыток. Пожалуйста, подождите ${retryAfter} секунд`
        )
        setStep("email")
        setLoading(false)
        return
      }

      if (!response.ok) {
        setError(data.error || "Не удалось отправить код")
        toast.error(data.error || "Не удалось отправить код")
        setStep("email")
        setLoading(false)
        return
      }

      toast.success("Код подтверждения отправлен на ваш email")
    } catch (error) {
      setError("Произошла ошибка при отправке кода")
      setStep("email")
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
        setLoading(false)
        return
      }

      toast.success("Успешный вход в систему")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      setError(
        "Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Вход в систему</CardTitle>
        <CardDescription>
          Доступ к корпоративному хранилищу файлов
        </CardDescription>
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
              <Label>
                Введите код подтверждения, отправленный на ваш email
              </Label>
              <InputOTP value={code} onChange={setCode} maxLength={6}>
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
                Вход
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Сделано в Growth product
        </p>
      </CardFooter>
    </Card>
  )
}
