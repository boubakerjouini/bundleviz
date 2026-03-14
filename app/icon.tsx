import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0a0a0a",
          borderRadius: 6,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: 4,
          alignItems: "flex-end",
        }}
      >
        {/* Treemap-style blocks — different sizes like a real bundle viz */}
        <div style={{ display: "flex", width: "100%", height: "100%", flexWrap: "wrap", gap: 2 }}>
          {/* Big block top-left (large package) */}
          <div style={{ width: 13, height: 13, background: "#ef4444", borderRadius: 2 }} />
          {/* Medium top-right */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <div style={{ height: 7, background: "#f97316", borderRadius: 2 }} />
            <div style={{ height: 4, background: "#f59e0b", borderRadius: 2 }} />
          </div>
          {/* Bottom row */}
          <div style={{ display: "flex", width: "100%", gap: 2 }}>
            <div style={{ flex: 2, height: 7, background: "#22c55e", borderRadius: 2 }} />
            <div style={{ flex: 1, height: 7, background: "#22c55e", borderRadius: 2, opacity: 0.6 }} />
            <div style={{ flex: 1, height: 7, background: "#f59e0b", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
