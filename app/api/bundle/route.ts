import { NextRequest, NextResponse } from "next/server"

interface PackageReq {
  name: string
  version: string
}

interface BundleResult {
  name: string
  version: string
  size: number
  gzip: number
  dependencyCount: number
  dependencies: Record<string, string>
  description: string
  repository?: string
  error?: string
}

function cleanVersion(version: string): string {
  const cleaned = version.replace(/^[\^~>=<]+/, "").split(" ")[0]
  // If version looks invalid, omit it
  if (!/^\d/.test(cleaned)) return ""
  return cleaned
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.status === 429 && i < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
      continue
    }
    return res
  }
  return fetch(url)
}

async function fetchPackageSize(pkg: PackageReq): Promise<BundleResult> {
  const version = cleanVersion(pkg.version)
  const query = version ? `${pkg.name}@${version}` : pkg.name

  try {
    const res = await fetchWithRetry(
      `https://bundlephobia.com/api/size?package=${encodeURIComponent(query)}`
    )

    if (!res.ok) {
      return {
        name: pkg.name,
        version: pkg.version,
        size: 0,
        gzip: 0,
        dependencyCount: 0,
        dependencies: {},
        description: "",
        error: `HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    return {
      name: data.name || pkg.name,
      version: data.version || pkg.version,
      size: data.size || 0,
      gzip: data.gzip || 0,
      dependencyCount: data.dependencyCount || 0,
      dependencies: data.dependencySizes
        ? Object.fromEntries(
            (data.dependencySizes as Array<{ name: string; approximateSize: number }>).map(
              (d) => [d.name, String(d.approximateSize)]
            )
          )
        : {},
      description: data.description || "",
      repository: data.repository || undefined,
    }
  } catch {
    return {
      name: pkg.name,
      version: pkg.version,
      size: 0,
      gzip: 0,
      dependencyCount: 0,
      dependencies: {},
      description: "",
      error: "Failed to fetch",
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const packages: PackageReq[] = body.packages || []

    if (packages.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Batch into chunks of 10
    const chunks: PackageReq[][] = []
    for (let i = 0; i < packages.length; i += 10) {
      chunks.push(packages.slice(i, i + 10))
    }

    const allResults: BundleResult[] = []
    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(fetchPackageSize))
      allResults.push(...results)
    }

    return NextResponse.json(
      { results: allResults },
      {
        headers: {
          "Cache-Control": "public, max-age=86400",
        },
      }
    )
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
