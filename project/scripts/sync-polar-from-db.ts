import { Polar } from '@polar-sh/sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const envFlagIndex = args.indexOf('--env');
const envPath = envFlagIndex >= 0
  ? path.resolve(process.cwd(), args[envFlagIndex + 1])
  : path.resolve(__dirname, '../.env');
const serverFlagIndex = args.indexOf('--server');
const dryRun = args.includes('--dry-run');

dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLAR_ACCESS_TOKEN = process.env.VITE_POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.VITE_POLAR_ORGANIZATION_ID;
const POLAR_SERVER = serverFlagIndex >= 0
  ? args[serverFlagIndex + 1]
  : process.env.VITE_POLAR_SERVER;
const POLAR_PRICE_CURRENCY = (process.env.VITE_POLAR_PRICE_CURRENCY || 'usd').toLowerCase();
const CORE_PRODUCT_NAME = process.env.POLAR_CORE_PRODUCT_NAME || 'Core Plan';
const CORE_PRODUCT_DESCRIPTION =
  process.env.POLAR_CORE_PRODUCT_DESCRIPTION ||
  'Core farm management bundle (dashboard, farms, harvests, analyses).';
const CORE_MODULE_FALLBACK = process.env.POLAR_CORE_MODULE_SLUGS || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required Supabase env:');
  console.error('   - SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
  console.error('❌ Missing required Polar env:');
  console.error('   - VITE_POLAR_ACCESS_TOKEN');
  console.error('   - VITE_POLAR_ORGANIZATION_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const polar = new Polar({
  accessToken: POLAR_ACCESS_TOKEN,
  server: POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
});

type ModuleRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  price_monthly: number | null;
  is_addon_eligible: boolean | null;
  is_required: boolean | null;
  is_available: boolean | null;
  required_plan: string | null;
  category: string | null;
};

type PricingRow = { config_key: string; value: number };

function slugifyKey(input: string) {
  return input.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

function updateEnvFile(filePath: string, updates: Record<string, string>) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const lines = existing.split(/\r?\n/);
  const keys = new Set(Object.keys(updates));
  const nextLines = lines.map((line) => {
    const [key] = line.split('=');
    if (keys.has(key)) {
      keys.delete(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  keys.forEach((key) => {
    nextLines.push(`${key}=${updates[key]}`);
  });

  const output = nextLines.filter((line, index, arr) => line !== '' || index < arr.length - 1).join('\n');
  fs.writeFileSync(filePath, `${output}\n`);
}

async function loadModules(): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('id, slug, name, description, price_monthly, is_addon_eligible, is_required, is_available, required_plan, category')
    .eq('is_available', true);

  if (error) {
    throw new Error(`Failed to fetch modules: ${error.message}`);
  }

  return data || [];
}

async function loadPricing(): Promise<PricingRow[]> {
  const { data, error } = await supabase
    .from('subscription_pricing')
    .select('config_key, value')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch pricing config: ${error.message}`);
  }

  return data || [];
}

function resolveCoreModules(modules: ModuleRow[]): string[] {
  const required = modules.filter((module) => module.is_required).map((module) => module.slug || module.name);
  if (required.length > 0) {
    return required;
  }

  if (CORE_MODULE_FALLBACK) {
    return CORE_MODULE_FALLBACK.split(',').map((item) => item.trim()).filter(Boolean);
  }

  throw new Error('No core modules defined. Set modules.is_required=true or POLAR_CORE_MODULE_SLUGS.');
}

async function createOrUpdateProducts() {
  console.log('🚀 Syncing Polar products from DB...\n');
  console.log(`Organization ID: ${POLAR_ORGANIZATION_ID}`);
  console.log(`Server: ${POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production'}`);
  console.log(`Env: ${envPath}\n`);

  const [modules, pricing] = await Promise.all([loadModules(), loadPricing()]);
  const pricingMap = pricing.reduce<Record<string, number>>((acc, item) => {
    acc[item.config_key] = Number(item.value);
    return acc;
  }, {});

  const basePriceMonthly = pricingMap.base_price_monthly ?? 15;
  const coreModuleSlugs = resolveCoreModules(modules);
  const addonModules = modules.filter((module) => module.is_addon_eligible);

  console.log(`Core price: ${basePriceMonthly} ${POLAR_PRICE_CURRENCY}/month`);
  console.log(`Core modules: ${coreModuleSlugs.join(', ')}`);
  console.log(`Addon modules: ${addonModules.length}\n`);

  const { result } = await polar.products.list({ organizationId: POLAR_ORGANIZATION_ID });
  const existingProducts = result?.items || [];

  const envUpdates: Record<string, string> = {
    VITE_POLAR_SERVER: POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
  };

  const coreProductPayload = {
    name: CORE_PRODUCT_NAME,
    description: CORE_PRODUCT_DESCRIPTION,
    metadata: {
      plan_type: 'core',
      included_modules: coreModuleSlugs.join(','),
      base_price_monthly: String(basePriceMonthly),
      addon_model: 'true',
    },
    recurringInterval: 'month' as const,
    prices: [
      {
        amountType: 'fixed' as const,
        priceAmount: Math.round(basePriceMonthly * 100),
        priceCurrency: POLAR_PRICE_CURRENCY,
      },
    ],
  };

  const existingCore = existingProducts.find(
    (product) => product.metadata?.plan_type === 'core' || product.name === CORE_PRODUCT_NAME,
  );

  let coreProductId = existingCore?.id;

  if (!dryRun) {
    if (existingCore) {
      console.log(`🔄 Updating core product: ${CORE_PRODUCT_NAME}`);
      const updated = await polar.products.update({
        id: existingCore.id,
        productUpdate: coreProductPayload,
      });
      coreProductId = updated.id;
    } else {
      console.log(`📦 Creating core product: ${CORE_PRODUCT_NAME}`);
      const created = await polar.products.create({
        organizationId: POLAR_ORGANIZATION_ID,
        ...coreProductPayload,
      });
      coreProductId = created.id;
    }
  }

  if (coreProductId) {
    envUpdates.VITE_POLAR_BASE_PRODUCT_ID = coreProductId;
  }

  for (const module of addonModules) {
    const slug = module.slug || module.name;
    const price = Number(module.price_monthly || 0);
    if (!price || price <= 0) {
      console.log(`⚠️  Skipping addon ${slug} (missing price_monthly)`);
      continue;
    }

    const addonPayload = {
      name: module.name,
      description: module.description || `Addon module: ${module.name}`,
      metadata: {
        addon: 'true',
        module_slug: slug,
        module_id: module.id,
        category: module.category || '',
      },
      recurringInterval: 'month' as const,
      prices: [
        {
          amountType: 'fixed' as const,
          priceAmount: Math.round(price * 100),
          priceCurrency: POLAR_PRICE_CURRENCY,
        },
      ],
    };

    const existingAddon = existingProducts.find(
      (product) => product.metadata?.module_slug === slug,
    );

    let addonProductId = existingAddon?.id;

    if (!dryRun) {
      if (existingAddon) {
        console.log(`🔄 Updating addon: ${module.name}`);
        const updated = await polar.products.update({
          id: existingAddon.id,
          productUpdate: addonPayload,
        });
        addonProductId = updated.id;
      } else {
        console.log(`📦 Creating addon: ${module.name}`);
        const created = await polar.products.create({
          organizationId: POLAR_ORGANIZATION_ID,
          ...addonPayload,
        });
        addonProductId = created.id;
      }
    }

    if (addonProductId) {
      envUpdates[`VITE_POLAR_ADDON_${slugifyKey(slug)}_PRODUCT_ID`] = addonProductId;
    }
  }

  if (dryRun) {
    console.log('\n🧪 Dry run complete. No changes were made.');
    return;
  }

  updateEnvFile(envPath, envUpdates);
  console.log(`\n✅ Updated ${envPath} with Polar product IDs.`);
}

createOrUpdateProducts().catch((error) => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
