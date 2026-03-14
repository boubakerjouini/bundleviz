"use client"

import { useEffect } from "react"
import { useBundleStore } from "@/store/bundleStore"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useBundleStore((s) => s.theme)
  const setTheme = useBundleStore((s) => s.setTheme)

  // On mount: read localStorage and sync to store
  useEffect(() => {
    const saved = localStorage.getItem("bundleviz-theme") as "dark" | "light" | null
    if (saved) setTheme(saved)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply data-theme attribute on <html> — CSS vars cascade from :root and [data-theme="light"]
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  return <>{children}</>
}
