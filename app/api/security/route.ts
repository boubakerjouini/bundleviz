import { NextRequest, NextResponse } from "next/server"

interface PackageReq {
  name: string
  version: string
}

interface OsvVuln {
  id: string
  summary?: string
  severity?: Array<{ type: string; score: string }>
  database_specific?: { severity?: string }
}

async function queryOSV(name: string, version: string): Promise<{ packageName: string; version: string; vulns: Array<{ id: string; summary: string; severity?: string }> }> {
  try {
    const res = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: { name, ecosystem: "npm" },
        version,
      }),
    })

    if (!res.ok) {
      return { packageName: name, version, vulns: [] }
    }

    const data = await res.json()
    const vulns = (data.vulns || []).map((v: OsvVuln) => ({
      id: v.id,
      summary: v.summary || "No description",
      severity: v.database_specific?.severity || (v.severity?.[0]?.score ? `CVSS ${v.severity[0].score}` : undefined),
    }))

    return { packageName: name, version, vulns }
  } catch {
    return { packageName: name, version, vulns: [] }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const packages: PackageReq[] = body.packages || []

    // Batch into chunks of 5 to be nice to OSV API
    const results: Array<{ packageName: string; version: string; vulns: Array<{ id: string; summary: string; severity?: string }> }> = []
    for (let i = 0; i < packages.length; i += 5) {
      const chunk = packages.slice(i, i + 5)
      const chunkResults = await Promise.all(chunk.map((p) => queryOSV(p.name, p.version)))
      results.push(...chunkResults)
    }

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
