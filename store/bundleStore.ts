import { create } from "zustand"
import type { BundleResult, PackageInput, EnrichedData, SecurityResult, ColorMode, ViewMode } from "@/lib/types"

interface BundleState {
  rawJson: string
  packages: BundleResult[]
  selected: string | null
  removed: string[]
  filter: "all" | "dep" | "dev"
  sort: "size" | "alpha" | "deps"
  search: string
  drillStack: string[]
  view: ViewMode
  colorMode: ColorMode
  loading: boolean
  error: string | null
  budget: number | null
  theme: "dark" | "light"
  enrichedData: Record<string, EnrichedData>
  securityData: Record<string, SecurityResult>
  enrichLoading: boolean
  securityLoading: boolean

  setRawJson: (json: string) => void
  analyze: (json: string) => Promise<void>
  analyzePackages: (inputs: PackageInput[]) => Promise<void>
  selectPackage: (name: string | null) => void
  toggleRemove: (name: string) => void
  drillInto: (name: string) => void
  drillBack: () => void
  setFilter: (f: "all" | "dep" | "dev") => void
  setSort: (s: "size" | "alpha" | "deps") => void
  setSearch: (s: string) => void
  setView: (v: ViewMode) => void
  setColorMode: (m: ColorMode) => void
  setBudget: (b: number | null) => void
  setTheme: (t: "dark" | "light") => void
  fetchEnrichedData: () => Promise<void>
  fetchSecurityData: () => Promise<void>
}

function cleanVersion(version: string): string {
  return version.replace(/^[\^~>=<]+/, "").split(" ")[0]
}

function parsePackageJson(json: string): PackageInput[] {
  const parsed = JSON.parse(json)

  // Detect package-lock.json
  if (parsed.lockfileVersion) {
    return parseLockfile(parsed)
  }

  const packages: PackageInput[] = []

  const deps = parsed.dependencies || {}
  for (const [name, version] of Object.entries(deps)) {
    if (name.startsWith("@types/") || (version as string).startsWith("workspace:")) continue
    packages.push({ name, version: cleanVersion(version as string), type: "dep" })
  }

  const devDeps = parsed.devDependencies || {}
  for (const [name, version] of Object.entries(devDeps)) {
    if (name.startsWith("@types/") || (version as string).startsWith("workspace:")) continue
    packages.push({ name, version: cleanVersion(version as string), type: "dev" })
  }

  return packages
}

function parseLockfile(parsed: Record<string, unknown>): PackageInput[] {
  const packages: PackageInput[] = []
  const seen = new Set<string>()

  // v2/v3 format: "packages" field
  const pkgs = parsed.packages as Record<string, { version?: string }> | undefined
  if (pkgs) {
    for (const [key, val] of Object.entries(pkgs)) {
      if (!key || key === "") continue // skip root
      const name = key.replace(/^node_modules\//, "")
      if (name.startsWith("@types/") || seen.has(name)) continue
      seen.add(name)
      if (val.version) {
        packages.push({ name, version: val.version, type: "dep" })
      }
    }
    return packages
  }

  // v1 format: "dependencies" field
  const deps = parsed.dependencies as Record<string, { version?: string }> | undefined
  if (deps) {
    for (const [name, val] of Object.entries(deps)) {
      if (name.startsWith("@types/") || seen.has(name)) continue
      seen.add(name)
      if (val.version) {
        packages.push({ name, version: val.version, type: "dep" })
      }
    }
  }

  return packages
}

export const useBundleStore = create<BundleState>((set, get) => ({
  rawJson: "",
  packages: [],
  selected: null,
  removed: [],
  filter: "all",
  sort: "size",
  search: "",
  drillStack: ["root"],
  view: "treemap",
  colorMode: "size",
  loading: false,
  error: null,
  budget: null,
  theme: "dark" as "dark" | "light",
  enrichedData: {},
  securityData: {},
  enrichLoading: false,
  securityLoading: false,

  setRawJson: (json) => set({ rawJson: json }),

  analyze: async (json: string) => {
    set({ loading: true, error: null, packages: [], selected: null, removed: [], drillStack: ["root"], enrichedData: {}, securityData: {} })
    try {
      const inputs = parsePackageJson(json)
      if (inputs.length === 0) {
        set({ loading: false, error: "No dependencies found" })
        return
      }

      const res = await fetch("/api/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packages: inputs.map((p) => ({ name: p.name, version: p.version })),
        }),
      })

      if (!res.ok) {
        set({ loading: false, error: "Failed to fetch bundle sizes" })
        return
      }

      const data = await res.json()
      const results: BundleResult[] = data.results.map((r: BundleResult, i: number) => ({
        ...r,
        type: inputs[i]?.type || "dep",
      }))

      set({ packages: results, loading: false, rawJson: json })

      // Kick off enrichment in background
      get().fetchEnrichedData()
      get().fetchSecurityData()
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Unknown error" })
    }
  },

  analyzePackages: async (inputs: PackageInput[]) => {
    set({ loading: true, error: null, packages: [], selected: null, removed: [], drillStack: ["root"], enrichedData: {}, securityData: {} })
    try {
      if (inputs.length === 0) {
        set({ loading: false, error: "No packages to analyze" })
        return
      }

      const res = await fetch("/api/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packages: inputs.map((p) => ({ name: p.name, version: p.version })),
        }),
      })

      if (!res.ok) {
        set({ loading: false, error: "Failed to fetch bundle sizes" })
        return
      }

      const data = await res.json()
      const fakeJson = JSON.stringify({
        dependencies: Object.fromEntries(inputs.map((p) => [p.name, p.version])),
      })
      const results: BundleResult[] = data.results.map((r: BundleResult, i: number) => ({
        ...r,
        type: inputs[i]?.type || "dep",
      }))

      set({ packages: results, loading: false, rawJson: fakeJson })
      get().fetchEnrichedData()
      get().fetchSecurityData()
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Unknown error" })
    }
  },

  selectPackage: (name) => set({ selected: name }),
  toggleRemove: (name) =>
    set((s) => ({
      removed: s.removed.includes(name) ? s.removed.filter((n) => n !== name) : [...s.removed, name],
    })),
  drillInto: (name) => set((s) => ({ drillStack: [...s.drillStack, name], selected: null })),
  drillBack: () =>
    set((s) => ({
      drillStack: s.drillStack.length > 1 ? s.drillStack.slice(0, -1) : s.drillStack,
      selected: null,
    })),
  setFilter: (f) => set({ filter: f }),
  setSort: (s) => set({ sort: s }),
  setSearch: (s) => set({ search: s }),
  setView: (v) => set({ view: v }),
  setColorMode: (m) => set({ colorMode: m }),
  setBudget: (b) => set({ budget: b }),
  setTheme: (t) => {
    if (typeof window !== "undefined") localStorage.setItem("bundleviz-theme", t)
    set({ theme: t })
  },

  fetchEnrichedData: async () => {
    const { packages } = get()
    const pkgs = packages.filter((p) => !p.error)
    if (pkgs.length === 0) return
    set({ enrichLoading: true })

    try {
      const res = await fetch("/api/npm-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: pkgs.map((p) => ({ name: p.name, version: p.version })) }),
      })
      if (res.ok) {
        const data = await res.json()
        set({ enrichedData: data.results || {} })
      }
    } catch {
      // silently fail enrichment
    }
    set({ enrichLoading: false })
  },

  fetchSecurityData: async () => {
    const { packages } = get()
    const pkgs = packages.filter((p) => !p.error)
    if (pkgs.length === 0) return
    set({ securityLoading: true })

    try {
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: pkgs.map((p) => ({ name: p.name, version: p.version })) }),
      })
      if (res.ok) {
        const data = await res.json()
        const secMap: Record<string, SecurityResult> = {}
        for (const r of data.results || []) {
          secMap[r.packageName] = r
        }
        set({ securityData: secMap })
      }
    } catch {
      // silently fail
    }
    set({ securityLoading: false })
  },
}))
