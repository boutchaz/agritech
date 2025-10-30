# Internationalization (i18n)

The AgriTech Platform supports multiple languages using react-i18next with full RTL (Right-to-Left) support for Arabic.

## Supported Languages

- **English (en)** - Default
- **French (fr)**
- **Arabic (ar)** - With RTL support

## Installation

```bash
npm install react-i18next i18next
```

## Configuration

### i18n Setup

```typescript
// src/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from './locales/en/common.json'
import frCommon from './locales/fr/common.json'
import arCommon from './locales/ar/common.json'

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: { common: enCommon },
      fr: { common: frCommon },
      ar: { common: arCommon },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

### Initialize in App

```typescript
// src/main.tsx
import './i18n' // Import before rendering app
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## Translation Files

Translation files are organized by language in `src/locales/{lang}/common.json`.

### English (en/common.json)

```json
{
  "app": {
    "name": "AgriTech",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "nav": {
    "dashboard": "Dashboard",
    "analyses": "Analyses",
    "soilAnalysis": "Soil Analysis",
    "parcels": "Parcels",
    "employees": "Employees",
    "tasks": "Tasks",
    "reports": "Reports",
    "settings": "Settings"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?"
  },
  "currency": {
    "EUR": "Euro (€)",
    "USD": "US Dollar ($)",
    "MAD": "Moroccan Dirham (DH)"
  }
}
```

### French (fr/common.json)

```json
{
  "app": {
    "name": "AgriTech",
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier"
  },
  "nav": {
    "dashboard": "Tableau de bord",
    "analyses": "Analyses",
    "soilAnalysis": "Analyse de Sol",
    "parcels": "Parcelles",
    "employees": "Employés",
    "tasks": "Tâches",
    "reports": "Rapports",
    "settings": "Paramètres"
  },
  "auth": {
    "login": "Connexion",
    "logout": "Déconnexion",
    "email": "Email",
    "password": "Mot de passe",
    "forgotPassword": "Mot de passe oublié ?"
  }
}
```

### Arabic (ar/common.json)

```json
{
  "app": {
    "name": "أجريتك",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجح",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل"
  },
  "nav": {
    "dashboard": "لوحة التحكم",
    "analyses": "التحليلات",
    "soilAnalysis": "تحليل التربة",
    "parcels": "القطع",
    "employees": "الموظفون",
    "tasks": "المهام",
    "reports": "التقارير",
    "settings": "الإعدادات"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "forgotPassword": "هل نسيت كلمة المرور؟"
  }
}
```

## Using Translations

### useTranslation Hook

```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('app.loading')}</p>
      <button>{t('app.save')}</button>
    </div>
  )
}
```

### With Interpolation

```json
{
  "greeting": "Hello, {{name}}!",
  "items": "You have {{count}} items"
}
```

```typescript
const { t } = useTranslation()

// Simple interpolation
<p>{t('greeting', { name: 'John' })}</p>
// Output: "Hello, John!"

// With count
<p>{t('items', { count: 5 })}</p>
// Output: "You have 5 items"
```

### Pluralization

```json
{
  "item": "item",
  "item_other": "items",
  "message": "You have {{count}} {{item}}"
}
```

```typescript
const { t } = useTranslation()

<p>{t('message', { count: 1 })}</p>
// Output: "You have 1 item"

<p>{t('message', { count: 5 })}</p>
// Output: "You have 5 items"
```

### Nested Keys

```json
{
  "user": {
    "profile": {
      "name": "Name",
      "email": "Email",
      "phone": "Phone"
    }
  }
}
```

```typescript
<label>{t('user.profile.name')}</label>
<label>{t('user.profile.email')}</label>
```

## Language Switcher

```typescript
// src/components/LanguageSwitcher.tsx
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)

    // Set document direction for RTL languages
    if (lng === 'ar') {
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ar'
    } else {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = lng
    }
  }

  // Set initial direction on mount
  useEffect(() => {
    const currentLang = i18n.language
    if (currentLang === 'ar') {
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ar'
    } else {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = currentLang
    }
  }, [i18n.language])

  return (
    <div className="relative group">
      <button
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="Change language"
      >
        <Languages className="h-5 w-5" />
        <span className="text-sm font-medium">
          {languages.find(lang => lang.code === i18n.language)?.nativeName || 'English'}
        </span>
      </button>

      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                i18n.language === lang.code
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguageSwitcher
```

## RTL (Right-to-Left) Support

### CSS for RTL

Add RTL-specific styles:

```css
/* src/index.css */
[dir="rtl"] {
  /* Reverse flex direction */
  .flex-row {
    flex-direction: row-reverse;
  }

  /* Reverse text alignment */
  .text-left {
    text-align: right;
  }

  .text-right {
    text-align: left;
  }

  /* Reverse padding/margin */
  .pl-4 {
    padding-left: 0;
    padding-right: 1rem;
  }

  .pr-4 {
    padding-right: 0;
    padding-left: 1rem;
  }
}
```

### Tailwind RTL Plugin

For better RTL support, use the Tailwind RTL plugin:

```bash
npm install tailwindcss-rtl
```

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('tailwindcss-rtl'),
  ],
}
```

**Usage:**

```typescript
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  {/* Margin-left in LTR, margin-right in RTL */}
</div>
```

## Programmatic Language Access

### Get Current Language

```typescript
const { i18n } = useTranslation()
const currentLanguage = i18n.language // 'en', 'fr', or 'ar'
```

### Change Language

```typescript
const { i18n } = useTranslation()

const switchToFrench = () => {
  i18n.changeLanguage('fr')
}
```

### Check if Translation Exists

```typescript
const { t, i18n } = useTranslation()

if (i18n.exists('some.key')) {
  // Translation exists
}
```

## Date & Number Formatting

### Date Formatting

```typescript
import { useTranslation } from 'react-i18next'

function DateDisplay({ date }: { date: Date }) {
  const { i18n } = useTranslation()

  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)

  return <span>{formattedDate}</span>
}
```

### Number Formatting

```typescript
function CurrencyDisplay({ amount }: { amount: number }) {
  const { i18n } = useTranslation()

  const formatted = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)

  return <span>{formatted}</span>
}
```

## Namespace Organization

For large apps, organize translations by namespace:

```typescript
// i18n.ts
i18n.init({
  ns: ['common', 'auth', 'dashboard', 'forms'],
  defaultNS: 'common',
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      dashboard: enDashboard,
      forms: enForms,
    },
  },
})
```

**Usage:**

```typescript
const { t } = useTranslation(['common', 'auth'])

<h1>{t('common:app.name')}</h1>
<button>{t('auth:login')}</button>
```

## Lazy Loading Translations

For better performance, lazy load translation files:

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })
```

## Best Practices

### 1. Consistent Key Naming

Use consistent, hierarchical key naming:

```json
{
  "module": {
    "feature": {
      "action": "Text"
    }
  }
}
```

Example:
```json
{
  "parcel": {
    "form": {
      "title": "Create Parcel",
      "submit": "Create",
      "cancel": "Cancel"
    },
    "list": {
      "empty": "No parcels found",
      "loading": "Loading parcels..."
    }
  }
}
```

### 2. Avoid Hardcoded Strings

```typescript
// Bad
<button>Create Parcel</button>

// Good
<button>{t('parcel.form.submit')}</button>
```

### 3. Use Default Values

Provide fallback text during development:

```typescript
<h1>{t('page.title', 'Default Title')}</h1>
```

### 4. Context for Ambiguous Terms

```json
{
  "status": {
    "active": "Active",
    "active_verb": "Activate"
  }
}
```

### 5. Keep Translations Synchronized

Ensure all language files have the same keys:

```bash
# Use a tool to check for missing keys
npm run i18n:check
```

### 6. Extract Long Text

For paragraphs, consider using HTML:

```json
{
  "welcome": {
    "message": "<p>Welcome to <strong>AgriTech</strong>!</p><p>Get started by creating your first parcel.</p>"
  }
}
```

```typescript
<div dangerouslySetInnerHTML={{ __html: t('welcome.message') }} />
```

### 7. Test RTL Layout

Always test Arabic layout for:
- Proper text alignment
- Reversed flex/grid layouts
- Icon positioning
- Form layouts

## Persistence

Language preference is automatically saved to localStorage by the LanguageDetector.

```typescript
// Manually save language preference
localStorage.setItem('i18nextLng', 'fr')

// Manually load language preference
const savedLanguage = localStorage.getItem('i18nextLng')
```

## Translation Management Tools

For collaborative translation management, consider:

- **Locize**: Cloud-based translation management
- **Crowdin**: Crowdsourced translations
- **POEditor**: Simple translation editor
- **i18next-parser**: Extract translation keys from code

## Summary

The AgriTech Platform's internationalization strategy provides:

- **Multi-language support**: English, French, and Arabic
- **RTL support**: Full right-to-left layout for Arabic
- **Type-safe translations**: TypeScript integration with i18next
- **Namespace organization**: Scalable translation file structure
- **Automatic persistence**: Language preference saved to localStorage
- **Dynamic switching**: Seamless language changes without page reload

By following these patterns and best practices, the application delivers a localized experience for users across different languages and regions.
