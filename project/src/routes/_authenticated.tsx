import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import FarmSwitcher from '../components/FarmSwitcher'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Check authentication before loading protected routes
    const { user } = await context.auth
    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, signOut } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeModule, setActiveModule] = useState('dashboard')

  // Mock modules data - this should come from your state management
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: 'Home', active: true, category: 'general' },
    { id: 'fruit-trees', name: 'Arbres Fruitiers', icon: 'Tree', active: true, category: 'agriculture' },
    { id: 'legumes', name: 'Légumes', icon: 'Sprout', active: true, category: 'agriculture' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        modules={modules}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={() => setIsDarkMode(!isDarkMode)}
      />
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <OrganizationSwitcher />
              <FarmSwitcher />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}