#!/usr/bin/env node
/**
 * Push environment variables to Codelovers Dokploy compose stacks via Dokploy API.
 *
 * Required: DOKPLOY_URL, DOKPLOY_API_KEY (Codelovers Dokploy).
 * Optional: override Supabase/API/dashboard/satellite URLs and keys (see .env.dokploy.example).
 *
 * Usage:
 *   cp .env.dokploy.example .env.dokploy
 *   # Edit .env.dokploy with your DOKPLOY_URL, DOKPLOY_API_KEY and Codelovers URLs
 *   node scripts/set-dokploy-env.mjs
 *
 * Or with env vars:
 *   DOKPLOY_URL=https://dokploy.yourdomain.com DOKPLOY_API_KEY=xxx node scripts/set-dokploy-env.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function getComposeIds(env) {
  return {
    dashboard: env.COMPOSE_ID_DASHBOARD || 'yWxDZCuYYS9zJc5WZ_7zB',
    api: env.COMPOSE_ID_API || 'JLfCPchu5VwGpiDPGqlhw',
    satellite: env.COMPOSE_ID_SATELLITE || 'khtRQZT_omBZwRy5B4wi9',
    cms: env.COMPOSE_ID_CMS || 'GoUpFeVUACKA3BGnbBGSc',
  };
}

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      env[key] = val;
    }
  }
  return env;
}

function envToString(env) {
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

async function main() {
  const envPath = resolve(root, '.env.dokploy');
  let env = { ...process.env, ...loadEnv(envPath) };

  // Optional: satellite-only env (e.g. copy GEE_* and CDSE_* from thebzlab satellite compose)
  const satelliteEnvPath = resolve(root, '.env.dokploy.satellite');
  if (existsSync(satelliteEnvPath)) {
    const satelliteOverrides = loadEnv(satelliteEnvPath);
    env = { ...env, ...satelliteOverrides };
  }

  let DOKPLOY_URL = (env.DOKPLOY_URL || '').replace(/\/$/, '').trim();
  let DOKPLOY_API_KEY = (env.DOKPLOY_API_KEY || '').trim();

  // Prefer credentials from .cursor/mcp.json (dokploy-codelovers-mcp) so we use the same auth that works for MCP tools
  const mcpPath = resolve(root, '.cursor/mcp.json');
  if (existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'));
      const server = mcp.mcpServers?.['dokploy-codelovers-mcp']?.env;
      if (server?.DOKPLOY_URL && server?.DOKPLOY_API_KEY) {
        DOKPLOY_URL = (server.DOKPLOY_URL || '').replace(/\/$/, '').trim();
        DOKPLOY_API_KEY = (server.DOKPLOY_API_KEY || '').trim();
        console.log('Using DOKPLOY_URL and DOKPLOY_API_KEY from .cursor/mcp.json (dokploy-codelovers-mcp)\n');
      }
    } catch (_) {}
  }

  env = { ...env, DOKPLOY_URL, DOKPLOY_API_KEY };

  if (!DOKPLOY_URL || !DOKPLOY_API_KEY) {
    console.error('Missing DOKPLOY_URL or DOKPLOY_API_KEY. Set in .env.dokploy or in .cursor/mcp.json (dokploy-codelovers-mcp env).');
    console.error('See .env.dokploy.example for required variables.');
    process.exit(1);
  }

  // API base: avoid double /api (MCP config often has DOKPLOY_URL with /api already)
  const apiBase = DOKPLOY_URL.endsWith('/api') ? DOKPLOY_URL : `${DOKPLOY_URL}/api`;

  // Server-agnostic: all per-server values from env (no hardcoded defaults)
  const SUPABASE_URL = env.SUPABASE_URL || '';
  const ANON_KEY = env.SUPABASE_ANON_KEY || env.ANON_KEY || '';
  const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || '';
  const JWT_SECRET = env.JWT_SECRET || '';
  const POSTGRES_PASSWORD = env.POSTGRES_PASSWORD || '';
  const SUPABASE_NETWORK_NAME = env.SUPABASE_NETWORK_NAME || env.EXTERNAL_NETWORK_NAME || 'dokploy-network';
  const SUPABASE_DB_HOST = env.SUPABASE_DB_HOST || '';
  const EXTERNAL_NETWORK_NAME = env.EXTERNAL_NETWORK_NAME || 'dokploy-network';
  const API_URL = env.API_URL || '';
  const DASHBOARD_URL = env.DASHBOARD_URL || env.FRONTEND_URL || '';
  const SATELLITE_URL = env.SATELLITE_URL || '';
  const CMS_URL = env.CMS_URL || env.STRAPI_URL || '';
  const API_PUBLIC_HOST = env.API_PUBLIC_HOST || env.API_URL || '';

  const required = [
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_ANON_KEY or ANON_KEY', ANON_KEY],
    ['SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY', SERVICE_ROLE_KEY],
    ['JWT_SECRET', JWT_SECRET],
    ['POSTGRES_PASSWORD', POSTGRES_PASSWORD],
    ['SUPABASE_DB_HOST', SUPABASE_DB_HOST],
    ['API_URL', API_URL],
    ['DASHBOARD_URL or FRONTEND_URL', DASHBOARD_URL],
    ['SATELLITE_URL', SATELLITE_URL],
    ['CMS_URL or STRAPI_URL', CMS_URL],
  ];
  const missing = required.filter(([, v]) => !v || (typeof v === 'string' && !v.trim()));
  if (missing.length) {
    console.error('Missing required env (set in .env.dokploy or environment):');
    missing.forEach(([name]) => console.error('  -', name));
    process.exit(1);
  }

  const COMPOSE_IDS = getComposeIds(env);

  async function composeUpdate(composeId, envBody) {
    const res = await fetch(`${apiBase}/compose.update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': DOKPLOY_API_KEY,
      },
      body: JSON.stringify({ composeId, env: envBody }),
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error(
          `compose.update ${composeId}: 401 Unauthorized. Check:\n` +
          '  1. DOKPLOY_API_KEY in .env.dokploy is the key from Dokploy → Settings → Profile → API/CLI\n' +
          '  2. No extra spaces or quotes around the key in .env.dokploy\n' +
          '  3. Try generating a new API key in Dokploy and update .env.dokploy\n' +
          `Server response: ${text}`
        );
      }
      throw new Error(`compose.update ${composeId}: ${res.status} ${text}`);
    }
    return text ? JSON.parse(text) : {};
  }

  console.log('Pushing env to Codelovers Dokploy...\n');

  // 1. API
  const apiEnv = {
    NODE_ENV: 'production',
    PORT: '3001',
    API_PREFIX: 'api/v1',
    SUPABASE_URL,
    SUPABASE_ANON_KEY: ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    SUPABASE_NETWORK_NAME,
    JWT_SECRET,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '1h',
    DATABASE_URL: `postgresql://postgres:${POSTGRES_PASSWORD}@${SUPABASE_DB_HOST}:5432/postgres`,
    CORS_ORIGIN: env.CORS_ORIGIN || `${DASHBOARD_URL},${API_URL},${CMS_URL}`,
    LOG_LEVEL: 'info',
    RATE_LIMIT_TTL: '60',
    RATE_LIMIT_MAX: '100',
    FRONTEND_URL: DASHBOARD_URL,
    SATELLITE_SERVICE_URL: SATELLITE_URL,
    STRAPI_API_URL: CMS_URL,
    EXTERNAL_NETWORK_NAME,
    API_PUBLIC_HOST: (API_PUBLIC_HOST || API_URL).replace(/^https?:\/\//, '').split('/')[0],
    STRAPI_API_TOKEN: env.STRAPI_API_TOKEN || '',
    ZAI_API_KEY: env.ZAI_API_KEY || '',
    SMTP_HOST: env.SMTP_HOST || '',
    SMTP_PORT: env.SMTP_PORT || '587',
    SMTP_SECURE: env.SMTP_SECURE || 'false',
    SMTP_USER: env.SMTP_USER || '',
    SMTP_PASS: env.SMTP_PASS || '',
    EMAIL_FROM: env.EMAIL_FROM || '',
  };
  await composeUpdate(COMPOSE_IDS.api, envToString(apiEnv));
  console.log('✓ api');

  // 2. Satellite
  const satelliteEnv = {
    DEBUG: 'false',
    SATELLITE_PROVIDER: env.SATELLITE_PROVIDER || 'auto',
    SATELLITE_COMMERCIAL_MODE: env.SATELLITE_COMMERCIAL_MODE || 'false',
    GEE_SERVICE_ACCOUNT: env.GEE_SERVICE_ACCOUNT || '',
    GEE_PRIVATE_KEY: env.GEE_PRIVATE_KEY || '',
    GEE_PROJECT_ID: env.GEE_PROJECT_ID || '',
    CDSE_CLIENT_ID: env.CDSE_CLIENT_ID || '',
    CDSE_CLIENT_SECRET: env.CDSE_CLIENT_SECRET || '',
    CDSE_OPENEO_URL: env.CDSE_OPENEO_URL || 'https://openeo.dataspace.copernicus.eu',
    SUPABASE_URL,
    SUPABASE_ANON_KEY: ANON_KEY,
    SUPABASE_SERVICE_KEY: SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    SATELLITE_DOMAIN: SATELLITE_URL.replace(/^https?:\/\//, ''),
    SATELLITE_PUBLIC_HOST: SATELLITE_URL.replace(/^https?:\/\//, '').split('/')[0],
    PORT: '8000',
    HOST: '0.0.0.0',
    MAX_CLOUD_COVERAGE: '10.0',
    DEFAULT_SCALE: '10',
    MAX_PIXELS: '10000000000000',
  };
  await composeUpdate(COMPOSE_IDS.satellite, envToString(satelliteEnv));
  console.log('✓ satellite');

  // 3. Dashboard (VITE_* are build-time; use same values for consistency)
  const dashboardTraefikHost = env.DASHBOARD_TRAEFIK_HOST || (DASHBOARD_URL ? DASHBOARD_URL.replace(/^https?:\/\//, '').split('/')[0] : '');
  const dashboardPublicHost = env.DASHBOARD_PUBLIC_HOST || dashboardTraefikHost;
  const dashboardEnv = {
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: ANON_KEY,
    VITE_API_URL: API_URL,
    VITE_AUTH_SUPABASE_URL: SUPABASE_URL,
    VITE_AUTH_SUPABASE_ANON_KEY: ANON_KEY,
    VITE_BACKEND_SERVICE_URL: SATELLITE_URL,
    VITE_SATELLITE_SERVICE_URL: SATELLITE_URL,
    VITE_APP_URL: DASHBOARD_URL,
    DASHBOARD_TRAEFIK_HOST: dashboardTraefikHost,
    DASHBOARD_PUBLIC_HOST: dashboardPublicHost,
    TRAEFIK_NETWORK: env.TRAEFIK_NETWORK || 'dokploy-network',
    VITE_OPENWEATHER_API_KEY: env.VITE_OPENWEATHER_API_KEY || '',
    VITE_GA_MEASUREMENT_ID: env.VITE_GA_MEASUREMENT_ID || '',
    VITE_CLARITY_ENABLED: env.VITE_CLARITY_ENABLED || 'true',
    VITE_ANALYTICS_DEBUG: env.VITE_ANALYTICS_DEBUG || 'false',
    VITE_MAP_PROVIDER: env.VITE_MAP_PROVIDER || 'default',
    VITE_MAPBOX_TOKEN: env.VITE_MAPBOX_TOKEN || '',
    VITE_POLAR_ACCESS_TOKEN: env.VITE_POLAR_ACCESS_TOKEN || '',
    VITE_POLAR_ORGANIZATION_ID: env.VITE_POLAR_ORGANIZATION_ID || '',
    POLAR_WEBHOOK_SECRET: env.POLAR_WEBHOOK_SECRET || '',
    VITE_POLAR_SERVER: env.VITE_POLAR_SERVER || 'sandbox',
    VITE_POLAR_CHECKOUT_URL: env.VITE_POLAR_CHECKOUT_URL || '',
    VITE_POLAR_ESSENTIAL_PRODUCT_ID: env.VITE_POLAR_ESSENTIAL_PRODUCT_ID || '',
    VITE_POLAR_PROFESSIONAL_PRODUCT_ID: env.VITE_POLAR_PROFESSIONAL_PRODUCT_ID || '',
    VITE_POLAR_ENTERPRISE_PRODUCT_ID: env.VITE_POLAR_ENTERPRISE_PRODUCT_ID || '',
  };
  await composeUpdate(COMPOSE_IDS.dashboard, envToString(dashboardEnv));
  console.log('✓ dashboard');

  // 4. CMS (Strapi)
  const cmsEnv = {
    DATABASE_CLIENT: 'postgres',
    DATABASE_HOST: 'strapi-db',
    DATABASE_PORT: '5432',
    DATABASE_NAME: env.STRAPI_DB_NAME || 'agritech_strapi',
    DATABASE_USERNAME: env.STRAPI_DB_USER || 'strapi',
    DATABASE_PASSWORD: env.STRAPI_DB_PASSWORD || '',
    DATABASE_SSL: 'false',
    JWT_SECRET: env.STRAPI_JWT_SECRET || JWT_SECRET,
    ADMIN_JWT_SECRET: env.STRAPI_ADMIN_JWT_SECRET || '',
    APP_KEYS: env.STRAPI_APP_KEYS || '',
    API_TOKEN_SALT: env.STRAPI_API_TOKEN_SALT || '',
    TRANSFER_TOKEN_SALT: env.STRAPI_TRANSFER_TOKEN_SALT || '',
    NODE_ENV: 'production',
    STRAPI_URL: CMS_URL,
    STRAPI_DB_USER: env.STRAPI_DB_USER || 'strapi',
    STRAPI_DB_PASSWORD: env.STRAPI_DB_PASSWORD || '',
    STRAPI_DB_NAME: env.STRAPI_DB_NAME || 'agritech_strapi',
    CMS_PUBLIC_HOST: CMS_URL.replace(/^https?:\/\//, '').split('/')[0],
  };
  await composeUpdate(COMPOSE_IDS.cms, envToString(cmsEnv));
  console.log('✓ cms');

  console.log('\nDone. Redeploy each stack in Dokploy if containers are already running.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
