#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Routes to update (excluding already updated ones and special routes)
const routesToUpdate = [
  'harvests.tsx',
  'reception-batches.tsx',
  'dashboard.tsx',
  'farm-hierarchy.tsx',
  'workers.tsx',
  'employees.tsx',
  'day-laborers.tsx',
  'tasks.tsx',
  'infrastructure.tsx',
  'accounting-invoices.tsx',
  'accounting-customers.tsx',
  'accounting-payments.tsx',
  'accounting-journal.tsx',
  'accounting-reports.tsx',
  'billing-sales-orders.tsx',
  'reports.tsx',
  'quality-control.tsx',
  'parcels.tsx',
  'analyses.tsx',
  'lab-services.tsx',
  'utilities.tsx',
];

const routesDir = path.join(__dirname, '../src/routes');

function updateRoute(filename) {
  const filepath = path.join(routesDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${filename} - file not found`);
    return;
  }

  let content = fs.readFileSync(filepath, 'utf8');

  // Check if already updated
  if (content.includes('MobileNavBar')) {
    console.log(`Skipping ${filename} - already has MobileNavBar`);
    return;
  }

  // Check if it has Sidebar import
  if (!content.includes("import Sidebar from")) {
    console.log(`Skipping ${filename} - doesn't use Sidebar`);
    return;
  }

  // Add MobileNavBar import after ModernPageHeader import
  if (content.includes("import ModernPageHeader from '../components/ModernPageHeader'")) {
    content = content.replace(
      "import ModernPageHeader from '../components/ModernPageHeader';",
      "import ModernPageHeader from '../components/ModernPageHeader';\nimport { MobileNavBar } from '../components/MobileNavBar';"
    );
  } else if (content.includes('import Sidebar from')) {
    // Add after Sidebar import if ModernPageHeader is not there
    content = content.replace(
      "import Sidebar from '../components/Sidebar';",
      "import Sidebar from '../components/Sidebar';\nimport { MobileNavBar } from '../components/MobileNavBar';"
    );
  }

  // Wrap Sidebar in hidden md:block div
  content = content.replace(
    /(\s+)<Sidebar\n/g,
    '$1{/* Hide sidebar on mobile */}\n$1<div className="hidden md:block">\n$1  <Sidebar\n'
  );

  // Close the Sidebar wrapper div
  content = content.replace(
    /(\s+)\/>\n(\s+)<main/g,
    '$1/>\n$1</div>\n$2<main'
  );

  // Wrap ModernPageHeader in hidden md:block div and add MobileNavBar before it
  const modernPageHeaderRegex = /(\s+)<main[^>]*>\n(\s+)<ModernPageHeader/;
  if (modernPageHeaderRegex.test(content)) {
    content = content.replace(
      modernPageHeaderRegex,
      (match, indent1, indent2) => {
        return `${indent1}<main className="flex-1 bg-gray-50 dark:bg-gray-900">\n${indent2}{/* Mobile Navigation Bar */}\n${indent2}<MobileNavBar title={t('REPLACE_ME_TITLE')} />\n\n${indent2}{/* Desktop Header */}\n${indent2}<div className="hidden md:block">\n${indent2}  <ModernPageHeader`;
      }
    );

    // Close ModernPageHeader wrapper
    content = content.replace(
      /(\s+)\/>\n\n(\s+)<div className="p-6/g,
      '$1/>\n$1</div>\n\n$2<div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6'
    );
  }

  // Update responsive padding for main content div
  content = content.replace(
    /<div className="p-6([^"]*)">/g,
    '<div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6$1">'
  );

  fs.writeFileSync(filepath, content);
  console.log(`✓ Updated ${filename}`);
}

console.log('Starting mobile navigation updates...\n');

routesToUpdate.forEach(updateRoute);

console.log('\n✨ Done! Please review the changes and fix REPLACE_ME_TITLE placeholders.');
console.log('Note: You may need to manually adjust some files based on their specific structure.');
