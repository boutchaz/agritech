export interface SoilData {
  ph: number;
  organic_matter: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_type?: string;
  crop_type?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'ph' | 'nutrient' | 'organic_matter' | 'general';
  title: string;
  description: string;
  action: string;
  quantity?: string;
  timing?: string;
}

// Optimal ranges for different crops
const cropRequirements: Record<string, {
  ph: { min: number; max: number };
  nitrogen: { min: number; max: number };
  phosphorus: { min: number; max: number };
  potassium: { min: number; max: number };
  organic_matter: { min: number };
}> = {
  'olive': {
    ph: { min: 6.0, max: 8.0 },
    nitrogen: { min: 1.5, max: 2.5 },
    phosphorus: { min: 0.03, max: 0.06 },
    potassium: { min: 1.5, max: 2.5 },
    organic_matter: { min: 2.0 }
  },
  'citrus': {
    ph: { min: 5.5, max: 7.0 },
    nitrogen: { min: 2.0, max: 3.0 },
    phosphorus: { min: 0.04, max: 0.07 },
    potassium: { min: 2.0, max: 3.0 },
    organic_matter: { min: 2.5 }
  },
  'apple': {
    ph: { min: 6.0, max: 7.0 },
    nitrogen: { min: 1.8, max: 2.8 },
    phosphorus: { min: 0.035, max: 0.065 },
    potassium: { min: 1.8, max: 2.8 },
    organic_matter: { min: 3.0 }
  },
  'grape': {
    ph: { min: 5.5, max: 7.0 },
    nitrogen: { min: 1.5, max: 2.5 },
    phosphorus: { min: 0.03, max: 0.06 },
    potassium: { min: 2.0, max: 3.0 },
    organic_matter: { min: 2.0 }
  },
  'tomato': {
    ph: { min: 6.0, max: 7.0 },
    nitrogen: { min: 2.5, max: 3.5 },
    phosphorus: { min: 0.05, max: 0.08 },
    potassium: { min: 2.5, max: 3.5 },
    organic_matter: { min: 3.0 }
  },
  'default': {
    ph: { min: 6.0, max: 7.5 },
    nitrogen: { min: 1.5, max: 2.5 },
    phosphorus: { min: 0.03, max: 0.06 },
    potassium: { min: 1.5, max: 2.5 },
    organic_matter: { min: 2.0 }
  }
};

export function generateRecommendations(soilData: SoilData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const cropType = soilData.crop_type?.toLowerCase() || 'default';
  const requirements = cropRequirements[cropType] || cropRequirements.default;

  // pH Recommendations
  if (soilData.ph < requirements.ph.min) {
    const deficit = requirements.ph.min - soilData.ph;
    const limeAmount = Math.round(deficit * 2.5 * 10) / 10; // Rough estimate: 2.5 t/ha per pH unit

    recommendations.push({
      priority: deficit > 1.0 ? 'high' : 'medium',
      category: 'ph',
      title: 'Sol trop acide',
      description: `Le pH actuel (${soilData.ph}) est inférieur à l'optimum pour ${cropType === 'default' ? 'la plupart des cultures' : cropType} (${requirements.ph.min}-${requirements.ph.max}).`,
      action: 'Application de chaux agricole',
      quantity: `${limeAmount} t/ha`,
      timing: 'Automne ou début de printemps, 2-3 mois avant plantation'
    });
  } else if (soilData.ph > requirements.ph.max) {
    recommendations.push({
      priority: soilData.ph > 8.5 ? 'high' : 'medium',
      category: 'ph',
      title: 'Sol trop alcalin',
      description: `Le pH actuel (${soilData.ph}) est supérieur à l'optimum (${requirements.ph.min}-${requirements.ph.max}).`,
      action: 'Application de soufre élémentaire ou sulfate de fer',
      quantity: '0.5-1.5 t/ha selon pH cible',
      timing: 'Automne, plusieurs mois avant culture'
    });
  }

  // Nitrogen Recommendations
  if (soilData.nitrogen < requirements.nitrogen.min) {
    const deficit = requirements.nitrogen.min - soilData.nitrogen;
    const fertilizerAmount = Math.round(deficit * 450); // Rough conversion to kg/ha

    recommendations.push({
      priority: deficit > 0.5 ? 'high' : 'medium',
      category: 'nutrient',
      title: 'Carence en Azote (N)',
      description: `Le niveau d'azote (${soilData.nitrogen} g/kg) est insuffisant pour une croissance optimale.`,
      action: 'Application d\'engrais azoté',
      quantity: `${fertilizerAmount} kg/ha d'urée (46-0-0) ou équivalent`,
      timing: 'Fractionnée: 40% au démarrage, 30% mi-saison, 30% fin saison'
    });
  } else if (soilData.nitrogen > requirements.nitrogen.max) {
    recommendations.push({
      priority: 'low',
      category: 'nutrient',
      title: 'Azote élevé',
      description: `Le niveau d'azote est au-dessus de l'optimum. Risque de croissance végétative excessive.`,
      action: 'Réduire les apports azotés',
      timing: 'Surveiller la croissance et ajuster'
    });
  }

  // Phosphorus Recommendations
  if (soilData.phosphorus < requirements.phosphorus.min) {
    const deficit = requirements.phosphorus.min - soilData.phosphorus;
    const fertilizerAmount = Math.round(deficit * 15000); // Rough conversion to kg P2O5/ha

    recommendations.push({
      priority: 'medium',
      category: 'nutrient',
      title: 'Carence en Phosphore (P)',
      description: `Le niveau de phosphore (${soilData.phosphorus} g/kg) est insuffisant.`,
      action: 'Application d\'engrais phosphaté',
      quantity: `${fertilizerAmount} kg/ha de superphosphate triple (0-46-0) ou équivalent`,
      timing: 'Automne ou avant plantation, incorporation au sol'
    });
  }

  // Potassium Recommendations
  if (soilData.potassium < requirements.potassium.min) {
    const deficit = requirements.potassium.min - soilData.potassium;
    const fertilizerAmount = Math.round(deficit * 400); // Rough conversion to kg K2O/ha

    recommendations.push({
      priority: 'medium',
      category: 'nutrient',
      title: 'Carence en Potassium (K)',
      description: `Le niveau de potassium (${soilData.potassium} g/kg) est insuffisant.`,
      action: 'Application d\'engrais potassique',
      quantity: `${fertilizerAmount} kg/ha de sulfate de potassium (0-0-50) ou équivalent`,
      timing: 'Automne ou début de printemps'
    });
  }

  // Organic Matter Recommendations
  if (soilData.organic_matter < requirements.organic_matter.min) {
    const deficit = requirements.organic_matter.min - soilData.organic_matter;
    const compostAmount = Math.round(deficit * 12); // Rough estimate: 12 t/ha per %

    recommendations.push({
      priority: deficit > 1.5 ? 'high' : 'medium',
      category: 'organic_matter',
      title: 'Matière organique insuffisante',
      description: `Le taux de matière organique (${soilData.organic_matter}%) est en dessous du seuil optimal.`,
      action: 'Application de compost ou fumier composté',
      quantity: `${compostAmount} t/ha`,
      timing: 'Automne, incorporation au sol'
    });
  }

  // General soil health recommendations
  if (soilData.organic_matter > 2.5 &&
      soilData.ph >= requirements.ph.min &&
      soilData.ph <= requirements.ph.max) {
    recommendations.push({
      priority: 'low',
      category: 'general',
      title: 'Sol en bonne santé',
      description: 'Les paramètres principaux sont dans les normes optimales.',
      action: 'Maintenir les pratiques actuelles et surveiller régulièrement',
      timing: 'Analyse annuelle recommandée'
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function getNutrientStatus(
  value: number,
  min: number,
  max: number
): 'low' | 'optimal' | 'high' {
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'optimal';
}

export function getNutrientColor(status: 'low' | 'optimal' | 'high'): string {
  switch (status) {
    case 'low':
      return 'text-red-600 dark:text-red-400';
    case 'optimal':
      return 'text-green-600 dark:text-green-400';
    case 'high':
      return 'text-yellow-600 dark:text-yellow-400';
  }
}