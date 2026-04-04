import { useState, useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'
/** Must match SettingsLayout SETTINGS_COLLAPSED_KEY */
const SETTINGS_SIDEBAR_COLLAPSED_KEY = 'settingsSidebarCollapsed'

/** Collapsed main sidebar width (matches Tailwind w-20) */
const COLLAPSED_MAIN_RAIL_PX = 80
/** When /settings + both rails collapsed, use w-16 each to save horizontal space */
const COLLAPSED_MAIN_RAIL_COMPACT_PX = 64

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
 * Settings secondary sidebar collapsed state (synced with SettingsLayout + localStorage).
 */
export function useSettingsSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SETTINGS_SIDEBAR_COLLAPSED_KEY) === 'true'
  })

  useEffect(() => {
    const handler = (e: CustomEvent<{ collapsed: boolean }>) => {
      setCollapsed(e.detail.collapsed)
    }
    window.addEventListener(
      'settingsSidebarCollapse',
      handler as EventListener,
    )
    return () =>
      window.removeEventListener(
        'settingsSidebarCollapse',
        handler as EventListener,
      )
  }, [])

  return collapsed
}

/**
 * Hook that combines desktop detection and sidebar state to return the sidebar margin
 * @param isRTL - Whether the layout is right-to-left
 * @returns Object with marginLeft and marginRight values for the main content
 */
export function useSidebarMargin(isRTL = false) {
  const isDesktop = useIsDesktop()
  const isSidebarCollapsed = useSidebarCollapsed()
  const settingsSidebarCollapsed = useSettingsSidebarCollapsed()
  const pathname = useLocation({ select: (l) => l.pathname })

  const onSettingsRoute = pathname.startsWith('/settings')
  const bothRailsCollapsed =
    isDesktop &&
    onSettingsRoute &&
    isSidebarCollapsed &&
    settingsSidebarCollapsed

  const sidebarWidth = !isDesktop
    ? 0
    : !isSidebarCollapsed
      ? 256
      : bothRailsCollapsed
        ? COLLAPSED_MAIN_RAIL_COMPACT_PX
        : COLLAPSED_MAIN_RAIL_PX

  return {
    marginLeft: isRTL ? 0 : sidebarWidth,
    marginRight: isRTL ? sidebarWidth : 0,
    style: {
      marginLeft: isRTL ? 0 : `${sidebarWidth}px`,
      marginRight: isRTL ? `${sidebarWidth}px` : 0,
    },
    isDesktop,
    isSidebarCollapsed,
    settingsSidebarCollapsed,
    bothRailsCollapsed,
    sidebarWidth,
  }
}
