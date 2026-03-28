import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: { label: string; description?: string }[]
  currentStep: number
  className?: string
  orientation?: "horizontal" | "vertical"
}

function Stepper({ steps, currentStep, className, orientation = "horizontal" }: StepperProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn(
        orientation === "horizontal"
          ? "flex items-center justify-between"
          : "flex flex-col gap-0",
        className
      )}
    >
      {steps.map((step, index) => {
        const status =
          index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming"

        return (
          <React.Fragment key={step.label}>
            <div
              className={cn(
                "flex items-center gap-3",
                orientation === "vertical" && "relative pb-8 last:pb-0"
              )}
            >
              {/* Vertical connector line */}
              {orientation === "vertical" && index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-16px)] w-0.5",
                    index < currentStep
                      ? "bg-primary"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}

              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  status === "complete" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "current" &&
                    "border-primary bg-white text-primary dark:bg-gray-900",
                  status === "upcoming" &&
                    "border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400"
                )}
              >
                {status === "complete" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Labels */}
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    status === "complete" && "text-primary",
                    status === "current" && "text-gray-900 dark:text-white",
                    status === "upcoming" && "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Horizontal connector */}
            {orientation === "horizontal" && index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1",
                  index < currentStep
                    ? "bg-primary"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export { Stepper }
export type { StepperProps }
