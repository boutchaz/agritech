import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusDotVariants = cva(
  "inline-block rounded-full flex-shrink-0",
  {
    variants: {
      size: {
        sm: "h-2 w-2",
        md: "h-3 w-3",
        lg: "h-4 w-4",
      },
      color: {
        gray: "bg-gray-400 dark:bg-gray-500",
        green: "bg-green-500 dark:bg-green-400",
        red: "bg-red-500 dark:bg-red-400",
        yellow: "bg-yellow-500 dark:bg-yellow-400",
        amber: "bg-amber-500 dark:bg-amber-400",
        blue: "bg-blue-500 dark:bg-blue-400",
        orange: "bg-orange-500 dark:bg-orange-400",
        primary: "bg-primary dark:bg-primary",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      color: "gray",
      pulse: false,
    },
  }
)

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusDotVariants> {}

function StatusDot({ className, size, color, pulse, ...props }: StatusDotProps) {
  return (
    <div
      className={cn(statusDotVariants({ size, color, pulse }), className)}
      {...props}
    />
  )
}

export { StatusDot, statusDotVariants }
