/**
 * Planting System Data
 * Based on /data/agritech_production.json
 *
 * Provides structured data for crop categories, tree types, varieties,
 * planting systems, and density calculations.
 * 
 * IMPORTANT: These static data are preserved as fallback when CMS (Strapi) data
 * is not available. The system uses CMS data first, then falls back to these
 * static data to ensure functionality even when CMS is unavailable.
 * 
 * All data structures are exported and can be used directly:
 * - TREE_CATEGORIES: Categorized tree types
 * - OLIVE_VARIETIES: Detailed olive variety data with yield information
 * - PLANTING_SYSTEMS: Tree planting systems with spacing and density
 * - VEGETABLE_PLANTING_SYSTEMS: Vegetable planting systems
 * - CEREAL_PLANTING_SYSTEMS: Cereal planting systems
 * - WORKER_TASKS: Worker task definitions
 * - AGRICULTURAL_PRODUCTS: Product list
 * 
 * Utility functions:
 * - getCropTypesByCategory(): Get crop types for a category
 * - getVarietiesByCropType(): Get varieties for a crop type
 * - getVarietyDetails(): Get detailed variety information (yield, origin, etc.)
 * - getPlantingSystemsByCategory(): Get planting systems for a category
 * - calculatePlantCount(): Calculate plant count from area and density
 * - getDensityFromSpacing(): Calculate density from spacing string
 */

export type CropCategory = 'trees' | 'cereals' | 'vegetables' | 'legumes' | 'fourrages' | 'industrielles' | 'aromatiques' | 'other';

export interface PlantingSystem {
  type: string;
  spacing: string;
  treesPerHectare: number;
  plantingDate?: string | null;
}

export interface OliveVariety {
  variety: string;
  origin: string;
  mainUse: string;
  yieldByAge: {
    '0-2years': string | number | null;
    '3years': string | number | null;
    '4years': string | number | null;
    '5years': string | number | null;
    '6-8years': string | number | null;
    '8-15years': string | number | null;
    '15years+': string | number | null;
  };
}

export interface WorkerTask {
  task: string;
  workerType: string | null;
}

// Tree Categories from agritech_production.json
export const TREE_CATEGORIES = {
  'Arbres fruitiers à noyau': [
    'Olivier',
    'Pêcher',
    'Abricotier',
    'Prunier',
    'Cerisier',
    'Amandier',
    'Nectarine',
    'Arganier',
  ],
  'Arbres fruitiers à pépins': [
    'Pommier',
    'Poirier',
    'Cognassier',
    'Nashi',
  ],
  'Agrumes': [
    'Oranger',
    'Mandariner',
    'Citronnier',
    'Pamplemoussier',
    'Pomelo',
    'Combava',
    'Cédratier',
  ],
  'Arbres tropicaux et subtropicaux': [
    'Avocatier',
    'Manguier',
    'Litchi',
    'Longanier',
    'Ramboutan',
    'Garambolier',
    'Goyavier',
    'Coroddolier',
    'Cherimolier',
    'Sapotillier',
    'Jacquier',
    'Durian',
    'Papayer',
    'Bananiers',
  ],
  'Arbres à fruits secs': [
    'Noyer',
    'Châtaignier',
    'Noisetier',
    'Pistachier',
    'Macadamia',
    'Cacaoyer',
    'Caféier',
  ],
  'Vigne et assimilés': [
    'Vigne',
    'Kiwier',
    'Grenadier',
    'Figuier',
    'Murier',
  ],
  'Palmacées fruitières': [
    'Palmier dattier',
    'Cocotier',
    'Palmier à huile',
    'Açaï',
  ],
} as const;

// Flatten all tree types for easy dropdown
export const ALL_TREE_TYPES = Object.values(TREE_CATEGORIES).flat();

// Planting Systems — olive reference table (rangées x espacement, densité/ha)
export const PLANTING_SYSTEMS: PlantingSystem[] = [
  { type: 'Traditionnelle',                  spacing: '12x12', treesPerHectare: 69   },
  { type: 'Traditionnelle',                  spacing: '12x10', treesPerHectare: 83   },
  { type: 'Traditionnelle',                  spacing: '10x10', treesPerHectare: 100  },
  { type: 'Traditionnelle',                  spacing: '10x8',  treesPerHectare: 125  },
  { type: 'Traditionnelle / Semi-Intensive', spacing: '8x8',   treesPerHectare: 156  },
  { type: 'Semi-Intensive',                  spacing: '8x7',   treesPerHectare: 178  },
  { type: 'Semi-Intensive',                  spacing: '7x7',   treesPerHectare: 204  },
  { type: 'Semi-Intensive',                  spacing: '8x6',   treesPerHectare: 208  },
  { type: 'Intensive',                       spacing: '7x6',   treesPerHectare: 238  },
  { type: 'Intensive',                       spacing: '6x6',   treesPerHectare: 277  },
  { type: 'Intensive',                       spacing: '7x5',   treesPerHectare: 285  },
  { type: 'Intensive',                       spacing: '6x5',   treesPerHectare: 333  },
  { type: 'Intensive',                       spacing: '5x5',   treesPerHectare: 400  },
  { type: 'Super-Intensive',                 spacing: '4x2',   treesPerHectare: 1250 },
  { type: 'Super-Intensive',                 spacing: '4x1,5', treesPerHectare: 1666 },
  { type: 'Super-Intensive',                 spacing: '3,75x1,5', treesPerHectare: 1777 },
  { type: 'Super-Intensive',                 spacing: '3,5x1,5',  treesPerHectare: 1904 },
  { type: 'Super-Intensive',                 spacing: '3x1,5', treesPerHectare: 2222 },
  { type: 'Super-Intensive',                 spacing: '3x1,35', treesPerHectare: 2469 },
];

// Olive Varieties with yield data
export const OLIVE_VARIETIES: OliveVariety[] = [
  {
    variety: 'Arbequine',
    origin: 'Espagne',
    mainUse: 'Huile',
    yieldByAge: {
      '0-2years': '0–2',
      '3years': '2–15',
      '4years': '15-20',
      '5years': '15-20',
      '6-8years': '20-30',
      '8-15years': '30-50',
      '15years+': '30-50',
    },
  },
  {
    variety: 'Arbosana',
    origin: 'Espagne',
    mainUse: 'Huile',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': null,
      '15years+': null,
    },
  },
  {
    variety: 'Menara/Haouzia',
    origin: 'Maroc',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': 0,
      '3years': '2–10',
      '4years': '15–40',
      '5years': '15–40',
      '6-8years': '15–40',
      '8-15years': '50–70+',
      '15years+': '50–70+',
    },
  },
  {
    variety: 'Menara',
    origin: 'Maroc (INRA)',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': 0,
      '3years': '2–12',
      '4years': '15–40',
      '5years': '15–40',
      '6-8years': '15–40',
      '8-15years': '45–65',
      '15years+': '45–65',
    },
  },
  {
    variety: 'Haouzia',
    origin: 'Maroc (INRA)',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': 0,
      '3years': '2–8',
      '4years': '15–35',
      '5years': '15–35',
      '6-8years': '15–35',
      '8-15years': '40–60',
      '15years+': '40–60',
    },
  },
  {
    variety: 'Picholine marocaine',
    origin: 'Maroc',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': '40–60',
      '15years+': '40–60',
    },
  },
  {
    variety: 'Picholine languedoc',
    origin: 'France',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': null,
      '15years+': null,
    },
  },
  {
    variety: 'Picholine languedoc herbassé',
    origin: 'France',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': null,
      '15years+': null,
    },
  },
  {
    variety: 'Koroneiki',
    origin: 'Grèce',
    mainUse: 'Huile et fruit',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': null,
      '15years+': null,
    },
  },
  {
    variety: 'Meslala',
    origin: 'Maroc',
    mainUse: 'Fruit',
    yieldByAge: {
      '0-2years': null,
      '3years': null,
      '4years': null,
      '5years': null,
      '6-8years': null,
      '8-15years': null,
      '15years+': null,
    },
  },
];

// Agricultural Products
export const AGRICULTURAL_PRODUCTS = [
  'NPK liquide concentré',
  'Fongicides',
  'Acides fulviques',
  'Herbicides',
  'Acides aminés avec microéléments',
  'Biostimulants',
  'Larvicides',
  'Générateurs de défenses',
  'Gel',
  'Engrais spécial',
  'NPK gel',
  'Acaricides',
  'Insecticides',
  'Acides aminés',
  'Acide humique',
  'Rodenticides',
  'Correcteur de carences',
];

// Worker Tasks
export const WORKER_TASKS: WorkerTask[] = [
  { task: 'Irrigation', workerType: 'Salariés fixes' },
  { task: 'Récolte', workerType: 'Salariés à la tâche ou à l\'unité (journalier)' },
  { task: 'Fertilisation au sol', workerType: 'Salarié avec % (métayage)' },
  { task: 'Fertigation', workerType: null },
  { task: 'Apport d\'amendements', workerType: null },
  { task: 'Plantation', workerType: null },
  { task: 'Entretien', workerType: null },
  { task: 'Taille', workerType: null },
  { task: 'Greffage / surgreffage', workerType: null },
  { task: 'Repiquage ou remplacement de plants morts', workerType: null },
  { task: 'Protection', workerType: null },
  { task: 'Désherbage', workerType: null },
  { task: 'Traitement', workerType: null },
  { task: 'Nettoyage et entretien du réseau d\'irrigation', workerType: null },
  { task: 'Pulvérisation de traitements', workerType: null },
  { task: 'Badigeonnage ou enduisage des troncs', workerType: null },
  { task: 'Piégeage d\'insectes', workerType: null },
  { task: 'Application de traitements biologiques', workerType: null },
  { task: 'Récolte manuelle', workerType: null },
  { task: 'Récolte mécanisée', workerType: null },
  { task: 'Ramassage et tri des fruits', workerType: null },
  { task: 'Mise en caisse ou en sacs', workerType: null },
  { task: 'Transport interne vers l\'aire de stockage', workerType: null },
  { task: 'Séchage, conservation ou préparation', workerType: null },
  { task: 'Construction et entretien de clôtures', workerType: null },
  { task: 'Entretien des pistes et rigoles', workerType: null },
  { task: 'Nettoyage de la ferme, des bassins, hangars et outils', workerType: null },
  { task: 'Réparation simple du matériel (sécateurs, tuyaux, pompes)', workerType: null },
  { task: 'Gestion des déchets (plastiques, sacs, bidons)', workerType: null },
  { task: 'Soins au troupeau (abreuvement, alimentation, nettoyage des abris)', workerType: null },
  { task: 'Surveillance et gardiennage des animaux', workerType: null },
  { task: 'Participation à la tonte, traite ou vaccination (si formé)', workerType: null },
  { task: 'Labourage', workerType: null },
  { task: 'Nettoyage après récolte', workerType: null },
];

// Common Cereal Crops
export const CEREAL_CROPS = [
  'Blé tendre',
  'Blé dur',
  'Orge',
  'Maïs',
  'Avoine',
  'Seigle',
  'Riz',
  'Sorgho',
  'Millet',
  'Triticale',
];

// Common Vegetable Crops
export const VEGETABLE_CROPS = [
  'Tomate',
  'Pomme de terre',
  'Oignon',
  'Carotte',
  'Poivron',
  'Aubergine',
  'Courgette',
  'Concombre',
  'Laitue',
  'Chou',
  'Haricot vert',
  'Petit pois',
  'Artichaut',
  'Betterave',
  'Navet',
  'Radis',
  'Épinard',
  'Persil',
  'Coriandre',
  'Menthe',
];

// Légumineuses (légumes secs / pulses)
export const LEGUME_CROPS = [
  'Pois chiche',
  'Lentille',
  'Fève',
  'Haricot sec',
  'Petit pois',
  'Niébé',
  'Soja',
  'Lupin',
  'Vesces',
  'Lentillon',
];

// Cultures fourragères
export const FOURRAGES_CROPS = [
  'Luzerne',
  'Trèfle',
  'Sorgho fourrager',
  'Avoine fourragère',
  'Ray-grass',
  'Fescue',
  'Dactyle',
  'Vesce-avoine',
  'Maïs fourrage',
  'Betterave fourragère',
];

// Cultures industrielles
export const INDUSTRIELLES_CROPS = [
  'Tournesol',
  'Colza',
  'Betterave à sucre',
  'Coton',
  'Lin',
  'Chanvre',
  'Tabac',
  'Carthame',
  'Arachide',
  'Sésame',
];

// Plantes aromatiques et médicinales
export const AROMATIQUES_CROPS = [
  'Thym',
  'Romarin',
  'Lavande',
  'Menthe poivrée',
  'Origan',
  'Fenouil',
  'Cumin',
  'Coriandre (graines)',
  'Nigelle',
  'Sauge',
  'Basilic',
  'Mélisse',
  'Verveine',
  'Camomille',
  'Armoise',
];

// Vegetable Planting Systems
export const VEGETABLE_PLANTING_SYSTEMS = [
  {
    type: 'Pleine terre - rangées simples',
    spacing: '0.8x0.3',
    plantsPerHectare: 41666,
    description: 'Tomates, poivrons, aubergines',
  },
  {
    type: 'Pleine terre - rangées doubles',
    spacing: '1.5x0.4',
    plantsPerHectare: 33333,
    description: 'Système à double rangée',
  },
  {
    type: 'Sous serre',
    spacing: '1.2x0.4',
    plantsPerHectare: 41666,
    description: 'Culture intensive sous abri',
  },
  {
    type: 'Semis dense - légumes feuilles',
    spacing: 'À la volée',
    plantsPerHectare: 500000,
    description: 'Laitue, épinard, persil',
  },
  {
    type: 'Billons - tubercules',
    spacing: '0.75x0.3',
    plantsPerHectare: 44444,
    description: 'Pommes de terre, patates douces',
  },
];

// Cereal Planting Systems
export const CEREAL_PLANTING_SYSTEMS = [
  {
    type: 'Densité standard',
    spacing: 'Semis en ligne (15-20cm)',
    seedsPerHectare: 3000000,
    seedingRate: '180-220 kg/ha',
    description: 'Blé tendre irrigué',
  },
  {
    type: 'Densité réduite - bour',
    spacing: 'Semis espacé (20-25cm)',
    seedsPerHectare: 2000000,
    seedingRate: '120-150 kg/ha',
    description: 'Blé dur en zone aride',
  },
  {
    type: 'Densité élevée - irrigué',
    spacing: 'Semis dense (12-15cm)',
    seedsPerHectare: 4000000,
    seedingRate: '220-280 kg/ha',
    description: 'Blé tendre pluvial favorable',
  },
  {
    type: 'Orge - standard',
    spacing: 'Semis en ligne (18-22cm)',
    seedsPerHectare: 2500000,
    seedingRate: '140-180 kg/ha',
    description: 'Orge fourragère ou brassicole',
  },
];

/**
 * Get planting systems based on crop category
 */
export function getPlantingSystemsByCategory(category: CropCategory) {
  switch (category) {
    case 'trees':
      return PLANTING_SYSTEMS;
    case 'vegetables':
      return VEGETABLE_PLANTING_SYSTEMS;
    case 'cereals':
      return CEREAL_PLANTING_SYSTEMS;
    default:
      return [];
  }
}

/**
 * Get crop types based on category
 */
export function getCropTypesByCategory(category: CropCategory): string[] {
  switch (category) {
    case 'trees':
      return ALL_TREE_TYPES;
    case 'vegetables':
      return VEGETABLE_CROPS;
    case 'cereals':
      return CEREAL_CROPS;
    case 'legumes':
      return LEGUME_CROPS;
    case 'fourrages':
      return FOURRAGES_CROPS;
    case 'industrielles':
      return INDUSTRIELLES_CROPS;
    case 'aromatiques':
      return AROMATIQUES_CROPS;
    default:
      return [];
  }
}

/**
 * Get varieties based on crop type (currently only for olives)
 */
export function getVarietiesByCropType(cropType: string): string[] {
  if (cropType.toLowerCase() === 'olivier') {
    return OLIVE_VARIETIES.map(v => v.variety);
  }
  // Can be extended for other crops
  return [];
}

/**
 * Get detailed variety information by crop type and variety name
 * Currently supports olive varieties with yield data
 */
export function getVarietyDetails(cropType: string, varietyName: string): OliveVariety | null {
  if (cropType.toLowerCase() === 'olivier') {
    return OLIVE_VARIETIES.find(v => 
      v.variety.toLowerCase() === varietyName.toLowerCase()
    ) || null;
  }
  return null;
}

/**
 * Get all olive varieties with their full details (yield data, origin, etc.)
 */
export function getOliveVarieties(): OliveVariety[] {
  return OLIVE_VARIETIES;
}

/**
 * Calculate plant count from area and density
 */
export function calculatePlantCount(areaHectares: number, densityPerHectare: number): number {
  return Math.round(areaHectares * densityPerHectare);
}

/**
 * Get density from spacing (for trees)
 * @param spacing Format: "rowSpacing x treeSpacing" (e.g., "4x1.5")
 * @returns trees per hectare
 */
export function getDensityFromSpacing(spacing: string): number | null {
  const match = spacing.match(/(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)/);
  if (!match) return null;

  const rowSpacing = parseFloat(match[1].replace(',', '.'));
  const treeSpacing = parseFloat(match[2].replace(',', '.'));

  // Calculate trees per hectare: 10000 / (row_spacing * tree_spacing)
  return Math.round(10000 / (rowSpacing * treeSpacing));
}
