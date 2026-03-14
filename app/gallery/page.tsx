"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import { formatBytes } from "@/lib/formatBytes"
import { useBundleStore } from "@/store/bundleStore"
import { useRouter } from "next/navigation"

interface GalleryEntry {
  id: string
  shortId: string
  repoName: string | null
  totalGzip: number
  packageCount: number
  packages: string
  createdAt: string
  viewCount: number
}

export default function GalleryPage() {
  const [entries, setEntries] = useState<GalleryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { packages, analyze } = useBundleStore()

  // Share publicly
  const [publishing, setPublishing] = useState(false)
  const handlePublish = async () => {
    if (packages.length === 0) return
    setPublishing(true)
    try {
      const totalGzip = packages.filter((p) => !p.error).reduce((sum, p) => sum + p.gzip, 0)
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalGzip,
          packageCount: packages.filter((p) => !p.error).length,
          packages: JSON.stringify(packages.map((p) => ({ name: p.name, version: p.version, gzip: p.gzip }))),
        }),
      })
      if (res.ok) {
        fetchEntries()
      }
    } catch { /* ignore */ }
    setPublishing(false)
  }

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/gallery")
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const handleLoadEntry = (entry: GalleryEntry) => {
    try {
      const pkgs = JSON.parse(entry.packages)
      const fakeJson = JSON.stringify({
        dependencies: Object.fromEntries(pkgs.map((p: { name: string; version: string }) => [p.name, p.version])),
      })
      sessionStorage.setItem("bundleviz-json", fakeJson)
      analyze(fakeJson)
      router.push("/analyze")
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Public Gallery</h1>
          <div className="flex gap-2">
            {packages.length > 0 && (
              <button onClick={handlePublish} disabled={publishing}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
                {publishing ? "Publishing..." : "Share publicly"}
              </button>
            )}
            <Link href="/analyze" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground transition">
              Back to Analyze
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading gallery...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted text-sm">No public analyses yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => {
              let pkgList: { name: string; gzip: number }[] = []
              try { pkgList = JSON.parse(entry.packages) } catch { /* ignore */ }
              const top3 = [...pkgList].sort((a, b) => b.gzip - a.gzip).slice(0, 3)

              return (
                <button key={entry.id} onClick={() => handleLoadEntry(entry)}
                  className="rounded-lg border border-border bg-surface p-4 text-left transition hover:border-accent">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted">#{entry.shortId}</span>
                    <span className="font-mono text-sm font-semibold text-foreground">{formatBytes(entry.totalGzip)}</span>
                  </div>
                  {entry.repoName && (
                    <p className="text-sm text-foreground mb-1">{entry.repoName}</p>
                  )}
                  <p className="text-xs text-muted mb-2">{entry.packageCount} packages</p>
                  <div className="space-y-1">
                    {top3.map((p) => (
                      <div key={p.name} className="flex justify-between text-xs">
                        <span className="text-muted font-mono truncate">{p.name}</span>
                        <span className="text-foreground font-mono ml-2">{formatBytes(p.gzip)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
