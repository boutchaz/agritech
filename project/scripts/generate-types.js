#!/usr/bin/env node

/**
 * Script to generate TypeScript types from Supabase schema
 * This uses the declarative schema approach
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to check if supabase CLI is available
function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI not found. Please install it first:');
    console.error('npm install -g supabase');
    return false;
  }
}

// Function to generate types
function generateTypes() {
  try {
    console.log('🔄 Generating TypeScript types from schema...');

    // Generate types using supabase CLI
    const command = `supabase gen types typescript --local > src/types/database.types.ts`;

    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ TypeScript types generated successfully!');
    console.log('📁 Types saved to: src/types/database.types.ts');

    // Also generate a more user-friendly types file
    generateFriendlyTypes();

  } catch (error) {
    console.error('❌ Error generating types:', error.message);

    // Fallback: create basic types manually
    console.log('🔄 Creating fallback types...');
    createFallbackTypes();
  }
}

// Function to create more user-friendly type definitions
function generateFriendlyTypes() {
  const friendlyTypes = `// User-friendly type definitions for the Farm Management System
// Auto-generated from Supabase schema

import { Database } from './database.types';

// Table row types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export type OrganizationUser = Database['public']['Tables']['organization_users']['Row'];
export type OrganizationUserInsert = Database['public']['Tables']['organization_users']['Insert'];
export type OrganizationUserUpdate = Database['public']['Tables']['organization_users']['Update'];

export type Farm = Database['public']['Tables']['farms']['Row'];
export type FarmInsert = Database['public']['Tables']['farms']['Insert'];
export type FarmUpdate = Database['public']['Tables']['farms']['Update'];

export type Parcel = Database['public']['Tables']['parcels']['Row'];
export type ParcelInsert = Database['public']['Tables']['parcels']['Insert'];
export type ParcelUpdate = Database['public']['Tables']['parcels']['Update'];

export type CropType = Database['public']['Tables']['crop_types']['Row'];
export type CropTypeInsert = Database['public']['Tables']['crop_types']['Insert'];
export type CropTypeUpdate = Database['public']['Tables']['crop_types']['Update'];

export type CropVariety = Database['public']['Tables']['crop_varieties']['Row'];
export type CropVarietyInsert = Database['public']['Tables']['crop_varieties']['Insert'];
export type CropVarietyUpdate = Database['public']['Tables']['crop_varieties']['Update'];

export type Crop = Database['public']['Tables']['crops']['Row'];
export type CropInsert = Database['public']['Tables']['crops']['Insert'];
export type CropUpdate = Database['public']['Tables']['crops']['Update'];

export type SoilAnalysis = Database['public']['Tables']['soil_analysis']['Row'];
export type SoilAnalysisInsert = Database['public']['Tables']['soil_analysis']['Insert'];
export type SoilAnalysisUpdate = Database['public']['Tables']['soil_analysis']['Update'];

export type WeatherData = Database['public']['Tables']['weather_data']['Row'];
export type WeatherDataInsert = Database['public']['Tables']['weather_data']['Insert'];
export type WeatherDataUpdate = Database['public']['Tables']['weather_data']['Update'];

// Enums
export type UserRole = 'admin' | 'manager' | 'member';
export type AreaUnit = 'hectares' | 'acres' | 'square_meters';
export type IrrigationType = 'drip' | 'sprinkler' | 'flood' | 'none';
export type CropCategory = 'cereals' | 'vegetables' | 'fruits' | 'legumes' | 'herbs';
export type WaterRequirements = 'low' | 'medium' | 'high';
export type YieldUnit = 'kg' | 'tons' | 'bushels' | 'crates';
export type CropStatus = 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
export type SoilTexture = 'sand' | 'loamy_sand' | 'sandy_loam' | 'loam' | 'silt_loam' | 'silt' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay' | 'silty_clay' | 'clay';
export type WeatherSource = 'manual' | 'weather_station' | 'api';

// Extended types with relations
export interface FarmWithOrganization extends Farm {
  organization: Organization;
}

export interface ParcelWithFarm extends Parcel {
  farm: FarmWithOrganization;
}

export interface CropWithDetails extends Crop {
  variety: CropVariety & {
    crop_type: CropType;
  };
  parcel?: Parcel;
  farm: Farm;
}

export interface SoilAnalysisWithParcel extends SoilAnalysis {
  parcel: ParcelWithFarm;
}

export interface WeatherDataWithFarm extends WeatherData {
  farm: Farm;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface CreateOrganizationForm {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateFarmForm {
  organization_id: string;
  name: string;
  location?: string;
  total_area?: number;
  area_unit?: AreaUnit;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateParcelForm {
  farm_id: string;
  name: string;
  area?: number;
  area_unit?: AreaUnit;
  soil_type?: string;
  boundary?: number[][];
  elevation?: number;
  slope_percentage?: number;
  irrigation_type?: IrrigationType;
  notes?: string;
}

export interface CreateCropForm {
  farm_id: string;
  parcel_id?: string;
  variety_id: string;
  name: string;
  planting_date?: string;
  expected_harvest_date?: string;
  planted_area?: number;
  expected_yield?: number;
  yield_unit?: YieldUnit;
  status?: CropStatus;
  notes?: string;
}
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

// Function to create fallback types if CLI fails
function createFallbackTypes() {
  const fallbackTypes = `// Fallback type definitions for the Farm Management System
// These are basic types - run 'npm run generate-types' for full auto-generated types

export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'member';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  organization_id: string;
  name: string;
  location?: string;
  total_area?: number;
  area_unit: 'hectares' | 'acres' | 'square_meters';
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
  area_unit: 'hectares' | 'acres' | 'square_meters';
  soil_type?: string;
  boundary?: number[][];
  elevation?: number;
  slope_percentage?: number;
  irrigation_type?: 'drip' | 'sprinkler' | 'flood' | 'none';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Add other types as needed...
export type Database = any; // Placeholder
`;

  // Ensure types directory exists
  const typesDir = path.join(process.cwd(), 'src', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  // Write fallback types
  fs.writeFileSync(
    path.join(typesDir, 'database.types.ts'),
    fallbackTypes
  );

  console.log('✅ Fallback types created: src/types/database.types.ts');
}

// Main execution
function main() {
  console.log('🚀 Starting TypeScript type generation...');

  if (!checkSupabaseCLI()) {
    process.exit(1);
  }

  generateTypes();

  console.log('🎉 Type generation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update your components to use the new types');
  console.log('2. Import types: import { Organization, Farm, Parcel } from "./types"');
  console.log('3. Run this script again after schema changes');
}

// Check if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTypes, createFallbackTypes };