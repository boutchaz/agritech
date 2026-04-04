import { useState, useEffect } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

/**
 * Hook to detect when the fixed sidebar is visible (md breakpoint = 768px).
 * Below that, main is full width and the bottom nav is used.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

/**
 * Hook to track sidebar collapsed state
 */
export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  })

  useEffect(() => {
    const handleSidebarCollapse = (e: CustomEvent<{ collapsed: boolean }>) => {
      setIsCollapsed(e.detail.collapsed)
    }
    window.addEventListener('sidebarCollapse', handleSidebarCollapse as EventListener)
    return () => window.removeEventListener('sidebarCollapse', handleSidebarCollapse as EventListener)
  }, [])

  return isCollapsed
}

/**
 * Hook that combines desktop detection and sidebar state to return the sidebar margin
 * @param isRTL - Whether the layout is right-to-left
 * @returns Object with marginLeft and marginRight values for the main content
 */
export function useSidebarMargin(isRTL = false) {
  const isDesktop = useIsDesktop()
  const isSidebarCollapsed = useSidebarCollapsed()

  // Calculate sidebar margin for desktop (80px collapsed = w-20, matches settings rail)
  const sidebarWidth = isDesktop ? (isSidebarCollapsed ? 80 : 256) : 0

  return {
    marginLeft: isRTL ? 0 : sidebarWidth,
    marginRight: isRTL ? sidebarWidth : 0,
    style: {
      marginLeft: isRTL ? 0 : `${sidebarWidth}px`,
      marginRight: isRTL ? `${sidebarWidth}px` : 0,
    },
    isDesktop,
    isSidebarCollapsed,
    sidebarWidth,
  }
}
