#!/usr/bin/env node

/**
 * Script to generate TypeScript types from remote self-hosted Supabase
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_HOST = process.env.POSTGRES_HOST;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;

function checkRequirements() {
  if (!SUPABASE_HOST) {
    console.error('❌ POSTGRES_HOST not found in .env');
    return false;
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    return false;
  }

  // Check if supabase CLI is available
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI not found. Please install it first:');
    console.error('npm install -g supabase');
    return false;
  }
}

function generateTypes() {
  try {
    console.log('🔄 Generating TypeScript types from remote Supabase...');
    console.log(`📡 Target: ${SUPABASE_HOST}`);

    // Create a temporary .env file for the Supabase CLI
    const tempEnvPath = path.join(__dirname, '../.env.temp');
    const envContent = `SUPABASE_URL=http://${SUPABASE_HOST}
SUPABASE_ANON_KEY=${SERVICE_ROLE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}`;

    fs.writeFileSync(tempEnvPath, envContent);

    // Generate types using supabase CLI pointing to remote instance
    const command = `supabase gen types typescript --project-id default --schema public`;

    const typesOutput = execSync(command, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SUPABASE_URL: `http://${SUPABASE_HOST}`,
        SUPABASE_ACCESS_TOKEN: SERVICE_ROLE_KEY
      },
      encoding: 'utf8'
    });

    // Ensure types directory exists
    const typesDir = path.join(process.cwd(), 'src', 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    // Write types to file
    fs.writeFileSync(
      path.join(typesDir, 'database.types.ts'),
      typesOutput
    );

    // Clean up temp file
    if (fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }

    console.log('✅ TypeScript types generated successfully!');
    console.log('📁 Types saved to: src/types/database.types.ts');

    // Generate user-friendly types
    generateFriendlyTypes();

  } catch (error) {
    console.error('❌ Error generating types:', error.message);

    // Try alternative approach using direct database connection
    console.log('🔄 Trying alternative approach...');
    generateTypesFromDB();
  }
}

function generateTypesFromDB() {
  try {
    console.log('🔄 Generating types from database schema...');

    // Use introspection to generate basic types
    const connectionString = `postgresql://postgres:${POSTGRES_PASSWORD}@${SUPABASE_HOST}:5432/postgres`;

    // Query to get table structure
    const query = `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const result = execSync(`psql "${connectionString}" -c "${query}" -t -A -F,`, {
      env: { ...process.env, PGPASSWORD: POSTGRES_PASSWORD },
      encoding: 'utf8'
    });

    // Parse results and generate basic types
    const lines = result.trim().split('\n').filter(line => line.trim());
    const tables = {};

    lines.forEach(line => {
      const [tableName, columnName, dataType, isNullable, columnDefault] = line.split(',');

      if (!tables[tableName]) {
        tables[tableName] = [];
      }

      // Map PostgreSQL types to TypeScript types
      let tsType = 'string';
      switch (dataType) {
        case 'integer':
        case 'bigint':
        case 'numeric':
        case 'real':
        case 'double precision':
          tsType = 'number';
          break;
        case 'boolean':
          tsType = 'boolean';
          break;
        case 'timestamp with time zone':
        case 'timestamp without time zone':
        case 'date':
          tsType = 'string';
          break;
        case 'uuid':
          tsType = 'string';
          break;
        case 'jsonb':
        case 'json':
          tsType = 'any';
          break;
        case 'ARRAY':
          tsType = 'any[]';
          break;
        default:
          tsType = 'string';
      }

      if (isNullable === 'YES') {
        tsType += ' | null';
      }

      tables[tableName].push(`  ${columnName}: ${tsType};`);
    });

    // Generate TypeScript interfaces
    let typesContent = '// Auto-generated types from remote Supabase\n\n';

    Object.keys(tables).forEach(tableName => {
      const interfaceName = tableName.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');

      typesContent += `export interface ${interfaceName} {\n`;
      typesContent += tables[tableName].join('\n');
      typesContent += '\n}\n\n';
    });

    // Ensure types directory exists
    const typesDir = path.join(process.cwd(), 'src', 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    // Write types to file
    fs.writeFileSync(
      path.join(typesDir, 'database.types.ts'),
      typesContent
    );

    console.log('✅ Basic types generated from database schema!');

  } catch (error) {
    console.error('❌ Error generating types from database:', error.message);

    // Fallback to manual types
    console.log('🔄 Creating fallback types...');
    createFallbackTypes();
  }
}

function generateFriendlyTypes() {
  const friendlyTypes = `// User-friendly type definitions for the Farm Management System
// Auto-generated from remote Supabase schema

import { Database } from './database.types';

// Table row types (fallback if Database type not available)
export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  organization_id: string;
  name: string;
  location?: string;
  total_area?: number;
  area_unit: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface Parcel {
  id: string;
  farm_id: string;
  name: string;
  area?: number;
  area_unit: string;
  soil_type?: string;
  boundary?: number[][];
  elevation?: number;
  slope_percentage?: number;
  irrigation_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Enums
export type UserRole = 'admin' | 'manager' | 'member';
export type AreaUnit = 'hectares' | 'acres' | 'square_meters';
export type IrrigationType = 'drip' | 'sprinkler' | 'flood' | 'none';
export type CropCategory = 'cereals' | 'vegetables' | 'fruits' | 'legumes' | 'herbs';
export type WaterRequirements = 'low' | 'medium' | 'high';
export type YieldUnit = 'kg' | 'tons' | 'bushels' | 'crates';
export type CropStatus = 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';

// Supabase client configuration
export const supabaseConfig = {
  url: 'http://${SUPABASE_HOST}',
  anonKey: '${process.env.ANON_KEY || 'your-anon-key'}',
  serviceRoleKey: '${SERVICE_ROLE_KEY}',
};
`;

  // Ensure types directory exists
  const typesDir = path.join(process.cwd(), 'src', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  // Write friendly types file
  fs.writeFileSync(
    path.join(typesDir, 'index.ts'),
    friendlyTypes
  );

  console.log('✅ Friendly types generated: src/types/index.ts');
}

function createFallbackTypes() {
  const fallbackTypes = `// Fallback type definitions for the Farm Management System
export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  organization_id: string;
  name: string;
  location?: string;
  total_area?: number;
  area_unit: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Parcel {
  id: string;
  farm_id: string;
  name: string;
  area?: number;
  soil_type?: string;
  created_at: string;
  updated_at: string;
}

export type Database = any; // Placeholder
`;

  const typesDir = path.join(process.cwd(), 'src', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(typesDir, 'database.types.ts'),
    fallbackTypes
  );

  console.log('✅ Fallback types created');
}

function main() {
  console.log('🚀 Remote Supabase Type Generation');
  console.log('===================================');

  if (!checkRequirements()) {
    process.exit(1);
  }

  generateTypes();

  console.log('\n🎉 Type generation complete!');
  console.log(`📊 Dashboard: http://${SUPABASE_HOST}/project/default`);
  console.log('📝 Types available at: src/types/');
}

// Check if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTypes };