/**
 * Reference data table definitions for the admin app.
 * Each entry maps a display name to a Supabase table with its visible columns.
 */

export interface ColumnDef {
  key: string;
  label: string;
  editable?: boolean;
  type?: 'text' | 'number' | 'boolean' | 'json';
}

export interface ReferentielTable {
  slug: string;
  label: string;
  table: string;
  description: string;
  category: 'agronomie' | 'produits' | 'exploitation' | 'systeme';
  columns: ColumnDef[];
}

export const REFERENTIEL_TABLES: ReferentielTable[] = [
  // --- Agronomie ---
  {
    slug: 'crop-types',
    label: 'Crop Types',
    table: 'crop_types',
    description: 'Types de cultures (olivier, agrumes, etc.)',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'name_ar', label: 'Name (AR)', editable: true },
      { key: 'scientific_name', label: 'Scientific Name', editable: true },
      { key: 'family', label: 'Family', editable: true },
      { key: 'module_slug', label: 'Module', editable: true },
      { key: 'tbase', label: 'T Base', editable: true, type: 'number' },
      { key: 'frost_threshold', label: 'Frost Threshold', editable: true, type: 'number' },
      { key: 'heat_threshold', label: 'Heat Threshold', editable: true, type: 'number' },
      { key: 'is_system', label: 'System', type: 'boolean' },
    ],
  },
  {
    slug: 'crop-varieties',
    label: 'Crop Varieties',
    table: 'crop_varieties',
    description: 'Variétés de cultures (Picholine, Haouzia, etc.)',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'days_to_maturity', label: 'Days to Maturity', editable: true, type: 'number' },
      { key: 'yield_potential_low', label: 'Yield Low', editable: true, type: 'number' },
      { key: 'yield_potential_high', label: 'Yield High', editable: true, type: 'number' },
      { key: 'oil_content_percent', label: 'Oil %', editable: true, type: 'number' },
      { key: 'use_type', label: 'Use Type', editable: true },
      { key: 'origin_country', label: 'Origin', editable: true },
      { key: 'is_system', label: 'System', type: 'boolean' },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'phenological-stages',
    label: 'Phenological Stages',
    table: 'phenological_stages',
    description: 'Stades phénologiques par culture avec codes BBCH',
    category: 'agronomie',
    columns: [
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'stage_name', label: 'Stage', editable: true },
      { key: 'stage_name_fr', label: 'Stage (FR)', editable: true },
      { key: 'bbch_code', label: 'BBCH Code', editable: true },
      { key: 'stage_order', label: 'Order', editable: true, type: 'number' },
      { key: 'gdd_threshold_min', label: 'GDD Min', editable: true, type: 'number' },
      { key: 'gdd_threshold_max', label: 'GDD Max', editable: true, type: 'number' },
      { key: 'ndvi_expected_min', label: 'NDVI Min', editable: true, type: 'number' },
      { key: 'ndvi_expected_max', label: 'NDVI Max', editable: true, type: 'number' },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'crop-kc-coefficients',
    label: 'Kc Coefficients',
    table: 'crop_kc_coefficients',
    description: 'Coefficients culturaux (Kc) pour calcul irrigation',
    category: 'agronomie',
    columns: [
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'phenological_stage_name', label: 'Stage', editable: true },
      { key: 'kc_value', label: 'Kc', editable: true, type: 'number' },
      { key: 'kc_min', label: 'Kc Min', editable: true, type: 'number' },
      { key: 'kc_max', label: 'Kc Max', editable: true, type: 'number' },
      { key: 'notes', label: 'Notes', editable: true },
    ],
  },
  {
    slug: 'crop-mineral-exports',
    label: 'Mineral Exports',
    table: 'crop_mineral_exports',
    description: 'Exportations minérales par tonne de récolte',
    category: 'agronomie',
    columns: [
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'product_type', label: 'Product Type', editable: true },
      { key: 'n_kg_per_ton', label: 'N (kg/t)', editable: true, type: 'number' },
      { key: 'p2o5_kg_per_ton', label: 'P2O5 (kg/t)', editable: true, type: 'number' },
      { key: 'k2o_kg_per_ton', label: 'K2O (kg/t)', editable: true, type: 'number' },
      { key: 'cao_kg_per_ton', label: 'CaO (kg/t)', editable: true, type: 'number' },
      { key: 'mgo_kg_per_ton', label: 'MgO (kg/t)', editable: true, type: 'number' },
    ],
  },
  {
    slug: 'crop-diseases',
    label: 'Crop Diseases',
    table: 'crop_diseases',
    description: 'Maladies des cultures avec traitements',
    category: 'agronomie',
    columns: [
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'disease_name', label: 'Disease', editable: true },
      { key: 'disease_name_fr', label: 'Disease (FR)', editable: true },
      { key: 'pathogen_name', label: 'Pathogen', editable: true },
      { key: 'disease_type', label: 'Type', editable: true },
      { key: 'severity', label: 'Severity', editable: true },
      { key: 'treatment_product', label: 'Treatment', editable: true },
      { key: 'treatment_dose', label: 'Dose', editable: true },
    ],
  },
  {
    slug: 'crop-index-thresholds',
    label: 'Index Thresholds',
    table: 'crop_index_thresholds',
    description: 'Seuils des indices de végétation (NDVI, NDMI, EVI)',
    category: 'agronomie',
    columns: [
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'plantation_system_type', label: 'System', editable: true },
      { key: 'index_name', label: 'Index', editable: true },
      { key: 'healthy_min', label: 'Healthy Min', editable: true, type: 'number' },
      { key: 'healthy_max', label: 'Healthy Max', editable: true, type: 'number' },
      { key: 'stress_low', label: 'Stress Low', editable: true, type: 'number' },
      { key: 'stress_high', label: 'Stress High', editable: true, type: 'number' },
      { key: 'critical_low', label: 'Critical Low', editable: true, type: 'number' },
    ],
  },
  {
    slug: 'soil-types',
    label: 'Soil Types',
    table: 'soil_types',
    description: 'Types de sols',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'name_ar', label: 'Name (AR)', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'irrigation-types',
    label: 'Irrigation Types',
    table: 'irrigation_types',
    description: 'Types d\'irrigation',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'name_ar', label: 'Name (AR)', editable: true },
      { key: 'efficiency', label: 'Efficiency', editable: true, type: 'number' },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'rootstocks',
    label: 'Rootstocks',
    table: 'rootstocks',
    description: 'Porte-greffes',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'name_ar', label: 'Name (AR)', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'plantation-systems',
    label: 'Plantation Systems',
    table: 'plantation_systems',
    description: 'Systèmes de plantation avec densités et espacements',
    category: 'agronomie',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'system_type', label: 'System Type', editable: true },
      { key: 'crop_type_name', label: 'Crop Type', editable: true },
      { key: 'row_spacing_m', label: 'Row Spacing (m)', editable: true, type: 'number' },
      { key: 'tree_spacing_m', label: 'Tree Spacing (m)', editable: true, type: 'number' },
      { key: 'trees_per_hectare_min', label: 'Trees/ha Min', editable: true, type: 'number' },
      { key: 'trees_per_hectare_max', label: 'Trees/ha Max', editable: true, type: 'number' },
      { key: 'is_system', label: 'System', type: 'boolean' },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },

  // --- Produits ---
  {
    slug: 'product-categories',
    label: 'Product Categories',
    table: 'product_categories',
    description: 'Catégories de produits (engrais, pesticides, etc.)',
    category: 'produits',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'name_fr', label: 'Name (FR)', editable: true },
      { key: 'name_ar', label: 'Name (AR)', editable: true },
      { key: 'description', label: 'Description', editable: true },
    ],
  },
  {
    slug: 'product-subcategories',
    label: 'Product Subcategories',
    table: 'product_subcategories',
    description: 'Sous-catégories de produits',
    category: 'produits',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },

  // --- Exploitation ---
  {
    slug: 'tree-categories',
    label: 'Tree Categories',
    table: 'tree_categories',
    description: 'Catégories d\'arbres',
    category: 'exploitation',
    columns: [
      { key: 'category', label: 'Category', editable: true },
      { key: 'category_fr', label: 'Category (FR)', editable: true },
      { key: 'category_ar', label: 'Category (AR)', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'plantation-types',
    label: 'Plantation Types',
    table: 'plantation_types',
    description: 'Types de plantation avec densités',
    category: 'exploitation',
    columns: [
      { key: 'type', label: 'Type', editable: true },
      { key: 'spacing', label: 'Spacing', editable: true },
      { key: 'trees_per_ha', label: 'Trees/ha', editable: true, type: 'number' },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'cost-categories',
    label: 'Cost Categories',
    table: 'cost_categories',
    description: 'Catégories de coûts',
    category: 'exploitation',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'type', label: 'Type', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },
  {
    slug: 'test-types',
    label: 'Test Types',
    table: 'test_types',
    description: 'Types d\'analyses de laboratoire',
    category: 'exploitation',
    columns: [
      { key: 'name', label: 'Name', editable: true },
      { key: 'description', label: 'Description', editable: true },
      { key: 'is_active', label: 'Active', editable: true, type: 'boolean' },
    ],
  },

  // --- Systeme ---
  {
    slug: 'currencies',
    label: 'Currencies',
    table: 'currencies',
    description: 'Devises',
    category: 'systeme',
    columns: [
      { key: 'code', label: 'Code', editable: true },
      { key: 'name', label: 'Name', editable: true },
      { key: 'symbol', label: 'Symbol', editable: true },
    ],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  agronomie: 'Agronomie',
  produits: 'Produits',
  exploitation: 'Exploitation',
  systeme: 'Système',
};

export function getTableBySlug(slug: string): ReferentielTable | undefined {
  return REFERENTIEL_TABLES.find((t) => t.slug === slug);
}
