"use client"

import { formatBytes } from "@/lib/formatBytes"

interface TooltipProps {
  name: string
  version: string
  gzip: number
  size: number
  totalGzip: number
  x: number
  y: number
  visible: boolean
}

export default function Tooltip({ name, version, gzip, size, totalGzip, x, y, visible }: TooltipProps) {
  if (!visible) return null

  const pct = totalGzip > 0 ? ((gzip / totalGzip) * 100).toFixed(1) : "0"

  return (
    <div
      className="pointer-events-none fixed z-[100] rounded-lg border border-border bg-card px-4 py-3 shadow-xl"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-mono text-sm font-semibold text-foreground">{name}</p>
      <p className="text-xs text-muted">v{version}</p>
      <div className="mt-2 flex gap-4 text-xs">
        <div>
          <span className="text-muted">Gzip: </span>
          <span className="font-mono text-foreground">{formatBytes(gzip)}</span>
        </div>
        <div>
          <span className="text-muted">Min: </span>
          <span className="font-mono text-foreground">{formatBytes(size)}</span>
        </div>
        <div>
          <span className="text-muted">Share: </span>
          <span className="font-mono text-foreground">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
