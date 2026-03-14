import { NextRequest, NextResponse } from "next/server"

interface PackageReq {
  name: string
  version: string
}

interface EnrichedResult {
  latest?: string
  versionsBehind?: number
  license?: string
  lastPublish?: string
  maintainers?: number
  hasTypes?: boolean
  typesPackage?: string
  isESM?: boolean
  moduleField?: boolean
  exportsField?: boolean
  weeklyDownloads?: number
  sizeHistory?: { version: string; gzip: number }[]
}

async function fetchMetadata(pkg: PackageReq): Promise<{ name: string; data: EnrichedResult }> {
  const result: EnrichedResult = {}

  try {
    // Fetch full package info
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`, {
      headers: { Accept: "application/json" },
    })

    if (res.ok) {
      const data = await res.json()

      // Latest version
      const latest = data["dist-tags"]?.latest
      if (latest) {
        result.latest = latest
        // Count versions behind
        const versions = Object.keys(data.versions || {})
        const currentIdx = versions.indexOf(pkg.version)
        const latestIdx = versions.indexOf(latest)
        if (currentIdx >= 0 && latestIdx >= 0) {
          result.versionsBehind = Math.max(0, latestIdx - currentIdx)
        }
      }

      // Last publish from time field
      const time = data.time as Record<string, string> | undefined
      if (time) {
        const versionTime = time[pkg.version] || time[latest] || time.modified
        if (versionTime) result.lastPublish = versionTime
      }

      // Version-specific data
      const versionData = data.versions?.[pkg.version] || data.versions?.[latest]
      if (versionData) {
        result.license = versionData.license || data.license
        result.maintainers = (versionData.maintainers || data.maintainers || []).length
        result.hasTypes = !!(versionData.types || versionData.typings)
        result.moduleField = !!versionData.module
        result.exportsField = !!versionData.exports
        result.isESM = !!(versionData.module || (versionData.exports && typeof versionData.exports === "object"))
        if (!result.hasTypes) {
          result.typesPackage = `@types/${pkg.name.replace("@", "").replace("/", "__")}`
        }
      }

      // Size history: last 5 versions
      const allVersions = Object.keys(data.versions || {})
      const last5 = allVersions.slice(-5)
      const sizeHistory: { version: string; gzip: number }[] = []
      for (const v of last5) {
        try {
          const sizeRes = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(pkg.name)}@${v}`)
          if (sizeRes.ok) {
            const sizeData = await sizeRes.json()
            sizeHistory.push({ version: v, gzip: sizeData.gzip || 0 })
          }
        } catch {
          // skip
        }
      }
      if (sizeHistory.length > 0) result.sizeHistory = sizeHistory
    }

    // Weekly downloads
    try {
      const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg.name)}`)
      if (dlRes.ok) {
        const dlData = await dlRes.json()
        result.weeklyDownloads = dlData.downloads || 0
      }
    } catch {
      // skip
    }
  } catch {
    // return partial data
  }

  return { name: pkg.name, data: result }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const packages: PackageReq[] = body.packages || []

    const enriched: Record<string, EnrichedResult> = {}

    // Batch into chunks of 5
    for (let i = 0; i < packages.length; i += 5) {
      const chunk = packages.slice(i, i + 5)
      const results = await Promise.all(chunk.map(fetchMetadata))
      for (const r of results) {
        enriched[r.name] = r.data
      }
    }

    return NextResponse.json({ results: enriched })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
