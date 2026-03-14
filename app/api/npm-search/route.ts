import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    )

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = await res.json()
    const results = (data.objects || []).map(
      (obj: {
        package: {
          name: string
          version: string
          description?: string
          links?: { npm?: string }
        }
        score?: { detail?: { popularity?: number } }
        downloads?: { weekly?: number }
      }) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description || "",
        popularity: obj.score?.detail?.popularity || 0,
      })
    )

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
