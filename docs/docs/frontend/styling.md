# Styling

The AgriTech Platform uses Tailwind CSS as its primary styling solution, with custom components, dark mode support, and responsive design utilities.

## Tailwind CSS

Utility-first CSS framework that provides low-level utility classes for building custom designs.

### Installation

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Main green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### PostCSS Configuration

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Import in Application

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles */
@layer base {
  html {
    @apply antialiased;
  }

  body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white;
  }
}

/* Custom components */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500;
  }

  .card {
    @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6;
  }

  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500;
  }
}

/* Custom utilities */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## Common Utility Patterns

### Layout

```typescript
// Container
<div className="container mx-auto px-4">
  {/* Content */}
</div>

// Flexbox
<div className="flex items-center justify-between gap-4">
  {/* Items */}
</div>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>

// Centered content
<div className="min-h-screen flex items-center justify-center">
  {/* Centered content */}
</div>
```

### Spacing

```typescript
// Padding
<div className="p-4">        {/* All sides */}
<div className="px-6 py-4">  {/* X and Y */}
<div className="pt-8">       {/* Top only */}

// Margin
<div className="m-4">        {/* All sides */}
<div className="mx-auto">    {/* Horizontal centering */}
<div className="mt-6">       {/* Top only */}

// Gap (for flex/grid)
<div className="flex gap-4">
<div className="grid gap-6">
```

### Typography

```typescript
// Font size
<h1 className="text-4xl font-bold">
<p className="text-sm">
<span className="text-xs">

// Font weight
<span className="font-light">   {/* 300 */}
<span className="font-normal">  {/* 400 */}
<span className="font-medium">  {/* 500 */}
<span className="font-semibold"> {/* 600 */}
<span className="font-bold">    {/* 700 */}

// Text color
<p className="text-gray-900 dark:text-white">
<p className="text-green-600">
<p className="text-red-500">

// Text alignment
<p className="text-left">
<p className="text-center">
<p className="text-right">
```

### Colors

```typescript
// Background
<div className="bg-white dark:bg-gray-800">
<div className="bg-green-50 dark:bg-green-900/20">

// Text
<span className="text-gray-900 dark:text-white">
<span className="text-green-600 dark:text-green-400">

// Border
<div className="border border-gray-300 dark:border-gray-600">
<div className="border-2 border-green-500">
```

### Borders & Rounded Corners

```typescript
// Borders
<div className="border">                    {/* All sides */}
<div className="border-b">                  {/* Bottom only */}
<div className="border-2 border-green-500"> {/* Custom width and color */}

// Rounded corners
<div className="rounded">      {/* Small */}
<div className="rounded-md">   {/* Medium */}
<div className="rounded-lg">   {/* Large */}
<div className="rounded-xl">   {/* Extra large */}
<div className="rounded-full">  {/* Circle/pill */}
```

### Shadows

```typescript
<div className="shadow-sm">    {/* Small */}
<div className="shadow">       {/* Medium */}
<div className="shadow-lg">    {/* Large */}
<div className="shadow-xl">    {/* Extra large */}
```

## Dark Mode

The platform supports class-based dark mode switching.

### Implementation

```typescript
// Enable dark mode
document.documentElement.classList.add('dark')

// Disable dark mode
document.documentElement.classList.remove('dark')

// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

### Dark Mode Utilities

```typescript
// Background colors
<div className="bg-white dark:bg-gray-800">

// Text colors
<p className="text-gray-900 dark:text-white">
<p className="text-gray-600 dark:text-gray-400">

// Border colors
<div className="border-gray-300 dark:border-gray-600">

// Hover states
<button className="hover:bg-gray-50 dark:hover:bg-gray-700">
```

### Dark Mode Toggle Component

```typescript
import { Moon, Sun } from 'lucide-react'

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
```

## Responsive Design

Tailwind provides mobile-first responsive utilities.

### Breakpoints

```typescript
// sm: 640px and up
// md: 768px and up
// lg: 1024px and up
// xl: 1280px and up
// 2xl: 1536px and up
```

### Responsive Utilities

```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  {/* Increasing padding on larger screens */}
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {/* Larger text on bigger screens */}
</h1>

// Responsive display
<div className="hidden md:block">
  {/* Hidden on mobile, visible on tablet+ */}
</div>

<div className="block md:hidden">
  {/* Visible on mobile, hidden on tablet+ */}
</div>
```

## Custom Component Classes

### Card Component

```css
.card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6;
}

.card-header {
  @apply border-b border-gray-200 dark:border-gray-700 pb-4 mb-4;
}

.card-footer {
  @apply border-t border-gray-200 dark:border-gray-700 pt-4 mt-4;
}
```

**Usage:**

```typescript
<div className="card">
  <div className="card-header">
    <h2 className="text-xl font-semibold">Card Title</h2>
  </div>
  <div>
    <p>Card content</p>
  </div>
  <div className="card-footer">
    <button className="btn-primary">Action</button>
  </div>
</div>
```

### Button Variants

```css
.btn {
  @apply px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
}

.btn-primary {
  @apply btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500;
}

.btn-secondary {
  @apply btn bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500;
}

.btn-danger {
  @apply btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
}

.btn-outline {
  @apply btn border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 focus:ring-green-500;
}
```

### Form Input Classes

```css
.input-field {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md;
  @apply bg-white dark:bg-gray-700 text-gray-900 dark:text-white;
  @apply focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.input-error {
  @apply border-red-500 focus:ring-red-500;
}

.label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5;
}
```

## Utility Helpers

### cn() Helper Function

Combine Tailwind classes with conditional logic:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Usage:**

```typescript
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  className // Accept additional classes as prop
)}>
```

## Animation & Transitions

### Built-in Animations

```typescript
// Spin
<div className="animate-spin">
  <LoadingIcon />
</div>

// Pulse
<div className="animate-pulse">
  <Skeleton />
</div>

// Bounce
<div className="animate-bounce">
  <UpArrow />
</div>
```

### Transitions

```typescript
// Transition all properties
<div className="transition-all duration-300">

// Transition specific properties
<div className="transition-colors duration-200">
<div className="transition-transform duration-300">

// Easing
<div className="transition ease-in-out">
<div className="transition ease-out">

// Transform
<button className="hover:scale-105 transition-transform">
<div className="hover:-translate-y-1 transition-transform">
```

### Custom Animations

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
}
```

## Icons

The platform uses **Lucide React** for icons.

```typescript
import { Home, User, Settings, ChevronRight } from 'lucide-react'

function Navigation() {
  return (
    <nav>
      <button className="flex items-center gap-2">
        <Home className="h-5 w-5" />
        <span>Home</span>
      </button>
      <button className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <span>Profile</span>
      </button>
      <button className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <span>Settings</span>
        <ChevronRight className="h-4 w-4 ml-auto" />
      </button>
    </nav>
  )
}
```

## Best Practices

### 1. Use Semantic Classes

```typescript
// Good: Semantic and reusable
<div className="card">
  <h2 className="card-header">Title</h2>
</div>

// Avoid: Overly specific utility combinations
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
  <h2 className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">Title</h2>
</div>
```

### 2. Extract Common Patterns

If you use the same utility combination more than 3 times, extract it:

```css
/* Extract to component class */
@layer components {
  .status-badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }

  .status-badge-success {
    @apply status-badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400;
  }

  .status-badge-warning {
    @apply status-badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400;
  }
}
```

### 3. Mobile-First Approach

Start with mobile styles, then add larger breakpoints:

```typescript
// Good: Mobile first
<div className="text-sm md:text-base lg:text-lg">

// Avoid: Desktop first
<div className="text-lg md:text-base sm:text-sm">
```

### 4. Consistent Spacing Scale

Use Tailwind's default spacing scale (4px increments):

```typescript
// Good: Using spacing scale
<div className="p-4">  {/* 16px */}
<div className="mt-6"> {/* 24px */}
<div className="gap-8"> {/* 32px */}

// Avoid: Arbitrary values
<div className="p-[17px]">
<div className="mt-[23px]">
```

### 5. Dark Mode Considerations

Always provide dark mode variants for custom colors:

```typescript
// Good: Dark mode considered
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// Missing dark mode
<div className="bg-white text-gray-900">
```

## Accessibility

### Focus States

```typescript
<button className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
  Button
</button>
```

### Screen Reader Only Content

```typescript
<span className="sr-only">Screen reader only text</span>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible with visible focus states.

## Performance Tips

1. **Purge unused styles**: Tailwind automatically purges unused classes in production
2. **Use @apply sparingly**: Prefer utility classes directly in markup
3. **Avoid dynamic class names**: Use full class names, not string concatenation
4. **JIT mode**: Tailwind uses Just-In-Time mode for faster builds

## Summary

The AgriTech Platform's styling strategy leverages Tailwind CSS for:

- **Utility-first approach**: Fast development with consistent spacing/colors
- **Dark mode support**: Seamless light/dark theme switching
- **Responsive design**: Mobile-first responsive utilities
- **Custom components**: Reusable component classes via @layer
- **Performance**: Automatic purging and JIT compilation

By following Tailwind conventions and best practices, the codebase maintains consistent, maintainable, and performant styling throughout the application.
