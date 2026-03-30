import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

const TEMPLATES_DIR = path.join(__dirname, '../src/modules/blogs/templates');

const expectedFiles = [
  'layouts/base.hbs',
  'partials/nav.hbs',
  'partials/footer.hbs',
  'partials/social-share.hbs',
  'partials/cta-newsletter.hbs',
  'partials/cta-demo.hbs',
  'partials/blog-card.hbs',
  'partials/json-ld.hbs',
  'blog-list.hbs',
  'blog-detail.hbs',
];

let allPassed = true;

for (const file of expectedFiles) {
  const fullPath = path.join(TEMPLATES_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ MISSING: ${file}`);
    allPassed = false;
    continue;
  }
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    Handlebars.precompile(content);
    console.log(`✅ ${file} — compiles OK`);
  } catch (e: any) {
    console.error(`❌ ${file} — compile error: ${e.message}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✅ All templates exist and compile successfully.');
  process.exit(0);
} else {
  console.error('\n❌ Some templates failed.');
  process.exit(1);
}
