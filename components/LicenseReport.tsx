"use client"

import { useBundleStore } from "@/store/bundleStore"
import { licenseRisk, colorForLicense } from "@/lib/formatBytes"
import { useState } from "react"

export default function LicenseReport() {
  const { packages, enrichedData } = useBundleStore()
  const [show, setShow] = useState(false)

  const pkgs = packages.filter((p) => !p.error)
  const licenseMap = new Map<string, string[]>()
  for (const p of pkgs) {
    const license = enrichedData[p.name]?.license || "Unknown"
    if (!licenseMap.has(license)) licenseMap.set(license, [])
    licenseMap.get(license)!.push(p.name)
  }

  const rows = [...licenseMap.entries()].sort((a, b) => b[1].length - a[1].length)

  const handleExportCsv = () => {
    const csvLines = ["License,Count,Packages,Risk"]
    for (const [license, names] of rows) {
      csvLines.push(`"${license}",${names.length},"${names.join("; ")}","${licenseRisk(license)}"`)
    }
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "bundleviz-licenses.csv"
    link.click()
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="w-full border-t border-border py-3 text-xs text-muted hover:text-foreground transition text-center">
        Show License Report
      </button>
    )
  }

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">License Report</h3>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground">Export CSV</button>
          <button onClick={() => setShow(false)} className="text-xs text-muted hover:text-foreground">Close</button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1 text-left text-muted">License</th>
            <th className="px-2 py-1 text-left text-muted">Count</th>
            <th className="px-2 py-1 text-left text-muted">Risk</th>
            <th className="px-2 py-1 text-left text-muted">Packages</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([license, names]) => (
            <tr key={license} className="border-b border-border/30">
              <td className="px-2 py-1 font-mono" style={{ color: colorForLicense(license) }}>{license}</td>
              <td className="px-2 py-1 text-foreground">{names.length}</td>
              <td className="px-2 py-1" style={{ color: colorForLicense(license) }}>{licenseRisk(license)}</td>
              <td className="px-2 py-1 text-muted">{names.slice(0, 5).join(", ")}{names.length > 5 ? ` +${names.length - 5}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
