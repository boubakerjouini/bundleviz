"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useBundleStore } from "@/store/bundleStore"
import Navbar from "@/components/Navbar"
import Toolbar from "@/components/Toolbar"
import TreemapCanvas from "@/components/TreemapCanvas"
import SunburstChart from "@/components/SunburstChart"
import SidePanel from "@/components/SidePanel"
import ListView from "@/components/ListView"
import LicenseReport from "@/components/LicenseReport"
import LoadTimeCalc from "@/components/LoadTimeCalc"
import KeyboardShortcuts from "@/components/KeyboardShortcuts"
import { motion } from "framer-motion"
import BundleLoader from "@/components/BundleLoader"

function AnalyzeContent() {
  const { packages, loading, error, view, analyze, rawJson, theme } = useBundleStore()

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])
  
  // Estimate package count from raw JSON for loader display
  const packageCount = (() => {
    try {
      const parsed = JSON.parse(rawJson || "{}")
      return Object.keys({ ...parsed.dependencies, ...parsed.devDependencies }).length
    } catch { return 0 }
  })()
  const treemapRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Check share param
    const shareParam = searchParams.get("share")
    if (shareParam) {
      try {
        const names: string[] = JSON.parse(atob(shareParam))
        const fakeJson = JSON.stringify({
          dependencies: Object.fromEntries(names.map((n) => {
            const parts = n.split("@")
            const name = parts.length > 2 ? `@${parts[1]}` : parts[0]
            const version = parts[parts.length - 1] || "latest"
            return [name, version]
          })),
        })
        analyze(fakeJson)
        return
      } catch { /* ignore */ }
    }

    // Check sessionStorage
    const stored = sessionStorage.getItem("bundleviz-json")
    if (stored) {
      analyze(stored)
    }
  }, [searchParams, analyze])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />
      <Toolbar treemapRef={treemapRef} />

      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <BundleLoader packageCount={packageCount} />
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-huge">{error}</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted">No data. Go back and paste a package.json to analyze.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col overflow-hidden">
              <div ref={treemapRef} className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                {view === "treemap" ? <TreemapCanvas /> : view === "sunburst" ? <SunburstChart /> : <ListView />}
              </div>
              <LicenseReport />
            </div>
            <div className="w-80 max-md:hidden" data-testid="side-panel-container">
              <SidePanel />
            </div>
          </>
        )}
      </div>

      <LoadTimeCalc />
      <KeyboardShortcuts treemapRef={treemapRef} />
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-muted">Loading...</div>}>
      <AnalyzeContent />
    </Suspense>
  )
}
