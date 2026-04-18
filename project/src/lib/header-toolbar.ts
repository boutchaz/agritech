/**
 * Shared visual chrome for the top header control cluster (farm, org, language, notifications).
 * Keeps height, border, and shadow consistent.
 */
const headerToolbarChrome =
  'rounded-lg border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'

/** Farm / org / language (with label) — fixed 40px height, single-line content */
export const headerToolbarTextTriggerClass = `inline-flex h-10 min-h-10 min-w-0 max-w-[min(280px,calc(100vw-10rem))] shrink-0 items-center gap-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 ${headerToolbarChrome}`

/** Language compact + notification bell — 40×40 */
export const headerToolbarIconTriggerClass = `inline-flex h-10 w-10 shrink-0 items-center justify-center text-gray-700 dark:text-gray-200 ${headerToolbarChrome}`

/** Org switcher compact (icon + chevron) */
export const headerToolbarTightTriggerClass = `inline-flex h-10 shrink-0 items-center justify-center gap-1 px-2.5 text-gray-700 dark:text-gray-200 ${headerToolbarChrome}`
