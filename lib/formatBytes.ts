export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`
  return `${(bytes / (1024 * 1024)).toFixed(2)} mb`
}

export function colorForSize(gzip: number): string {
  if (gzip <= 0) return "#374151"
  if (gzip < 10240) return "#22c55e"
  if (gzip < 51200) return "#f59e0b"
  if (gzip < 102400) return "#f97316"
  return "#ef4444"
}

export function colorForLicense(license: string | undefined): string {
  if (!license) return "#6b7280"
  const l = license.toLowerCase()
  if (["mit", "isc", "apache-2.0", "apache 2.0"].some((k) => l.includes(k))) return "#22c55e"
  if (l.includes("bsd")) return "#f59e0b"
  if (["gpl", "agpl", "lgpl"].some((k) => l.includes(k))) return "#ef4444"
  return "#6b7280"
}

export function colorForAge(lastPublish: string | undefined): string {
  if (!lastPublish) return "#6b7280"
  const months = (Date.now() - new Date(lastPublish).getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (months < 6) return "#22c55e"
  if (months < 18) return "#f59e0b"
  return "#ef4444"
}

export function licenseRisk(license: string | undefined): "safe" | "caution" | "risky" | "unknown" {
  if (!license) return "unknown"
  const l = license.toLowerCase()
  if (["mit", "isc", "apache-2.0", "apache 2.0", "0bsd", "unlicense", "cc0"].some((k) => l.includes(k))) return "safe"
  if (l.includes("bsd")) return "caution"
  if (["gpl", "agpl", "lgpl"].some((k) => l.includes(k))) return "risky"
  return "unknown"
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function loadTimeMs(gzipBytes: number, speedMbps: number): number {
  return (gzipBytes * 8) / (speedMbps * 1_000_000) * 1000
}

export function formatMs(ms: number): string {
  if (ms < 1) return "<1ms"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
