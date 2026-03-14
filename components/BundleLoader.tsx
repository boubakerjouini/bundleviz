"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const THINKING_STEPS = [
  { text: "Parsing your package.json...", icon: "📦" },
  { text: "Resolving dependency versions...", icon: "🔍" },
  { text: "Contacting Bundlephobia API...", icon: "🌐" },
  { text: "Fetching gzip sizes in parallel...", icon: "⚡" },
  { text: "Scanning for security vulnerabilities...", icon: "🔒" },
  { text: "Checking for outdated packages...", icon: "📅" },
  { text: "Analyzing license compatibility...", icon: "⚖️" },
  { text: "Computing treemap layout...", icon: "🗺️" },
  { text: "Identifying bundle bloat...", icon: "🎯" },
  { text: "Finding alternative packages...", icon: "💡" },
  { text: "Calculating load times...", icon: "⏱️" },
  { text: "Almost there...", icon: "✨" },
]

const WORDS = [
  "react", "next", "webpack", "lodash", "moment", "axios",
  "typescript", "tailwind", "zustand", "framer", "prisma", "zod",
  "express", "fastify", "vite", "rollup", "esbuild", "babel",
]

export default function BundleLoader({ packageCount = 0 }: { packageCount?: number }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [dots, setDots] = useState("")
  const [floatingWords, setFloatingWords] = useState<{ id: number; word: string; x: number; y: number; delay: number }[]>([])
  const [progress, setProgress] = useState(0)

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i < THINKING_STEPS.length - 1 ? i + 1 : i))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 4, 92))
    }, 300)
    return () => clearInterval(interval)
  }, [])

  // Floating package name words
  useEffect(() => {
    let id = 0
    const spawn = () => {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)]
      setFloatingWords((prev) => [
        ...prev.slice(-12),
        {
          id: id++,
          word,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          delay: 0,
        },
      ])
    }
    spawn()
    const interval = setInterval(spawn, 600)
    return () => clearInterval(interval)
  }, [])

  const step = THINKING_STEPS[stepIndex]

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background">
      {/* Floating package names (background) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatePresence>
          {floatingWords.map((fw) => (
            <motion.span
              key={fw.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.08, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.4 }}
              className="absolute font-mono text-sm text-accent"
              style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
            >
              {fw.word}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">

        {/* Pulsing icon */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-4xl"
        >
          {step.icon}
        </motion.div>

        {/* Step text */}
        <div className="h-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-medium text-foreground"
            >
              {step.text}<span className="text-accent">{dots}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Package count */}
        {packageCount > 0 && (
          <p className="text-sm text-muted">
            Analyzing <span className="text-accent font-mono">{packageCount}</span> packages
          </p>
        )}

        {/* Progress bar */}
        <div className="w-80 overflow-hidden rounded-full bg-surface border border-border h-1.5">
          <motion.div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5">
          {THINKING_STEPS.slice(0, 8).map((_, i) => (
            <motion.div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= stepIndex ? "bg-accent" : "bg-border"
              }`}
              style={{ width: i <= stepIndex ? 16 : 8 }}
            />
          ))}
        </div>

        {/* Fun fact */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="max-w-xs text-xs text-muted"
        >
          💡 The average Next.js app ships <span className="text-foreground">~300kb gzip</span> of JavaScript.
          Yours might be different.
        </motion.p>
      </div>
    </div>
  )
}
