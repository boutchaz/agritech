import { createDirectus, rest, authentication, staticToken } from '@directus/sdk';

// Define your schema types for global catalog
export interface TreeCategory {
  id: string;
  category: string;
  description?: string;
  trees: Tree[];
  status: 'published' | 'draft' | 'archived';
  date_created: string;
  date_updated: string;
  user_created: string;
  user_updated: string;
}

export interface Tree {
  id: string;
  category_id: string;
  name: string;
  scientific_name?: string;
  description?: string;
  status: 'published' | 'draft' | 'archived';
  date_created: string;
  date_updated: string;
}

export interface PlantationType {
  id: string;
  type: string;
  spacing: string;
  trees_per_ha: number;
  description?: string;
  status: 'published' | 'draft' | 'archived';
  date_created: string;
  date_updated: string;
}

// Define your Directus schema
export interface DirectusSchema {
  tree_categories: TreeCategory[];
  trees: Tree[];
  plantation_types: PlantationType[];
}

// Directus configuration
// Use environment variable compatible with both Node.js and browser
const getDirectusUrl = () => {
  // For Node.js (scripts)
  if (typeof process !== 'undefined' && process.env.DIRECTUS_URL) {
    return process.env.DIRECTUS_URL;
  }
  // For browser (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DIRECTUS_URL) {
    return import.meta.env.VITE_DIRECTUS_URL;
  }
  // Default fallback
  return 'http://localhost:8055';
};

const directusUrl = getDirectusUrl();

// Create Directus client
export const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(rest())
  .with(authentication());

// Create admin client with static token for server-side operations
export const createAdminClient = (adminToken: string) => {
  return createDirectus<DirectusSchema>(directusUrl)
    .with(rest())
    .with(staticToken(adminToken));
};

export default directus;
