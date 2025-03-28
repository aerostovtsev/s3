import { LoginForm } from "@/components/auth/login-form"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to access your files</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

