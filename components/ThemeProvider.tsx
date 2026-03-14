"use client"

import { useEffect } from "react"
import { useBundleStore } from "@/store/bundleStore"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useBundleStore((s) => s.theme)
  const setTheme = useBundleStore((s) => s.setTheme)

  // On mount: read localStorage and sync to store
  useEffect(() => {
    const saved = localStorage.getItem("bundleviz-theme") as "dark" | "light" | null
    if (saved && saved !== theme) {
      setTheme(saved)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply CSS variables directly on <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === "light") {
      root.setAttribute("data-theme", "light")
      root.style.setProperty("--color-background", "#ffffff")
      root.style.setProperty("--color-foreground", "#111827")
      root.style.setProperty("--color-surface", "#f9fafb")
      root.style.setProperty("--color-card", "#f3f4f6")
      root.style.setProperty("--color-border", "#e5e7eb")
      root.style.setProperty("--color-muted", "#6b7280")
      root.style.setProperty("--color-accent", "#16a34a")
    } else {
      root.setAttribute("data-theme", "dark")
      root.style.setProperty("--color-background", "#0a0a0a")
      root.style.setProperty("--color-foreground", "#f4f4f5")
      root.style.setProperty("--color-surface", "#111111")
      root.style.setProperty("--color-card", "#171717")
      root.style.setProperty("--color-border", "#262626")
      root.style.setProperty("--color-muted", "#71717a")
      root.style.setProperty("--color-accent", "#22c55e")
    }
    // Force body background (belt + suspenders)
    document.body.style.setProperty("background-color", theme === "light" ? "#ffffff" : "#0a0a0a", "important")
    document.body.style.setProperty("color", theme === "light" ? "#111827" : "#f4f4f5", "important")
  }, [theme])

  return <>{children}</>
}
