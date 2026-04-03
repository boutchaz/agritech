import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

export type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  invalid?: boolean
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, invalid, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200',
        'dark:bg-gray-700',
        invalid && 'bg-red-100 dark:bg-red-900/30',
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          'absolute h-full bg-primary-500',
          'dark:bg-primary-400',
          invalid && 'bg-red-500 dark:bg-red-400',
        )}
      />
    </SliderPrimitive.Track>
    {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        className={cn(
          'block h-5 w-5 rounded-full border-2 border-primary-500 bg-white shadow-sm',
          'transition-[color,box-shadow,border-color] duration-150 ease-out',
          'hover:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          'dark:border-primary-400 dark:bg-gray-900 dark:focus-visible:ring-offset-gray-950',
          'disabled:pointer-events-none',
          invalid && 'border-red-500 focus-visible:ring-red-500/30 dark:border-red-400',
        )}
        aria-invalid={invalid || undefined}
      />
    ))}
  </SliderPrimitive.Root>
))

Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

export default Slider
