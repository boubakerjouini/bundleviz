"use client"

import { useState } from "react"
import { useBundleStore } from "@/store/bundleStore"
import { formatMs, loadTimeMs, formatBytes } from "@/lib/formatBytes"

export default function LoadTimeCalc() {
  const { packages, removed } = useBundleStore()
  const [speed, setSpeed] = useState(10)
  const [show, setShow] = useState(false)

  const totalGzip = packages.filter((p) => !p.error && !removed.includes(p.name)).reduce((sum, p) => sum + p.gzip, 0)

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="text-xs text-muted hover:text-foreground transition">
        Load time
      </button>
    )
  }

  const presets = [
    { label: "3G", speed: 1.6 },
    { label: "4G", speed: 10 },
    { label: "WiFi", speed: 50 },
    { label: "Fiber", speed: 100 },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Load Time Estimate</h3>
        <button onClick={() => setShow(false)} className="text-xs text-muted hover:text-foreground">x</button>
      </div>
      <p className="text-xs text-muted mb-3">Bundle: {formatBytes(totalGzip)} gzip</p>

      <div className="space-y-2 mb-3">
        {presets.map((p) => (
          <div key={p.label} className="flex items-center justify-between text-xs">
            <span className="text-muted">{p.label} ({p.speed} Mbps)</span>
            <span className="font-mono text-foreground">{formatMs(loadTimeMs(totalGzip, p.speed))}</span>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Custom: {speed} Mbps</label>
        <input type="range" min="0.5" max="200" step="0.5" value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full" />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-muted">0.5 Mbps</span>
          <span className="font-mono text-foreground">{formatMs(loadTimeMs(totalGzip, speed))}</span>
          <span className="text-muted">200 Mbps</span>
        </div>
      </div>
    </div>
  )
}
