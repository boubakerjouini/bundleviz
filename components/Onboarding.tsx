"use client"

import { useState, useEffect } from "react"

const steps = [
  { target: "textarea", text: "Paste your package.json here", position: "bottom" as const },
  { target: "button[type='analyze']", text: "Click to analyze your bundle", position: "top" as const },
]

export default function Onboarding() {
  const [step, setStep] = useState(-1)

  useEffect(() => {
    if (typeof window === "undefined") return
    const onboarded = localStorage.getItem("bundleviz_onboarded")
    if (!onboarded) setStep(0)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("bundleviz_onboarded", "true")
    setStep(-1)
  }

  const handleNext = () => {
    if (step >= steps.length - 1) {
      handleDismiss()
    } else {
      setStep(step + 1)
    }
  }

  if (step < 0) return null

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 z-[400]" onClick={handleDismiss}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2"
        style={{ top: currentStep.position === "bottom" ? "35%" : "55%" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="rounded-lg border border-accent bg-surface p-6 shadow-2xl max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-background text-xs font-bold">{step + 1}</span>
            <span className="text-xs text-muted">Step {step + 1} of {steps.length}</span>
          </div>
          <p className="text-sm text-foreground mb-4">{currentStep.text}</p>
          <div className="flex gap-2">
            <button onClick={handleNext}
              className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-background">
              {step >= steps.length - 1 ? "Got it!" : "Next"}
            </button>
            <button onClick={handleDismiss}
              className="rounded border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
