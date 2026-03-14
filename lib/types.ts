export interface BundleResult {
  name: string
  version: string
  size: number
  gzip: number
  dependencyCount: number
  dependencies: Record<string, string>
  description: string
  repository?: string
  error?: string
  type?: "dep" | "dev"
}

export interface PackageInput {
  name: string
  version: string
  type: "dep" | "dev"
}

export interface EnrichedData {
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

export interface SecurityVuln {
  id: string
  summary: string
  severity?: string
}

export interface SecurityResult {
  packageName: string
  version: string
  vulns: SecurityVuln[]
}

export type ColorMode = "size" | "age" | "license" | "risk"
export type ViewMode = "treemap" | "sunburst" | "list"
