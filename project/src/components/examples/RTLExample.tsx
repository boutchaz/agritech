/**
 * RTL Example Component
 *
 * This component demonstrates proper RTL spacing and layout patterns.
 * Use this as a reference when building RTL-aware components.
 */

import React from 'react';
import { ChevronRight, User, Mail, Phone } from 'lucide-react';

const RTLExample: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Example 1: Card with Icon */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-start">Example 1: Card with Icon</h3>

        {/* Using gap for spacing (preferred) */}
        <div className="flex items-center gap-3 mb-3">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span>User profile with gap spacing</span>
        </div>

        {/* Using logical margin properties */}
        <div className="flex items-center mb-3">
          <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400 me-3" />
          <span>Email with margin-end</span>
        </div>
      </div>

      {/* Example 2: Navigation with Icons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-start">Example 2: Navigation</h3>

        <nav className="space-y-2">
          <a href="#" className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span className="text-start">Dashboard</span>
            {/* Icon that flips in RTL */}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </a>
          <a href="#" className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span className="text-start">Settings</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </a>
        </nav>
      </div>

      {/* Example 3: Form Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-start">Example 3: Form with RTL Support</h3>

        <form className="space-y-4">
          <div>
            <label className="block mb-2 text-start">Name</label>
            <input
              type="text"
              className="w-full ps-3 pe-3 py-2 border rounded text-start"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block mb-2 text-start">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="flex-1 ps-3 pe-3 py-2 border rounded text-start"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-start">Phone</label>
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 me-2" />
              <input
                type="tel"
                className="flex-1 ps-3 pe-3 py-2 border rounded text-start"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              className="ps-4 pe-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ps-4 pe-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* Example 4: Grid Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-start">Example 4: Grid with Cards</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">{i}</span>
                </div>
                <h4 className="font-semibold text-start">Card {i}</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-start">
                This is a sample card demonstrating RTL-aware grid layout with proper spacing.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Example 5: Sidebar Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4 text-start">Example 5: Sidebar Layout</h3>

        <div className="flex gap-4">
          {/* Sidebar */}
          <aside className="w-48 border-e pe-4">
            <h4 className="font-semibold mb-3 text-start">Menu</h4>
            <nav className="space-y-2">
              {['Option 1', 'Option 2', 'Option 3'].map((option) => (
                <a
                  key={option}
                  href="#"
                  className="block ps-2 pe-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-start"
                >
                  {option}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 ps-4">
            <h4 className="font-semibold mb-3 text-start">Content Area</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-start">
              The sidebar uses <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">border-e</code> and{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pe-4</code> which automatically
              position correctly in RTL mode.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RTLExample;
