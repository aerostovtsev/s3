"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AdminTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      href: "/admin/users",
      label: "Пользователи",
    },
    {
      href: "/admin/files",
      label: "Файлы",
    },
    {
      href: "/admin/history",
      label: "История",
    },
  ]

  return (
    <div className="border-b">
      <nav className="flex space-x-4" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary hover:border-primary/50"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

