"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Navbar from "@/components/Navbar"
import Onboarding from "@/components/Onboarding"

const PLACEHOLDER = `{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0"
  }
}`

interface SearchResult {
  name: string
  version: string
  description: string
  popularity: number
}

export default function HomePage() {
  const [tab, setTab] = useState<"paste" | "github" | "search">("paste")
  const [json, setJson] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [lockfileNotice, setLockfileNotice] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPackages, setSelectedPackages] = useState<{ name: string; version: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const router = useRouter()
  const { theme } = require("@/store/bundleStore").useBundleStore()
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])

  const handleAnalyze = () => {
    setError("")
    try {
      const parsed = JSON.parse(json)

      // Detect lockfile
      if (parsed.lockfileVersion) {
        setLockfileNotice("Detected package-lock.json \u2014 using exact versions")
      }

      if (!parsed.dependencies && !parsed.devDependencies && !parsed.lockfileVersion) {
        setError("No dependencies or devDependencies found")
        return
      }
      sessionStorage.setItem("bundleviz-json", json)
      router.push("/analyze")
    } catch {
      setError("Invalid JSON \u2014 please paste a valid package.json")
    }
  }

  const handleGithubImport = async () => {
    setError("")
    setLoading(true)
    try {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        setError("Invalid GitHub URL")
        setLoading(false)
        return
      }
      const [, owner, repo] = match
      const cleanRepo = repo.replace(/\.git$/, "")

      let res = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/package.json`)
      if (!res.ok) {
        res = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/package.json`)
      }
      if (!res.ok) {
        setError("Could not find package.json in repository")
        setLoading(false)
        return
      }
      const text = await res.text()
      setJson(text)
      setTab("paste")
      sessionStorage.setItem("bundleviz-json", text)
      router.push("/analyze")
    } catch {
      setError("Failed to fetch from GitHub")
    }
    setLoading(false)
  }

  // npm search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/npm-search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
        }
      } catch { /* ignore */ }
      setSearchLoading(false)
    }, 300)
  }, [searchQuery])

  const addPackage = (name: string, version: string) => {
    if (selectedPackages.some((p) => p.name === name)) return
    setSelectedPackages([...selectedPackages, { name, version }])
    setSearchQuery("")
    setSearchResults([])
  }

  const removePackage = (name: string) => {
    setSelectedPackages(selectedPackages.filter((p) => p.name !== name))
  }

  const analyzeSelected = () => {
    if (selectedPackages.length === 0) return
    const fakeJson = JSON.stringify({
      dependencies: Object.fromEntries(selectedPackages.map((p) => [p.name, p.version])),
    })
    sessionStorage.setItem("bundleviz-json", fakeJson)
    router.push("/analyze")
  }

  // Handle npm URL paste
  const handleNpmUrl = (url: string) => {
    const match = url.match(/npmjs\.com\/package\/(@?[^/@]+(?:\/[^/@]+)?)(?:\/v\/(.+))?/)
    if (match) {
      addPackage(match[1], match[2] || "latest")
      return true
    }
    return false
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Onboarding />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            See what&apos;s bloating your bundle.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Paste any package.json or package-lock.json. Get an interactive treemap of your npm dependencies sized by real gzip weight.
          </p>

          {/* Tabs */}
          <div className="mt-10 flex gap-1 rounded-lg border border-border bg-surface p-1">
            {([
              { id: "paste" as const, label: "Paste package.json" },
              { id: "github" as const, label: "Import from GitHub" },
              { id: "search" as const, label: "Search packages" },
            ]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                  tab === t.id ? "bg-card text-foreground" : "text-muted hover:text-foreground"
                }`}>{t.label}</button>
            ))}
          </div>

          {/* Input */}
          <div className="mt-4">
            {tab === "paste" ? (
              <>
                <div
                  className={`relative rounded-lg border-2 transition-colors ${
                    isDragging
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const file = e.dataTransfer.files[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string
                      setJson(text)
                      try {
                        const parsed = JSON.parse(text)
                        if (parsed.lockfileVersion) {
                          setLockfileNotice("Detected package-lock.json — using exact versions")
                        }
                      } catch { /* ignore */ }
                    }
                    reader.readAsText(file)
                  }}
                >
                  {isDragging && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="text-3xl">📦</div>
                        <p className="mt-2 text-sm font-semibold text-accent">Drop package.json here</p>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                    placeholder={PLACEHOLDER}
                    className={`h-64 w-full resize-none rounded-lg bg-transparent p-4 font-mono text-sm text-foreground placeholder:text-muted/50 focus:outline-none ${isDragging ? "opacity-20" : ""}`}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-muted">
                  or <span className="text-accent">drag & drop</span> your package.json / package-lock.json
                </p>
                {lockfileNotice && (
                  <p className="mt-2 text-xs text-accent">{lockfileNotice}</p>
                )}
                <button onClick={handleAnalyze} disabled={!json.trim()}
                  className="mt-3 w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40">
                  Analyze Bundle
                </button>
              </>
            ) : tab === "github" ? (
              <>
                <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted/50" />
                <button onClick={handleGithubImport} disabled={!githubUrl.trim() || loading}
                  className="mt-3 w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40">
                  {loading ? "Fetching..." : "Import & Analyze"}
                </button>
              </>
            ) : (
              <>
                <input type="text" value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value
                    if (!handleNpmUrl(val)) setSearchQuery(val)
                  }}
                  placeholder="Search npm packages or paste npmjs.com URL..."
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted/50" />

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-card">
                    {searchResults.map((r) => (
                      <button key={r.name} onClick={() => addPackage(r.name, r.version)}
                        className="block w-full px-4 py-2 text-left transition hover:bg-surface border-b border-border/30 last:border-0">
                        <span className="font-mono text-sm text-foreground">{r.name}</span>
                        <span className="ml-2 text-xs text-muted">v{r.version}</span>
                        <p className="text-xs text-muted truncate">{r.description}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchLoading && <p className="mt-2 text-xs text-muted">Searching...</p>}

                {/* Selected packages chips */}
                {selectedPackages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPackages.map((p) => (
                      <span key={p.name} className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground">
                        {p.name}@{p.version}
                        <button onClick={() => removePackage(p.name)} className="ml-1 text-muted hover:text-huge">&times;</button>
                      </span>
                    ))}
                  </div>
                )}

                <button onClick={analyzeSelected} disabled={selectedPackages.length === 0}
                  className="mt-3 w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40">
                  Analyze {selectedPackages.length} package{selectedPackages.length !== 1 ? "s" : ""}
                </button>
              </>
            )}

            {error && <p className="mt-3 text-sm text-huge">{error}</p>}
          </div>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              "Interactive Treemap", "Sunburst View", "Security Scan", "License Audit",
              "What-if Analysis", "Bundle Budget", "PDF Export", "Keyboard Shortcuts",
            ].map((feature) => (
              <span key={feature} className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
                {feature}
              </span>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
