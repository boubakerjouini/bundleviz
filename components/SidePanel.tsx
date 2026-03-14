"use client"

import { useBundleStore } from "@/store/bundleStore"
import { formatBytes, formatNumber, colorForLicense, licenseRisk } from "@/lib/formatBytes"
import { alternatives } from "@/lib/alternatives"
import { motion, AnimatePresence } from "framer-motion"
import { useRef, useEffect } from "react"
import * as d3 from "d3"

export default function SidePanel() {
  const { packages, selected, removed, selectPackage, toggleRemove, drillInto, enrichedData, securityData } = useBundleStore()
  const pkg = packages.find((p) => p.name === selected)
  const totalGzip = packages.filter((p) => !p.error).reduce((sum, p) => sum + p.gzip, 0)

  const enriched = selected ? enrichedData[selected] : undefined
  const security = selected ? securityData[selected] : undefined
  const alts = selected ? alternatives[selected] : undefined

  return (
    <div data-testid="side-panel" className="flex h-full w-full flex-col overflow-y-auto border-l border-border bg-surface p-4">
      <AnimatePresence mode="wait">
        {pkg ? (
          <motion.div key={pkg.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {/* Header */}
            <div className="mb-4">
              <h2 className="font-mono text-lg font-semibold text-foreground">{pkg.name}</h2>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="inline-block rounded bg-card px-2 py-0.5 font-mono text-xs text-muted">v{pkg.version}</span>
                {enriched?.hasTypes && <span className="inline-block rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">TS</span>}
                {enriched?.isESM && <span className="inline-block rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">ESM</span>}
                {enriched?.isESM === false && <span className="inline-block rounded bg-medium/20 px-2 py-0.5 text-xs text-medium">CJS only</span>}
                {enriched?.license && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs" style={{
                    backgroundColor: colorForLicense(enriched.license) + "20",
                    color: colorForLicense(enriched.license),
                  }}>{enriched.license}</span>
                )}
              </div>
            </div>

            {pkg.description && <p className="mb-4 text-sm text-muted">{pkg.description}</p>}

            {pkg.error ? (
              <p className="mb-4 rounded bg-huge/10 px-3 py-2 text-sm text-huge">{pkg.error}</p>
            ) : (
              <>
                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Stat label="Gzip" value={formatBytes(pkg.gzip)} />
                  <Stat label="Minified" value={formatBytes(pkg.size)} />
                  <Stat label="% of Total" value={totalGzip > 0 ? `${((pkg.gzip / totalGzip) * 100).toFixed(1)}%` : "\u2014"} />
                  <Stat label="Dependencies" value={String(pkg.dependencyCount)} />
                  {enriched?.weeklyDownloads != null && (
                    <Stat label="Downloads/wk" value={formatNumber(enriched.weeklyDownloads)} />
                  )}
                  {enriched?.maintainers != null && (
                    <Stat label="Maintainers" value={String(enriched.maintainers)} />
                  )}
                </div>

                {/* Outdated warning */}
                {enriched?.versionsBehind != null && enriched.versionsBehind > 0 && (
                  <div className="mb-3 rounded bg-medium/10 px-3 py-2 text-xs text-medium">
                    {enriched.versionsBehind} version{enriched.versionsBehind > 1 ? "s" : ""} behind (latest: {enriched.latest})
                  </div>
                )}

                {/* Security */}
                {security && security.vulns.length > 0 && (
                  <div className="mb-3 rounded bg-huge/10 px-3 py-2">
                    <p className="text-xs font-medium text-huge mb-1">{security.vulns.length} vulnerabilit{security.vulns.length > 1 ? "ies" : "y"}</p>
                    {security.vulns.slice(0, 3).map((v) => (
                      <div key={v.id} className="text-xs text-muted mt-1">
                        <span className="text-huge font-mono">{v.id}</span>: {v.summary}
                        {v.severity && <span className="ml-1 text-huge">({v.severity})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tree-shaking */}
                {enriched && (
                  <div className="mb-3 text-xs">
                    {enriched.isESM ? (
                      <span className="text-accent">Tree-shakeable (ESM)</span>
                    ) : (
                      <span className="text-medium">CJS only - not tree-shakeable</span>
                    )}
                    {!enriched.hasTypes && enriched.typesPackage && (
                      <span className="ml-2 text-muted">Types: @types/{pkg.name.replace("@", "").replace("/", "__")}</span>
                    )}
                  </div>
                )}

                {/* Popularity score */}
                {enriched?.weeklyDownloads != null && (
                  <PopularityBadge downloads={enriched.weeklyDownloads} lastPublish={enriched.lastPublish} />
                )}

                {/* Size History Sparkline */}
                {enriched?.sizeHistory && enriched.sizeHistory.length > 1 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted mb-1">Size history</p>
                    <Sparkline data={enriched.sizeHistory} />
                  </div>
                )}

                {/* Nested Treemap (sub-deps) */}
                {Object.keys(pkg.dependencies).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted mb-1">Sub-dependency breakdown</p>
                    <NestedTreemap deps={pkg.dependencies} />
                  </div>
                )}

                {/* Alternatives */}
                {alts && alts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-accent mb-2">Better alternatives:</p>
                    {alts.map((alt) => (
                      <div key={alt.name} className="mb-2 rounded bg-card p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-foreground">{alt.name}</span>
                          <span className="text-xs text-accent">
                            {alt.gzip > 0 ? formatBytes(alt.gzip) : "0 B"}
                            {alt.gzip < pkg.gzip && ` (-${formatBytes(pkg.gzip - alt.gzip)})`}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{alt.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Links */}
                <div className="mb-4 flex gap-2">
                  <a href={`https://www.npmjs.com/package/${pkg.name}`} target="_blank" rel="noopener noreferrer"
                    data-testid="npm-link"
                    className="rounded border border-border px-3 py-1 text-xs text-muted transition hover:text-foreground">npm</a>
                  {pkg.repository && (
                    <a href={pkg.repository} target="_blank" rel="noopener noreferrer"
                      className="rounded border border-border px-3 py-1 text-xs text-muted transition hover:text-foreground">GitHub</a>
                  )}
                </div>

                {/* What-if */}
                <button onClick={() => toggleRemove(pkg.name)}
                  className={`mb-4 w-full rounded-md px-3 py-2 text-sm font-medium transition ${
                    removed.includes(pkg.name) ? "bg-accent text-background" : "border border-border text-muted hover:border-accent hover:text-accent"
                  }`}>
                  {removed.includes(pkg.name) ? "Undo remove" : "What if I remove this?"}
                </button>

                {/* Sub-dependencies list */}
                {Object.keys(pkg.dependencies).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-muted">Dependencies of this package</h3>
                    <div className="space-y-1">
                      {Object.entries(pkg.dependencies).map(([name]) => (
                        <button key={name} onClick={() => {
                          const exists = packages.find((p) => p.name === name)
                          if (exists) selectPackage(name)
                          else drillInto(name)
                        }} className="block w-full rounded px-2 py-1 text-left font-mono text-xs text-muted transition hover:bg-card hover:text-foreground">
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex h-full items-center justify-center text-sm text-muted">
            Click any package to inspect
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-card p-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function PopularityBadge({ downloads, lastPublish }: { downloads: number; lastPublish?: string }) {
  // Simple popularity score
  let dlScore = 0
  if (downloads > 10_000_000) dlScore = 40
  else if (downloads > 1_000_000) dlScore = 32
  else if (downloads > 100_000) dlScore = 24
  else if (downloads > 10_000) dlScore = 16
  else dlScore = 8

  let recencyScore = 15
  if (lastPublish) {
    const months = (Date.now() - new Date(lastPublish).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (months < 3) recencyScore = 30
    else if (months < 6) recencyScore = 24
    else if (months < 12) recencyScore = 18
    else if (months < 24) recencyScore = 12
    else recencyScore = 6
  }

  const score = Math.min(100, dlScore + recencyScore + 30) // 30 baseline for stars proxy

  return (
    <div className="mb-3 flex items-center gap-2 text-xs">
      <span className="text-muted">Popularity:</span>
      <span className={`font-mono font-semibold ${score > 60 ? "text-accent" : score > 30 ? "text-medium" : "text-huge"}`}>
        {score}/100
      </span>
      {score > 80 && <span className="text-medium">Hot</span>}
      {score < 30 && <span className="text-huge">Low</span>}
    </div>
  )
}

function Sparkline({ data }: { data: { version: string; gzip: number }[] }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || data.length < 2) return
    const svg = d3.select(ref.current)
    svg.selectAll("*").remove()

    const width = 200, height = 40, margin = { top: 4, right: 4, bottom: 4, left: 4 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr("width", width).attr("height", height)
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, innerW])
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.gzip) || 1]).range([innerH, 0])

    const line = d3.line<{ version: string; gzip: number }>()
      .x((_, i) => x(i))
      .y((d) => y(d.gzip))

    g.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", "#22c55e").attr("stroke-width", 1.5)

    g.selectAll("circle").data(data).join("circle")
      .attr("cx", (_, i) => x(i)).attr("cy", (d) => y(d.gzip))
      .attr("r", 2).attr("fill", "#22c55e")

    // Tooltip-like labels
    g.selectAll("text").data(data).join("text")
      .attr("x", (_, i) => x(i)).attr("y", (d) => y(d.gzip) - 6)
      .attr("text-anchor", "middle").attr("font-size", 7).attr("fill", "#71717a")
      .text((d) => formatBytes(d.gzip))
  }, [data])

  return <svg ref={ref} className="w-full" />
}

function NestedTreemap({ deps }: { deps: Record<string, string> }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll("*").remove()

    const width = 230, height = 120
    svg.attr("width", width).attr("height", height)

    interface DepNode { name: string; value?: number; children?: DepNode[] }

    const entries = Object.entries(deps)
    if (entries.length === 0) return

    const data: DepNode = {
      name: "root",
      children: entries.map(([name, size]) => ({
        name,
        value: parseInt(size) || 1000,
      })),
    }

    const root = d3.hierarchy<DepNode>(data).sum((d) => d.value || 0).sort((a, b) => (b.value || 0) - (a.value || 0))
    d3.treemap<DepNode>().size([width, height]).paddingOuter(2).paddingInner(1).round(true)(root)

    type RN = d3.HierarchyRectangularNode<DepNode>
    const leaves = root.leaves() as RN[]

    const nodes = svg.selectAll<SVGGElement, RN>("g").data(leaves).join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)

    nodes.append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", "#22c55e").attr("opacity", 0.5).attr("rx", 2)

    nodes.each(function (d) {
      const w = d.x1 - d.x0, h = d.y1 - d.y0
      if (w < 30 || h < 15) return
      d3.select(this).append("text")
        .attr("x", 3).attr("y", 11).attr("font-size", 8).attr("fill", "white").attr("font-family", "monospace")
        .text(d.data.name.length > w / 6 ? d.data.name.slice(0, Math.floor(w / 6)) + "\u2026" : d.data.name)
    })
  }, [deps])

  return <svg ref={ref} className="w-full rounded bg-card/50" />
}
