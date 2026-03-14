"use client"

import { useEffect, useState, useCallback } from "react"
import { useBundleStore } from "@/store/bundleStore"
import { toPng } from "html-to-image"

interface Props {
  treemapRef: React.RefObject<HTMLDivElement | null>
}

const shortcuts = [
  { key: "?", desc: "Toggle shortcuts" },
  { key: "F", desc: "Focus filter" },
  { key: "S", desc: "Focus search" },
  { key: "E", desc: "Export PNG" },
  { key: "Esc", desc: "Deselect / Close" },
  { key: "1", desc: "Treemap view" },
  { key: "2", desc: "Sunburst view" },
  { key: "3", desc: "List view" },
  { key: "B", desc: "Toggle budget" },
  { key: "D", desc: "Toggle dark/light" },
]

export default function KeyboardShortcuts({ treemapRef }: Props) {
  const [showOverlay, setShowOverlay] = useState(false)
  const { setView, setTheme, theme, selectPackage, setBudget, budget, drillBack } = useBundleStore()

  const handleExport = useCallback(async () => {
    if (!treemapRef.current) return
    try {
      const dataUrl = await toPng(treemapRef.current, { backgroundColor: "#0a0a0a" })
      const link = document.createElement("a")
      link.download = `bundleviz-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch { /* silently fail */ }
  }, [treemapRef])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return

      switch (e.key) {
        case "?":
          setShowOverlay((v) => !v)
          break
        case "f":
        case "F":
          e.preventDefault()
          document.getElementById("filter-input")?.focus()
          break
        case "s":
        case "S":
          e.preventDefault()
          document.getElementById("search-input")?.focus()
          break
        case "e":
        case "E":
          handleExport()
          break
        case "Escape":
          selectPackage(null)
          setShowOverlay(false)
          drillBack()
          break
        case "1":
          setView("treemap")
          break
        case "2":
          setView("sunburst")
          break
        case "3":
          setView("list")
          break
        case "b":
        case "B":
          setBudget(budget ? null : 204800) // 200kb default
          break
        case "d":
        case "D":
          setTheme(theme === "dark" ? "light" : "dark")
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setView, setTheme, theme, selectPackage, setBudget, budget, handleExport, drillBack])

  if (!showOverlay) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60" onClick={() => setShowOverlay(false)}>
      <div className="w-96 rounded-lg border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="rounded border border-border bg-card px-2 py-1 font-mono text-xs text-foreground min-w-[32px] text-center">{key}</kbd>
              <span className="text-sm text-muted">{desc}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setShowOverlay(false)}
          className="mt-6 w-full rounded bg-card px-4 py-2 text-sm text-muted hover:text-foreground transition">
          Close (Esc)
        </button>
      </div>
    </div>
  )
}
