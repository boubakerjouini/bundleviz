"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import * as d3 from "d3"
import { useBundleStore } from "@/store/bundleStore"
import { formatBytes, colorForSize, colorForLicense, colorForAge } from "@/lib/formatBytes"
import type { BundleResult } from "@/lib/types"
import Tooltip from "./Tooltip"

export default function TreemapCanvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    packages, filter, sort, search, drillStack, removed,
    selectPackage, drillInto, selected, colorMode,
    enrichedData, securityData,
  } = useBundleStore()

  const [tooltip, setTooltip] = useState({
    visible: false, name: "", version: "", gzip: 0, size: 0, x: 0, y: 0,
  })

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const getFiltered = useCallback((): BundleResult[] => {
    let filtered = packages.filter((p) => !p.error)
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
    if (colorMode === "size") return colorForSize(gzip)
    const enriched = enrichedData[name]
    if (colorMode === "license") return colorForLicense(enriched?.license)
    if (colorMode === "age") return colorForAge(enriched?.lastPublish)
    if (colorMode === "risk") {
      const sec = securityData[name]
      const hasVulns = sec && sec.vulns.length > 0
      const isOld = enriched?.lastPublish && (Date.now() - new Date(enriched.lastPublish).getTime()) > 18 * 30 * 24 * 60 * 60 * 1000
      if (hasVulns) return "#ef4444"
      if (isOld) return "#f97316"
      return "#22c55e"
    }
    return colorForSize(gzip)
  }, [colorMode, enrichedData, securityData])

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // D3 render with animated transitions
  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return

    const filteredPackages = getFiltered()
    if (filteredPackages.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove()
      return
    }

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    svg.attr("width", width).attr("height", height)

    // Set up zoom if not already
    let zoomGroup = svg.select<SVGGElement>("g.zoom-group")
    if (zoomGroup.empty()) {
      zoomGroup = svg.append("g").attr("class", "zoom-group")
      // Add stripe pattern for duplicates
      const defs = svg.append("defs")
      const pattern = defs.append("pattern")
        .attr("id", "stripe")
        .attr("width", 8)
        .attr("height", 8)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "rotate(45)")
      pattern.append("rect").attr("width", 4).attr("height", 8).attr("fill", "#f97316").attr("opacity", 0.3)

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          zoomGroup.attr("transform", event.transform)
        })
      svg.call(zoom)
      zoomRef.current = zoom
    }

    interface TreeNode {
      name: string
      gzip?: number
      size?: number
      version?: string
      children?: TreeNode[]
    }

    const hierarchyData: TreeNode = {
      name: "root",
      children: filteredPackages.map((p) => ({
        name: p.name, gzip: p.gzip, size: p.size, version: p.version,
      })),
    }

    const root = d3
      .hierarchy<TreeNode>(hierarchyData)
      .sum((d) => d.gzip || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    const treemapLayout = d3
      .treemap<TreeNode>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(1)
      .round(true)

    treemapLayout(root)

    type RectNode = d3.HierarchyRectangularNode<TreeNode>
    const leaves = root.leaves() as RectNode[]

    // Detect duplicates (same name different versions in dep tree)
    const nameCounts = new Map<string, number>()
    for (const pkg of packages) {
      if (pkg.dependencies) {
        for (const depName of Object.keys(pkg.dependencies)) {
          nameCounts.set(depName, (nameCounts.get(depName) || 0) + 1)
        }
      }
    }
    const duplicateNames = new Set(
      [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
    )

    // Check which packages appear in securityData with vulns
    const vulnNames = new Set(
      Object.entries(securityData).filter(([, d]) => d.vulns.length > 0).map(([name]) => name)
    )

    // Data join with key
    const nodes = zoomGroup
      .selectAll<SVGGElement, RectNode>("g.node")
      .data(leaves, (d) => d.data.name)

    // EXIT
    nodes.exit()
      .transition().duration(300)
      .style("opacity", 0)
      .remove()

    // ENTER
    const enter = nodes.enter()
      .append("g")
      .attr("class", "node")
      .attr("data-testid", (d) => `node-${d.data.name}`)
      .attr("data-package", (d) => d.data.name)
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("opacity", 0)
      .style("cursor", "pointer")

    enter.append("rect").attr("class", "node-rect")
    enter.append("text").attr("class", "node-name")
    enter.append("text").attr("class", "node-size")
    // Security icon rect
    enter.append("text").attr("class", "node-icon")

    // Transition enter to visible
    enter.transition().duration(300).style("opacity", 1)

    // MERGE (enter + update)
    const merged = enter.merge(nodes)

    merged.transition().duration(300)
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)

    // Set fill immediately (no transition) — must use .style() not .attr() to override Tailwind Preflight's fill:currentColor
    merged.select("rect.node-rect")
      .style("fill", (d) => getColor(d.data.name, d.data.gzip || 0))
      .style("opacity", (d) => String(removed.includes(d.data.name) ? 0.4 : 1))

    merged.select("rect.node-rect")
      .transition().duration(300)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .style("fill", (d) => getColor(d.data.name, d.data.gzip || 0))
      .attr("rx", 3)
      .style("opacity", (d) => String(removed.includes(d.data.name) ? 0.4 : 1))
      .attr("stroke", (d) => {
        if (selected === d.data.name) return "#ffffff"
        if (duplicateNames.has(d.data.name)) return "#f97316"
        if (vulnNames.has(d.data.name)) return "#ef4444"
        return "transparent"
      })
      .attr("stroke-width", (d) => {
        if (selected === d.data.name || duplicateNames.has(d.data.name) || vulnNames.has(d.data.name)) return 2
        return 0
      })

    // Event handlers
    merged.select("rect.node-rect")
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
      .on("mouseout", () => {
        setTooltip((t) => ({ ...t, visible: false }))
      })
      .on("click", (_, d) => selectPackage(d.data.name))
      .on("dblclick", (_, d) => drillInto(d.data.name))

    // Text labels
    merged.each(function (d) {
      const w = d.x1 - d.x0
      const h = d.y1 - d.y0
      const g = d3.select(this)
      const name = d.data.name
      const gzip = d.data.gzip || 0
      const maxChars = Math.floor(w / 8)
      const displayName = w < 40 || h < 30 ? "" : (name.length > maxChars ? name.slice(0, maxChars) + "\u2026" : name)

      g.select("text.node-name")
        .attr("x", 6).attr("y", 16)
        .attr("font-size", w < 40 || h < 30 ? 0 : Math.min(12, w / 8))
        .attr("fill", removed.includes(name) ? "rgba(255,255,255,0.4)" : "white")
        .attr("font-family", "JetBrains Mono, monospace")
        .style("text-decoration", removed.includes(name) ? "line-through" : "none")
        .text(displayName)

      g.select("text.node-size")
        .attr("x", 6).attr("y", 30)
        .attr("font-size", h > 40 && w > 40 ? 10 : 0)
        .attr("fill", "rgba(255,255,255,0.6)")
        .attr("font-family", "JetBrains Mono, monospace")
        .text(h > 40 && w > 40 ? formatBytes(gzip) : "")

      // Security icon
      const hasVuln = vulnNames.has(name)
      g.select("text.node-icon")
        .attr("x", w - 16).attr("y", 14)
        .attr("font-size", hasVuln && w > 50 ? 12 : 0)
        .attr("fill", "#ef4444")
        .text(hasVuln && w > 50 ? "\u26A0" : "")
    })
  }, [packages, filter, sort, search, drillStack, removed, selected, dimensions, getFiltered, selectPackage, drillInto, totalGzip, colorMode, enrichedData, securityData, getColor])

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.5)
  }

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.67)
  }

  const handleZoomReset = () => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "100%", minHeight: 400 }}>
      <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button onClick={handleZoomIn} className="rounded bg-card/80 px-2 py-1 text-xs text-foreground hover:bg-card border border-border" title="Zoom in">+</button>
        <button onClick={handleZoomOut} className="rounded bg-card/80 px-2 py-1 text-xs text-foreground hover:bg-card border border-border" title="Zoom out">-</button>
        <button onClick={handleZoomReset} className="rounded bg-card/80 px-2 py-1 text-xs text-foreground hover:bg-card border border-border" title="Reset zoom">Reset</button>
      </div>
      <Tooltip {...tooltip} totalGzip={totalGzip} />
    </div>
  )
}
