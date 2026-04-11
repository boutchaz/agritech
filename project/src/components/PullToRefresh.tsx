import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useIsMdUp } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Loader2, ArrowDown } from 'lucide-react'

const THRESHOLD = 80 // px to pull before triggering refresh
const MAX_PULL = 120 // max visual pull distance
const RESISTANCE = 0.4 // dampen pull distance

type PullState = 'idle' | 'pulling' | 'threshold' | 'refreshing'

export function PullToRefresh({ children }: { children: ReactNode }) {
  const isDesktop = useIsMdUp()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const [pullState, setPullState] = useState<PullState>('idle')
  const [pullDistance, setPullDistance] = useState(0)

  const getScrollParent = useCallback(() => {
    return containerRef.current?.closest('[data-main-scroll]') as HTMLElement | null
  }, [])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isDesktop) return
      const scrollParent = getScrollParent()
      if (!scrollParent || scrollParent.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
      pullDistanceRef.current = 0
    },
    [isDesktop, getScrollParent],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDesktop || pullState === 'refreshing') return
      const scrollParent = getScrollParent()
      if (!scrollParent || scrollParent.scrollTop > 0) {
        // Reset if user scrolled down
        if (pullState !== 'idle') {
          setPullState('idle')
          setPullDistance(0)
          pullDistanceRef.current = 0
        }
        return
      }

      const currentY = e.touches[0].clientY
      const rawDistance = currentY - startYRef.current
      if (rawDistance <= 0) return

      // Prevent native scroll while pulling
      e.preventDefault()

      const distance = Math.min(rawDistance * RESISTANCE, MAX_PULL)
      pullDistanceRef.current = distance
      setPullDistance(distance)
      setPullState(distance >= THRESHOLD * RESISTANCE ? 'threshold' : 'pulling')
    },
    [isDesktop, pullState, getScrollParent],
  )

  const handleTouchEnd = useCallback(async () => {
    if (isDesktop || pullState === 'refreshing') return

    if (pullState === 'threshold') {
      setPullState('refreshing')
      setPullDistance(THRESHOLD * RESISTANCE)
      try {
        await queryClient.invalidateQueries()
      } finally {
        setPullState('idle')
        setPullDistance(0)
      }
    } else {
      setPullState('idle')
      setPullDistance(0)
    }
    pullDistanceRef.current = 0
  }, [isDesktop, pullState, queryClient])

  useEffect(() => {
    const scrollParent = getScrollParent()
    if (!scrollParent || isDesktop) return

    scrollParent.addEventListener('touchstart', handleTouchStart, { passive: true })
    scrollParent.addEventListener('touchmove', handleTouchMove, { passive: false })
    scrollParent.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      scrollParent.removeEventListener('touchstart', handleTouchStart)
      scrollParent.removeEventListener('touchmove', handleTouchMove)
      scrollParent.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDesktop, getScrollParent, handleTouchStart, handleTouchMove, handleTouchEnd])

  if (isDesktop) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-center transition-opacity',
          pullState === 'idle' ? 'opacity-0' : 'opacity-100',
        )}
        style={{ height: `${pullDistance}px` }}
      >
        {pullState === 'refreshing' ? (
          <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
        ) : (
          <ArrowDown
            className={cn(
              'h-6 w-6 text-slate-500 dark:text-slate-400 transition-transform duration-200',
              pullState === 'threshold' && 'rotate-180 text-green-600 dark:text-green-400',
            )}
          />
        )}
      </div>
      {/* Content pushed down during pull */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullState === 'idle' ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
