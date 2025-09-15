import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AgroSmart Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          TanStack Router is working! 🎉
        </p>
        <div className="space-x-4">
          <a 
            href="/dashboard" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </a>
          <a 
            href="/settings" 
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go to Settings
          </a>
        </div>
      </div>
    </div>
  ),
})