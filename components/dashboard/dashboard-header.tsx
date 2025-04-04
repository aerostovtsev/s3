"use client"

import type { User } from "next-auth"
import { signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Database, Sun, Moon, Monitor, Shield } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"

interface DashboardHeaderProps {
  user: User & {
    role: string
  }
}

const ThemeSwitcher = ({
  theme,
  setTheme,
}: {
  theme: string
  setTheme: (theme: string) => void
}) => {
  const themes = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ]

  return (
    <div className="flex justify-start gap-1 px-2 py-1.5">
      {themes.map(({ value, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            setTheme(value)
          }}
          className={`h-8 w-8 p-0 ${
            theme === value ? "bg-accent text-accent-foreground" : ""
          }`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = user.role === "ADMIN"
  const { theme = "system", setTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    router.push(`${path}${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            onClick={handleNavigation("/dashboard")}
            className="text-xl font-bold flex items-center"
          >
            <Database className="h-6 w-6 mr-2" />
            <span>Первый.БИТ</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-lg"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <ThemeSwitcher theme={theme} setTheme={setTheme} />
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Дашбоард</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Админ панель</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Выход</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}
