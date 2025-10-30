/**
 * Planting System Data
 * Based on /data/agritech_production.json
 *
 * Provides structured data for crop categories, tree types, varieties,
 * planting systems, and density calculations.
 */

export type CropCategory = 'trees' | 'cereals' | 'vegetables' | 'other';

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

// Planting Systems from agritech_production.json
export const PLANTING_SYSTEMS: PlantingSystem[] = [
  {
    type: 'Super intensif',
    spacing: '4x1,5',
    treesPerHectare: 1666,
    plantingDate: 'Date de repiquage',
  },
  {
    type: 'Super intensif',
    spacing: '3x1,5',
    treesPerHectare: 2222,
  },
  {
    type: 'Intensif',
    spacing: '4x2',
    treesPerHectare: 1250,
  },
  {
    type: 'Intensif',
    spacing: '3x2',
    treesPerHectare: 1666,
  },
  {
    type: 'Semi-intensif',
    spacing: '6x3',
    treesPerHectare: 555,
  },
  {
    type: 'Traditionnel amélioré',
    spacing: '6x6',
    treesPerHectare: 277,
  },
  {
    type: 'Traditionnel',
    spacing: '8x8',
    treesPerHectare: 156,
  },
  {
    type: 'Traditionnel',
    spacing: '8x7',
    treesPerHectare: 179,
  },
  {
    type: 'Traditionnel très espacé',
    spacing: '10x10',
    treesPerHectare: 100,
  },
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
