"use client"

import { useBundleStore } from "@/store/bundleStore"
import { formatBytes, colorForSize, formatNumber } from "@/lib/formatBytes"
import { useState } from "react"

type SortKey = "name" | "version" | "type" | "gzip" | "size" | "deps" | "downloads"

export default function ListView() {
  const { packages, filter, search, removed, selectPackage, selected, toggleRemove, enrichedData } = useBundleStore()
  const [sortKey, setSortKey] = useState<SortKey>("gzip")
  const [sortAsc, setSortAsc] = useState(false)

  const totalGzip = packages.filter((p) => !p.error).reduce((sum, p) => sum + p.gzip, 0)

  let filtered = packages.filter((p) => !p.error)
  if (filter === "dep") filtered = filtered.filter((p) => p.type === "dep")
  if (filter === "dev") filtered = filtered.filter((p) => p.type === "dev")
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q))
  }

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    switch (sortKey) {
      case "name": return dir * a.name.localeCompare(b.name)
      case "version": return dir * a.version.localeCompare(b.version)
      case "type": return dir * (a.type || "").localeCompare(b.type || "")
      case "gzip": return dir * (a.gzip - b.gzip)
      case "size": return dir * (a.size - b.size)
      case "deps": return dir * (a.dependencyCount - b.dependencyCount)
      case "downloads": return dir * ((enrichedData[a.name]?.weeklyDownloads || 0) - (enrichedData[b.name]?.weeklyDownloads || 0))
      default: return 0
    }
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : ""
  const headerClass = "cursor-pointer px-3 py-2 text-left text-xs font-medium text-muted hover:text-foreground transition"

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            <th className={headerClass} onClick={() => handleSort("name")}>Name{arrow("name")}</th>
            <th className={headerClass} onClick={() => handleSort("version")}>Version{arrow("version")}</th>
            <th className={headerClass} onClick={() => handleSort("type")}>Type{arrow("type")}</th>
            <th className={headerClass} onClick={() => handleSort("gzip")}>Gzip{arrow("gzip")}</th>
            <th className={headerClass} onClick={() => handleSort("size")}>Minified{arrow("size")}</th>
            <th className={`${headerClass} hidden sm:table-cell`} onClick={() => handleSort("gzip")}>% Total</th>
            <th className={`${headerClass} hidden sm:table-cell`} onClick={() => handleSort("deps")}># Deps{arrow("deps")}</th>
            <th className={`${headerClass} hidden md:table-cell`} onClick={() => handleSort("downloads")}>Downloads/wk{arrow("downloads")}</th>
            <th className={`${headerClass} hidden md:table-cell`}>License</th>
            <th className={`${headerClass} hidden lg:table-cell`}>ESM</th>
            <th className={headerClass}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pkg) => {
            const isRemoved = removed.includes(pkg.name)
            const isSelected = selected === pkg.name
            const enriched = enrichedData[pkg.name]
            return (
              <tr key={pkg.name} onClick={() => selectPackage(pkg.name)}
                className={`border-b border-border/50 cursor-pointer transition ${isSelected ? "bg-card" : "hover:bg-card/50"} ${isRemoved ? "opacity-40" : ""}`}>
                <td className={`px-3 py-2 font-mono text-sm ${isRemoved ? "line-through" : ""}`}>
                  {pkg.name}
                  {enriched?.versionsBehind != null && enriched.versionsBehind > 0 && (
                    <span className="ml-1 text-xs text-medium" title={`${enriched.versionsBehind} versions behind`}>!</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{pkg.version}</td>
                <td className="px-3 py-2 text-xs text-muted">{pkg.type}</td>
                <td className="px-3 py-2 font-mono text-sm" style={{ color: colorForSize(pkg.gzip) }}>{formatBytes(pkg.gzip)}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{formatBytes(pkg.size)}</td>
                <td className="hidden px-3 py-2 font-mono text-xs text-muted sm:table-cell">
                  {totalGzip > 0 ? `${((pkg.gzip / totalGzip) * 100).toFixed(1)}%` : "\u2014"}
                </td>
                <td className="hidden px-3 py-2 text-xs text-muted sm:table-cell">{pkg.dependencyCount}</td>
                <td className="hidden px-3 py-2 font-mono text-xs text-muted md:table-cell">
                  {enriched?.weeklyDownloads != null ? formatNumber(enriched.weeklyDownloads) : "\u2014"}
                </td>
                <td className="hidden px-3 py-2 text-xs text-muted md:table-cell">{enriched?.license || "\u2014"}</td>
                <td className="hidden px-3 py-2 text-xs lg:table-cell">
                  {enriched?.isESM ? <span className="text-accent">ESM</span> : enriched?.isESM === false ? <span className="text-medium">CJS</span> : "\u2014"}
                </td>
                <td className="px-3 py-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleRemove(pkg.name) }}
                    className={`text-xs transition ${isRemoved ? "text-accent" : "text-muted hover:text-huge"}`}>
                    {isRemoved ? "Undo" : "Remove"}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
