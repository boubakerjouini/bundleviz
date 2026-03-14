"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import * as d3 from "d3"
import { useBundleStore } from "@/store/bundleStore"
import { formatBytes, colorForSize, colorForLicense, colorForAge } from "@/lib/formatBytes"
import type { BundleResult } from "@/lib/types"
import Tooltip from "./Tooltip"

export default function SunburstChart() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    packages, filter, sort, search, removed,
    selectPackage, selected, colorMode,
    enrichedData, securityData,
  } = useBundleStore()

  const [tooltip, setTooltip] = useState({
    visible: false, name: "", version: "", gzip: 0, size: 0, x: 0, y: 0,
  })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const getFiltered = useCallback((): BundleResult[] => {
    let filtered = packages.map((p) => p.error ? { ...p, gzip: p.size || 1024, size: p.size || 1024 } : p)
    if (filter === "dep") filtered = filtered.filter((p) => p.type === "dep")
    if (filter === "dev") filtered = filtered.filter((p) => p.type === "dev")
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (sort === "alpha") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "deps") filtered = [...filtered].sort((a, b) => b.dependencyCount - a.dependencyCount)
    return filtered
  }, [packages, filter, sort, search])

  const totalGzip = packages.filter((p) => !p.error).reduce((sum, p) => sum + p.gzip, 0)

  const getColor = useCallback((name: string, gzip: number): string => {
    const pkg = packages.find((p) => p.name === name)
    if (pkg?.error) return "#374151"
    if (colorMode === "size") return colorForSize(gzip)
    const enriched = enrichedData[name]
    if (colorMode === "license") return colorForLicense(enriched?.license)
    if (colorMode === "age") return colorForAge(enriched?.lastPublish)
    if (colorMode === "risk") {
      const sec = securityData[name]
      if (sec && sec.vulns.length > 0) return "#ef4444"
      const isOld = enriched?.lastPublish && (Date.now() - new Date(enriched.lastPublish).getTime()) > 18 * 30 * 24 * 60 * 60 * 1000
      if (isOld) return "#f97316"
      return "#22c55e"
    }
    return colorForSize(gzip)
  }, [colorMode, enrichedData, securityData])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return
    const filteredPackages = getFiltered()
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    if (filteredPackages.length === 0) return

    const { width, height } = dimensions
    const radius = Math.min(width, height) / 2

    svg.attr("width", width).attr("height", height)

    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`)

    interface SunNode {
      name: string
      gzip?: number
      size?: number
      version?: string
      children?: SunNode[]
    }

    const hierarchyData: SunNode = {
      name: "root",
      children: filteredPackages.map((p) => ({
        name: p.name, gzip: p.gzip, size: p.size, version: p.version,
      })),
    }

    const root = d3.hierarchy<SunNode>(hierarchyData)
      .sum((d) => d.gzip || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    const partition = d3.partition<SunNode>().size([2 * Math.PI, radius])
    partition(root)

    type ArcNode = d3.HierarchyRectangularNode<SunNode>
    const arc = d3.arc<ArcNode>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0 * 0.6)
      .outerRadius((d) => d.y1 * 0.95)
      .padAngle(0.01)
      .padRadius(radius / 2)

    const descendants = root.descendants().filter((d) => d.depth > 0) as ArcNode[]

    g.selectAll("path")
      .data(descendants)
      .join("path")
      .attr("d", arc)
      .style("fill", (d) => getColor(d.data.name, d.data.gzip || 0))
      .style("opacity", (d) => String(removed.includes(d.data.name) ? 0.3 : 0.9))
      .attr("stroke", (d) => (selected === d.data.name ? "#ffffff" : "#0a0a0a"))
      .attr("stroke-width", (d) => (selected === d.data.name ? 2 : 0.5))
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setTooltip({
          visible: true, name: d.data.name, version: d.data.version || "",
          gzip: d.data.gzip || 0, size: d.data.size || 0,
          x: event.clientX, y: event.clientY,
        })
      })
      .on("mousemove", (event) => {
        setTooltip((t) => ({ ...t, x: event.clientX, y: event.clientY }))
      })
      .on("mouseout", () => setTooltip((t) => ({ ...t, visible: false })))
      .on("click", (_, d) => selectPackage(d.data.name))

    // Labels for large arcs
    g.selectAll("text")
      .data(descendants.filter((d) => (d.x1 - d.x0) > 0.1))
      .join("text")
      .attr("transform", (d) => {
        const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI) - 90
        const r = (d.y0 + d.y1) / 2 * 0.775
        return `rotate(${angle}) translate(${r},0) rotate(${angle > 90 ? 180 : 0})`
      })
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "white")
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d) => {
        const arcLen = (d.x1 - d.x0) * (d.y0 + d.y1) / 2 * 0.775
        const maxChars = Math.floor(arcLen / 7)
        return d.data.name.length > maxChars ? d.data.name.slice(0, maxChars) + "\u2026" : d.data.name
      })

    // Center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "white")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("dy", -5)
      .text(formatBytes(totalGzip))

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(255,255,255,0.5)")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("dy", 12)
      .text(`${filteredPackages.length} packages`)

  }, [packages, filter, sort, search, removed, selected, dimensions, getFiltered, totalGzip, colorMode, enrichedData, securityData, getColor])

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-[400px]">
      <svg ref={svgRef} className="h-full w-full" />
      <Tooltip {...tooltip} totalGzip={totalGzip} />
    </div>
  )
}
