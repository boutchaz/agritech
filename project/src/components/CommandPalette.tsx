import React from 'react'
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
} from 'kbar'
import type { Action } from 'kbar'

interface CommandPaletteProps {
  actions: Action[]
  children: React.ReactNode
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ actions, children }) => {
  return (
    <KBarProvider actions={actions} options={{ enableHistory: true }}>
      <CommandPaletteUI />
      {children}
    </KBarProvider>
  )
}

const CommandPaletteUI: React.FC = () => {
  const { results } = useMatches()

  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24">
        <KBarAnimator className="w-full max-w-xl overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-white dark:ring-white/10">
          <KBarSearch
            autoFocus
            className="w-full border-0 bg-transparent px-5 py-4 text-base font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-white dark:placeholder:text-gray-400"
            placeholder="Recherchez une action ou une page..."
          />
          <div className="border-t border-gray-100 dark:border-gray-700">
            <KBarResults
              items={results}
              onRender={({ item, active }) =>
                typeof item === 'string' ? (
                  <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {item}
                  </div>
                ) : (
                  <div
                    className={`flex cursor-pointer items-center justify-between gap-4 px-5 py-3 text-sm transition-colors ${
                      active
                        ? 'bg-green-50 text-green-700 shadow-inner dark:bg-green-900/40 dark:text-green-200'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div>
                      )}
                    </div>
                    {item.shortcut?.length ? (
                      <div className="flex gap-1">
                        {item.shortcut.map((shortcut) => (
                          <kbd
                            key={shortcut}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {shortcut.toUpperCase()}
                          </kbd>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              }
            />
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  )
}

