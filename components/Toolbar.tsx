"use client"

import { useBundleStore } from "@/store/bundleStore"
import { formatBytes, formatMs, loadTimeMs } from "@/lib/formatBytes"
import { useCallback, useState } from "react"
import { toPng } from "html-to-image"
import type { ColorMode, ViewMode } from "@/lib/types"

export default function Toolbar({ treemapRef }: { treemapRef: React.RefObject<HTMLDivElement | null> }) {
  const {
    packages, removed, filter, sort, search, view, drillStack, colorMode,
    budget, securityData, enrichedData,
    setFilter, setSort, setSearch, setView, setColorMode,
    drillBack, setBudget,
  } = useBundleStore()

  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState("200")
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [shareMsg, setShareMsg] = useState("")

  const totalGzip = packages.filter((p) => !p.error).reduce((sum, p) => sum + p.gzip, 0)
  const removedGzip = packages.filter((p) => removed.includes(p.name) && !p.error).reduce((sum, p) => sum + p.gzip, 0)
  const activeGzip = totalGzip - removedGzip

  // Duplicates count
  const nameCounts = new Map<string, Set<string>>()
  for (const pkg of packages) {
    if (pkg.dependencies) {
      for (const [depName, depVer] of Object.entries(pkg.dependencies)) {
        if (!nameCounts.has(depName)) nameCounts.set(depName, new Set())
        nameCounts.get(depName)!.add(depVer)
      }
    }
  }
  const duplicateCount = [...nameCounts.values()].filter((versions) => versions.size > 1).length

  // Security vulns count
  const vulnCount = Object.values(securityData).reduce((sum, d) => sum + d.vulns.length, 0)

  // Outdated count
  const outdatedCount = Object.values(enrichedData).filter((d) => d.versionsBehind && d.versionsBehind > 0).length

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

  const handleShare = useCallback(() => {
    const names = packages.map((p) => `${p.name}@${p.version}`)
    const encoded = btoa(JSON.stringify(names))
    const url = `${window.location.origin}/analyze?share=${encoded}`
    navigator.clipboard.writeText(url)
    setShareMsg("Copied!")
    setTimeout(() => setShareMsg(""), 2000)
  }, [packages])

  const handleTwitterShare = useCallback(() => {
    const top3 = [...packages].filter((p) => !p.error).sort((a, b) => b.gzip - a.gzip).slice(0, 3)
    const text = `My bundle: ${formatBytes(totalGzip)} gzip across ${packages.length} packages\nTop 3: ${top3.map((p) => `${p.name} (${formatBytes(p.gzip)})`).join(", ")}\nAnalyzed with BundleViz`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank")
  }, [packages, totalGzip])

  const handlePdfExport = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text("BundleViz Report", 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)

    // Summary
    doc.setFontSize(14)
    doc.text("Summary", 14, 40)
    doc.setFontSize(10)
    doc.text(`Total gzip size: ${formatBytes(totalGzip)}`, 14, 48)
    doc.text(`Package count: ${packages.filter((p) => !p.error).length}`, 14, 54)
    doc.text(`Vulnerabilities: ${vulnCount}`, 14, 60)
    doc.text(`Outdated: ${outdatedCount}`, 14, 66)

    // Load time
    doc.text(`3G load time: ${formatMs(loadTimeMs(totalGzip, 1.6))}`, 14, 72)
    doc.text(`4G load time: ${formatMs(loadTimeMs(totalGzip, 10))}`, 14, 78)

    // Package table
    const tableData = packages.filter((p) => !p.error).sort((a, b) => b.gzip - a.gzip).map((p) => [
      p.name, p.version, formatBytes(p.gzip), formatBytes(p.size),
      `${((p.gzip / totalGzip) * 100).toFixed(1)}%`, String(p.dependencyCount),
      enrichedData[p.name]?.license || "unknown",
    ])

    autoTable(doc, {
      startY: 85,
      head: [["Package", "Version", "Gzip", "Minified", "% Total", "Deps", "License"]],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [34, 197, 94] },
    })

    // Security section
    const vulnPackages = Object.entries(securityData).filter(([, d]) => d.vulns.length > 0)
    if (vulnPackages.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = ((doc as any).lastAutoTable?.finalY as number) || 200
      doc.setFontSize(14)
      doc.text("Security Issues", 14, finalY + 10)
      const secData = vulnPackages.flatMap(([, d]) =>
        d.vulns.map((v) => [d.packageName, v.id, v.summary, v.severity || "unknown"])
      )
      autoTable(doc, {
        startY: finalY + 15,
        head: [["Package", "CVE", "Summary", "Severity"]],
        body: secData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [239, 68, 68] },
      })
    }

    doc.save(`bundleviz-report-${new Date().toISOString().slice(0, 10)}.pdf`)
  }, [packages, totalGzip, securityData, enrichedData, vulnCount, outdatedCount])

  const handleSetBudget = () => {
    const kb = parseInt(budgetInput)
    if (kb > 0) {
      setBudget(kb * 1024) // Convert kb to bytes
      setShowBudgetModal(false)
    }
  }

  const badgeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/badge?total=${totalGzip}`
    : ""
  const badgeMarkdown = `[![Bundle Size](${badgeUrl})](${typeof window !== "undefined" ? window.location.href : ""})`

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {drillStack.map((item, i) => (
          <span key={item} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted">/</span>}
            <button
              onClick={() => { for (let j = drillStack.length - 1; j > i; j--) drillBack() }}
              className={`font-mono ${i === drillStack.length - 1 ? "text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {item}
            </button>
          </span>
        ))}
      </div>

      <div className="mx-auto" />

      {/* Badges */}
      {duplicateCount > 0 && (
        <span className="rounded-md bg-medium/20 px-2 py-0.5 text-xs text-medium">{duplicateCount} duplicates</span>
      )}
      {vulnCount > 0 && (
        <span className="rounded-md bg-huge/20 px-2 py-0.5 text-xs text-huge">{vulnCount} vulnerabilities</span>
      )}
      {outdatedCount > 0 && (
        <span className="rounded-md bg-medium/20 px-2 py-0.5 text-xs text-medium">{outdatedCount} outdated</span>
      )}
      {packages.filter((p) => p.error).length > 0 && (
        <span className="rounded-md bg-muted/20 px-2 py-0.5 text-xs text-muted" title="These packages are Node.js/backend-only and have no browser bundle size">
          {packages.filter((p) => p.error).length} node-only (gray)
        </span>
      )}

      {/* Filter */}
      <div className="flex rounded-md border border-border text-xs">
        {(["all", "dep", "dev"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 transition ${filter === f ? "bg-accent text-background" : "text-muted hover:text-foreground"}`}
          >
            {f === "all" ? "Both" : f === "dep" ? "Deps" : "Dev"}
          </button>
        ))}
      </div>

      {/* Sort */}
      <select value={sort} onChange={(e) => setSort(e.target.value as "size" | "alpha" | "deps")}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
        <option value="size">By Size</option>
        <option value="alpha">A-Z</option>
        <option value="deps">By Deps</option>
      </select>

      {/* Color Mode */}
      <select value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
        <option value="size">Color: Size</option>
        <option value="license">Color: License</option>
        <option value="age">Color: Age</option>
        <option value="risk">Color: Risk</option>
      </select>

      {/* Search */}
      <input type="text" placeholder="Search (S)..." value={search} onChange={(e) => setSearch(e.target.value)}
        id="search-input"
        className="w-28 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted" />

      {/* Budget Progress */}
      {budget && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-20 rounded-full bg-card overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              activeGzip / budget < 0.8 ? "bg-safe" : activeGzip / budget < 0.95 ? "bg-medium" : "bg-huge"
            }`} style={{ width: `${Math.min(100, (activeGzip / budget) * 100)}%` }} />
          </div>
          <span className="text-xs text-muted">{formatBytes(activeGzip)}/{formatBytes(budget)}</span>
          <button onClick={() => setBudget(null)} className="text-xs text-muted hover:text-foreground">x</button>
        </div>
      )}

      {/* Total Badge */}
      <div className="rounded-md border border-border px-3 py-1 font-mono text-xs">
        {removed.length > 0 ? (
          <span>
            <span className="text-muted line-through">{formatBytes(totalGzip)}</span>{" "}
            <span className="text-accent">{formatBytes(activeGzip)}</span>{" "}
            <span className="text-accent">(-{formatBytes(removedGzip)}, -{((removedGzip / totalGzip) * 100).toFixed(0)}%)</span>
          </span>
        ) : (
          <span>Total: {formatBytes(totalGzip)}</span>
        )}
      </div>

      {/* Load time */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-muted" title="Estimated load times">
        <span>3G: {formatMs(loadTimeMs(activeGzip, 1.6))}</span>
        <span>4G: {formatMs(loadTimeMs(activeGzip, 10))}</span>
      </div>

      {/* View Toggle */}
      <div className="flex rounded-md border border-border text-xs">
        {([
          { v: "treemap" as ViewMode, label: "1", title: "Treemap (1)", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="8" height="9" rx="1" /><rect x="9" y="0" width="5" height="5" rx="1" /><rect x="9" y="6" width="5" height="8" rx="1" /><rect x="0" y="10" width="8" height="4" rx="1" /></svg> },
          { v: "sunburst" as ViewMode, label: "2", title: "Sunburst (2)", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="6" fillOpacity="0.3" /><circle cx="7" cy="7" r="4" fillOpacity="0.5" /><circle cx="7" cy="7" r="2" /></svg> },
          { v: "list" as ViewMode, label: "3", title: "List (3)", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1" /><rect x="0" y="6" width="14" height="2" rx="1" /><rect x="0" y="11" width="14" height="2" rx="1" /></svg> },
        ]).map(({ v, title, icon }) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-2 py-1 transition ${view === v ? "bg-accent text-background" : "text-muted hover:text-foreground"}`}
            title={title}>{icon}</button>
        ))}
      </div>

      {/* Budget */}
      <button onClick={() => setShowBudgetModal(true)}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground" title="Set Budget (B)">
        Budget
      </button>

      {/* Export buttons */}
      <button onClick={handleExport}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground" title="Export PNG (E)">
        PNG
      </button>
      <button onClick={handlePdfExport}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground" title="Export PDF">
        PDF
      </button>

      {/* Share */}
      <button onClick={handleShare}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground">
        {shareMsg || "Share"}
      </button>
      <button onClick={handleTwitterShare}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground" title="Share on X">
        X
      </button>
      <button onClick={() => setShowBadgeModal(true)}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:text-foreground" title="Get Badge">
        Badge
      </button>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowBudgetModal(false)}>
          <div className="w-80 rounded-lg border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Set Bundle Budget</h3>
            <div className="flex gap-2">
              <input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                className="flex-1 rounded border border-border bg-card px-3 py-2 text-sm text-foreground" placeholder="200" />
              <span className="flex items-center text-sm text-muted">kb gzip</span>
            </div>
            <button onClick={handleSetBudget}
              className="mt-4 w-full rounded bg-accent px-4 py-2 text-sm font-medium text-background">
              Set Budget
            </button>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowBadgeModal(false)}>
          <div className="w-96 rounded-lg border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">README Badge</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="Bundle Size Badge" className="mb-4" />
            <p className="mb-1 text-xs text-muted">Markdown:</p>
            <textarea readOnly value={badgeMarkdown}
              className="mb-3 h-16 w-full rounded border border-border bg-card p-2 font-mono text-xs text-foreground" />
            <button onClick={() => { navigator.clipboard.writeText(badgeMarkdown); setShowBadgeModal(false) }}
              className="w-full rounded bg-accent px-4 py-2 text-sm font-medium text-background">
              Copy Markdown
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
