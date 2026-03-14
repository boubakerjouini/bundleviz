"use client"

import Link from "next/link"
import { useBundleStore } from "@/store/bundleStore"

export default function Navbar() {
  const { theme, setTheme } = useBundleStore()

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <span className="inline-block h-3 w-3 rounded-full bg-accent" />
        BundleViz
      </Link>
      <div className="flex items-center gap-6 text-sm text-muted">
        <Link href="/analyze" className="transition hover:text-foreground">
          Analyze
        </Link>
        <Link href="/gallery" className="transition hover:text-foreground">
          Gallery
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="transition hover:text-foreground"
          title="Toggle dark/light mode (D)"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1zm0 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.5-2.5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1zm-13 0a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1zM8 13a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 13zm-3.536-1.464a.5.5 0 0 1 0-.708l.707-.707a.5.5 0 1 1 .708.708l-.708.707a.5.5 0 0 1-.707 0zm7.071-7.071a.5.5 0 0 1 0-.708l.707-.707a.5.5 0 1 1 .708.708l-.708.707a.5.5 0 0 1-.707 0zM4.464 4.465a.5.5 0 0 1-.707 0l-.708-.707a.5.5 0 0 1 .708-.708l.707.708a.5.5 0 0 1 0 .707zm7.072 7.071a.5.5 0 0 1-.708 0l-.707-.707a.5.5 0 1 1 .708-.708l.707.708a.5.5 0 0 1 0 .707z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278z" />
            </svg>
          )}
        </button>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-foreground">
          GitHub
        </a>
      </div>
    </nav>
  )
}
