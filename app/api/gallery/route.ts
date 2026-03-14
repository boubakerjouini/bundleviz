import { NextRequest, NextResponse } from "next/server"

// In-memory gallery store (no external DB dependency)
// In production, you'd use a real database
interface GalleryEntry {
  id: string
  shortId: string
  repoName: string | null
  totalGzip: number
  packageCount: number
  packages: string // JSON string
  createdAt: string
  viewCount: number
}

const galleryStore: GalleryEntry[] = []

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8)
}

export async function GET() {
  const sorted = [...galleryStore].sort((a, b) => b.totalGzip - a.totalGzip)
  return NextResponse.json({ entries: sorted.slice(0, 50) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repoName, totalGzip, packageCount, packages } = body

    const entry: GalleryEntry = {
      id: crypto.randomUUID(),
      shortId: generateShortId(),
      repoName: repoName || null,
      totalGzip: totalGzip || 0,
      packageCount: packageCount || 0,
      packages: typeof packages === "string" ? packages : JSON.stringify(packages),
      createdAt: new Date().toISOString(),
      viewCount: 0,
    }

    galleryStore.push(entry)

    return NextResponse.json({ shortId: entry.shortId, id: entry.id })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
