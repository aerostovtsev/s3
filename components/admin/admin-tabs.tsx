"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"

export function AdminTabs() {
  const pathname = usePathname()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoverStyle, setHoverStyle] = useState({})
  const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" })
  const tabRefs = useRef<(HTMLDivElement | null)[]>([])

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

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex]
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        })
      }
    }
  }, [hoveredIndex])

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.href === pathname)
    if (activeIndex !== -1) {
      const activeElement = tabRefs.current[activeIndex]
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        })
      }
    }
  }, [pathname])

  return (
    <div className="relative">
      <nav className="flex space-x-[6px] relative" aria-label="Tabs">
        {/* Hover Highlight */}
        <div
          className="absolute h-[30px] transition-all duration-300 ease-out bg-muted/50 rounded-[6px]"
          style={{
            ...hoverStyle,
            opacity: hoveredIndex !== null ? 1 : 0,
          }}
        />

        {/* Active Indicator */}
        <div
          className="absolute bottom-[-6px] h-[2px] bg-primary transition-all duration-300 ease-out"
          style={{
            ...activeStyle,
            left: `calc(${activeStyle.left} - 6px)`,
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = pathname === tab.href
          return (
            <div
              key={tab.href}
              ref={(el) => {
                if (el) {
                  tabRefs.current[index] = el
                }
              }}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <Link
                href={tab.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors duration-300 h-[30px] flex items-center",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {tab.label}
              </Link>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
