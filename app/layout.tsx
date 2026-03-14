import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import ThemeProvider from "@/components/ThemeProvider"

export const metadata: Metadata = {
  title: "BundleViz \u2014 npm Bundle Size Visualizer",
  description:
    "Paste your package.json and visualize your npm dependencies as an interactive treemap. See what's really bloating your bundle. Free, instant, no signup.",
  keywords: ["bundle size", "npm", "webpack", "package.json", "treemap", "performance"],
  openGraph: {
    title: "BundleViz \u2014 npm Bundle Size Visualizer",
    description: "Paste your package.json and get an interactive treemap of your dependencies sized by real gzip weight.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BundleViz \u2014 npm Bundle Size Visualizer",
    description: "Paste your package.json and get an interactive treemap of your dependencies sized by real gzip weight.",
  },
  icons: {
    icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
