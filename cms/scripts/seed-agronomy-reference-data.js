const API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
  console.error('STRAPI_API_TOKEN environment variable is required');
  console.error('Generate a token in Strapi Admin: Settings > API Tokens > Create new API Token');
  process.exit(1);
}

async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  if (data) {
    options.body = JSON.stringify({ data });
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || `API request failed: ${response.status}`);
  }

  return result;
}

async function seedCollection(collectionName, items, uniqueField = 'value') {
  console.log(`\nSeeding ${collectionName}...`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const existing = await apiRequest(`/${collectionName}?filters[${uniqueField}][$eq]=${encodeURIComponent(item[uniqueField])}`);
      
      if (existing.data && existing.data.length > 0) {
        skipped++;
        continue;
      }

      await apiRequest(`/${collectionName}`, 'POST', item);
      created++;
      console.log(`  + ${item.name}`);
    } catch (error) {
      console.error(`  x Failed: ${item.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`  Summary: ${created} created, ${skipped} skipped, ${failed} failed`);
  return { created, skipped, failed };
}

const soilTypes = [
  {
    name: 'Sandy Soil',
    name_fr: 'Sol sableux',
    name_ar: 'تربة رملية',
    value: 'sandy',
    description: 'Light, warm soil that drains quickly. Low in nutrients but easy to work with.',
    description_fr: 'Sol léger et chaud qui draine rapidement. Pauvre en nutriments mais facile à travailler.',
    description_ar: 'تربة خفيفة ودافئة تصرف الماء بسرعة. فقيرة بالعناصر الغذائية لكن سهلة العمل.',
    icon: '🏜️',
    color: '#F5DEB3',
    drainage_rating: 'excellent',
    water_retention: 'low',
    suitable_crops: ['carrots', 'potatoes', 'onions', 'lettuce', 'peppers'],
    sort_order: 1,
    is_global: true,
  },
  {
    name: 'Clay Soil',
    name_fr: 'Sol argileux',
    name_ar: 'تربة طينية',
    value: 'clay',
    description: 'Heavy, dense soil that retains water and nutrients well. Can be difficult to work.',
    description_fr: 'Sol lourd et dense qui retient bien l\'eau et les nutriments. Peut être difficile à travailler.',
    description_ar: 'تربة ثقيلة وكثيفة تحتفظ بالماء والعناصر الغذائية جيداً. قد تكون صعبة العمل.',
    icon: '🧱',
    color: '#8B4513',
    drainage_rating: 'poor',
    water_retention: 'high',
    suitable_crops: ['cabbage', 'broccoli', 'beans', 'squash'],
    sort_order: 2,
    is_global: true,
  },
  {
    name: 'Loam Soil',
    name_fr: 'Sol limoneux',
    name_ar: 'تربة طفالية',
    value: 'loam',
    description: 'Ideal balanced soil with good drainage and nutrient retention. Best for most crops.',
    description_fr: 'Sol équilibré idéal avec bon drainage et rétention des nutriments. Meilleur pour la plupart des cultures.',
    description_ar: 'تربة متوازنة مثالية مع تصريف جيد واحتفاظ بالعناصر الغذائية. الأفضل لمعظم المحاصيل.',
    icon: '🌱',
    color: '#654321',
    drainage_rating: 'good',
    water_retention: 'medium',
    suitable_crops: ['tomatoes', 'corn', 'wheat', 'most vegetables'],
    sort_order: 3,
    is_global: true,
  },
  {
    name: 'Silt Soil',
    name_fr: 'Sol limoneux fin',
    name_ar: 'تربة غرينية',
    value: 'silt',
    description: 'Smooth, fine-grained soil that retains moisture. Fertile but can compact easily.',
    description_fr: 'Sol lisse à grains fins qui retient l\'humidité. Fertile mais peut se compacter facilement.',
    description_ar: 'تربة ناعمة دقيقة الحبيبات تحتفظ بالرطوبة. خصبة لكن قد تتراص بسهولة.',
    icon: '💧',
    color: '#696969',
    drainage_rating: 'moderate',
    water_retention: 'high',
    suitable_crops: ['vegetables', 'fruits', 'grasses'],
    sort_order: 4,
    is_global: true,
  },
  {
    name: 'Chalky Soil',
    name_fr: 'Sol calcaire',
    name_ar: 'تربة كلسية',
    value: 'chalky',
    description: 'Alkaline soil with calcium carbonate. May cause nutrient deficiencies in some plants.',
    description_fr: 'Sol alcalin avec carbonate de calcium. Peut causer des carences nutritionnelles.',
    description_ar: 'تربة قلوية تحتوي على كربونات الكالسيوم. قد تسبب نقص العناصر الغذائية.',
    icon: '⚪',
    color: '#F5F5F5',
    drainage_rating: 'good',
    water_retention: 'low',
    suitable_crops: ['spinach', 'beets', 'cabbage', 'lavender'],
    sort_order: 5,
    is_global: true,
  },
  {
    name: 'Peat Soil',
    name_fr: 'Sol tourbeux',
    name_ar: 'تربة خثية',
    value: 'peat',
    description: 'Dark, organic-rich soil. Acidic with high water retention. Excellent for acid-loving plants.',
    description_fr: 'Sol sombre riche en matière organique. Acide avec haute rétention d\'eau.',
    description_ar: 'تربة داكنة غنية بالمواد العضوية. حمضية مع احتفاظ عالي بالماء.',
    icon: '🟤',
    color: '#2F1810',
    drainage_rating: 'poor',
    water_retention: 'high',
    suitable_crops: ['blueberries', 'rhododendrons', 'heathers'],
    sort_order: 6,
    is_global: true,
  },
  {
    name: 'Sandy Loam',
    name_fr: 'Sol sablo-limoneux',
    name_ar: 'تربة رملية طفالية',
    value: 'sandy_loam',
    description: 'Well-draining soil with good workability. Suitable for most agricultural uses.',
    description_fr: 'Sol bien drainant et facile à travailler. Adapté à la plupart des usages agricoles.',
    description_ar: 'تربة جيدة التصريف وسهلة العمل. مناسبة لمعظم الاستخدامات الزراعية.',
    icon: '🏕️',
    color: '#D2B48C',
    drainage_rating: 'good',
    water_retention: 'medium',
    suitable_crops: ['strawberries', 'vegetables', 'citrus'],
    sort_order: 7,
    is_global: true,
  },
  {
    name: 'Clay Loam',
    name_fr: 'Sol argilo-limoneux',
    name_ar: 'تربة طينية طفالية',
    value: 'clay_loam',
    description: 'Rich, heavy soil with good moisture retention. Productive when well-managed.',
    description_fr: 'Sol riche et lourd avec bonne rétention d\'humidité. Productif quand bien géré.',
    description_ar: 'تربة غنية وثقيلة مع احتفاظ جيد بالرطوبة. منتجة عند الإدارة الجيدة.',
    icon: '🌾',
    color: '#8B7355',
    drainage_rating: 'moderate',
    water_retention: 'high',
    suitable_crops: ['wheat', 'rice', 'olives', 'fruit trees'],
    sort_order: 8,
    is_global: true,
  },
];

const irrigationTypes = [
  {
    name: 'Drip Irrigation',
    name_fr: 'Irrigation goutte à goutte',
    name_ar: 'الري بالتنقيط',
    value: 'drip',
    description: 'Water delivered directly to plant roots through a network of tubes and emitters.',
    description_fr: 'Eau délivrée directement aux racines par un réseau de tubes et goutteurs.',
    description_ar: 'توصيل المياه مباشرة لجذور النباتات عبر شبكة من الأنابيب والنقاطات.',
    icon: '💧',
    color: '#4169E1',
    water_efficiency: 'very_high',
    initial_cost: 'high',
    maintenance_level: 'medium',
    suitable_for: ['orchards', 'vegetables', 'vineyards', 'greenhouses'],
    sort_order: 1,
    is_global: true,
  },
  {
    name: 'Sprinkler Irrigation',
    name_fr: 'Irrigation par aspersion',
    name_ar: 'الري بالرش',
    value: 'sprinkler',
    description: 'Water sprayed through the air to simulate rainfall over crops.',
    description_fr: 'Eau pulvérisée dans l\'air pour simuler la pluie sur les cultures.',
    description_ar: 'رش المياه في الهواء لمحاكاة المطر فوق المحاصيل.',
    icon: '🌧️',
    color: '#1E90FF',
    water_efficiency: 'medium',
    initial_cost: 'medium',
    maintenance_level: 'medium',
    suitable_for: ['cereals', 'pastures', 'large fields', 'lawns'],
    sort_order: 2,
    is_global: true,
  },
  {
    name: 'Flood Irrigation',
    name_fr: 'Irrigation par submersion',
    name_ar: 'الري بالغمر',
    value: 'flood',
    description: 'Traditional method where water flows across the field surface.',
    description_fr: 'Méthode traditionnelle où l\'eau s\'écoule sur la surface du champ.',
    description_ar: 'الطريقة التقليدية حيث تتدفق المياه عبر سطح الحقل.',
    icon: '🌊',
    color: '#00CED1',
    water_efficiency: 'low',
    initial_cost: 'low',
    maintenance_level: 'low',
    suitable_for: ['rice', 'pastures', 'level fields'],
    sort_order: 3,
    is_global: true,
  },
  {
    name: 'Furrow Irrigation',
    name_fr: 'Irrigation par sillons',
    name_ar: 'الري بالأخاديد',
    value: 'furrow',
    description: 'Water flows through small channels between crop rows.',
    description_fr: 'L\'eau s\'écoule dans de petits canaux entre les rangs de culture.',
    description_ar: 'تدفق المياه عبر قنوات صغيرة بين صفوف المحاصيل.',
    icon: '〰️',
    color: '#48D1CC',
    water_efficiency: 'medium',
    initial_cost: 'low',
    maintenance_level: 'low',
    suitable_for: ['row crops', 'vegetables', 'orchards'],
    sort_order: 4,
    is_global: true,
  },
  {
    name: 'Center Pivot',
    name_fr: 'Pivot central',
    name_ar: 'الري المحوري',
    value: 'center_pivot',
    description: 'Rotating equipment pivots around a central point to irrigate circular areas.',
    description_fr: 'Équipement rotatif pivotant autour d\'un point central pour irriguer des zones circulaires.',
    description_ar: 'معدات دوارة تدور حول نقطة مركزية لري مناطق دائرية.',
    icon: '🔄',
    color: '#32CD32',
    water_efficiency: 'high',
    initial_cost: 'high',
    maintenance_level: 'high',
    suitable_for: ['large farms', 'cereals', 'potatoes', 'corn'],
    sort_order: 5,
    is_global: true,
  },
  {
    name: 'Micro-sprinkler',
    name_fr: 'Micro-aspersion',
    name_ar: 'الري بالرش الدقيق',
    value: 'micro_sprinkler',
    description: 'Small sprinklers that provide localized water distribution.',
    description_fr: 'Petits asperseurs fournissant une distribution d\'eau localisée.',
    description_ar: 'رشاشات صغيرة توفر توزيع مياه موضعي.',
    icon: '💦',
    color: '#87CEEB',
    water_efficiency: 'high',
    initial_cost: 'medium',
    maintenance_level: 'medium',
    suitable_for: ['orchards', 'nurseries', 'vegetables'],
    sort_order: 6,
    is_global: true,
  },
  {
    name: 'Subsurface Drip',
    name_fr: 'Goutte à goutte enterré',
    name_ar: 'الري بالتنقيط تحت السطحي',
    value: 'subsurface_drip',
    description: 'Drip lines buried below soil surface for minimal evaporation loss.',
    description_fr: 'Lignes de goutte enterrées sous la surface du sol pour une évaporation minimale.',
    description_ar: 'خطوط تنقيط مدفونة تحت سطح التربة لتقليل التبخر.',
    icon: '⬇️',
    color: '#4682B4',
    water_efficiency: 'very_high',
    initial_cost: 'high',
    maintenance_level: 'high',
    suitable_for: ['permanent crops', 'high-value vegetables', 'orchards'],
    sort_order: 7,
    is_global: true,
  },
  {
    name: 'Manual/Traditional',
    name_fr: 'Manuel/Traditionnel',
    name_ar: 'يدوي/تقليدي',
    value: 'manual',
    description: 'Hand watering using buckets, hoses, or simple gravity systems.',
    description_fr: 'Arrosage à la main avec seaux, tuyaux ou systèmes gravitaires simples.',
    description_ar: 'الري يدوياً باستخدام الدلاء أو الخراطيم أو أنظمة الجاذبية البسيطة.',
    icon: '🪣',
    color: '#A0522D',
    water_efficiency: 'low',
    initial_cost: 'low',
    maintenance_level: 'low',
    suitable_for: ['small gardens', 'seedlings', 'container plants'],
    sort_order: 8,
    is_global: true,
  },
];

const treeCategories = [
  {
    name: 'Citrus',
    name_fr: 'Agrumes',
    name_ar: 'الحمضيات',
    value: 'citrus',
    description: 'Citrus fruit trees including oranges, lemons, and grapefruits.',
    description_fr: 'Arbres fruitiers d\'agrumes incluant oranges, citrons et pamplemousses.',
    description_ar: 'أشجار الفواكه الحمضية بما في ذلك البرتقال والليمون والجريب فروت.',
    icon: '🍊',
    color: '#FFA500',
    sort_order: 1,
    is_global: true,
  },
  {
    name: 'Stone Fruits',
    name_fr: 'Fruits à noyau',
    name_ar: 'الفواكه ذات النواة',
    value: 'stone_fruits',
    description: 'Drupes including peaches, plums, cherries, and apricots.',
    description_fr: 'Drupes incluant pêches, prunes, cerises et abricots.',
    description_ar: 'الفواكه ذات النواة بما في ذلك الخوخ والبرقوق والكرز والمشمش.',
    icon: '🍑',
    color: '#FFDAB9',
    sort_order: 2,
    is_global: true,
  },
  {
    name: 'Olives',
    name_fr: 'Oliviers',
    name_ar: 'الزيتون',
    value: 'olives',
    description: 'Olive trees for oil and table olives.',
    description_fr: 'Oliviers pour huile et olives de table.',
    description_ar: 'أشجار الزيتون للزيت وزيتون المائدة.',
    icon: '🫒',
    color: '#6B8E23',
    sort_order: 3,
    is_global: true,
  },
  {
    name: 'Nuts',
    name_fr: 'Fruits à coque',
    name_ar: 'المكسرات',
    value: 'nuts',
    description: 'Nut-bearing trees including almonds, walnuts, and pistachios.',
    description_fr: 'Arbres à noix incluant amandiers, noyers et pistachiers.',
    description_ar: 'الأشجار المثمرة للمكسرات بما في ذلك اللوز والجوز والفستق.',
    icon: '🥜',
    color: '#DEB887',
    sort_order: 4,
    is_global: true,
  },
  {
    name: 'Tropical',
    name_fr: 'Tropicaux',
    name_ar: 'الاستوائية',
    value: 'tropical',
    description: 'Tropical fruit trees including avocados, mangoes, and bananas.',
    description_fr: 'Arbres fruitiers tropicaux incluant avocats, mangues et bananes.',
    description_ar: 'أشجار الفواكه الاستوائية بما في ذلك الأفوكادو والمانجو والموز.',
    icon: '🥭',
    color: '#FF6347',
    sort_order: 5,
    is_global: true,
  },
  {
    name: 'Pome Fruits',
    name_fr: 'Fruits à pépins',
    name_ar: 'الفواكه ذات البذور',
    value: 'pome_fruits',
    description: 'Pome fruits including apples, pears, and quinces.',
    description_fr: 'Fruits à pépins incluant pommes, poires et coings.',
    description_ar: 'الفواكه ذات البذور بما في ذلك التفاح والإجاص والسفرجل.',
    icon: '🍎',
    color: '#DC143C',
    sort_order: 6,
    is_global: true,
  },
  {
    name: 'Dates',
    name_fr: 'Palmiers dattiers',
    name_ar: 'النخيل',
    value: 'dates',
    description: 'Date palm trees.',
    description_fr: 'Palmiers dattiers.',
    description_ar: 'أشجار النخيل.',
    icon: '🌴',
    color: '#8B4513',
    sort_order: 7,
    is_global: true,
  },
  {
    name: 'Argan',
    name_fr: 'Arganiers',
    name_ar: 'الأركان',
    value: 'argan',
    description: 'Argan trees native to Morocco.',
    description_fr: 'Arganiers originaires du Maroc.',
    description_ar: 'أشجار الأركان الأصلية في المغرب.',
    icon: '🌳',
    color: '#556B2F',
    sort_order: 8,
    is_global: true,
  },
];

const trees = [
  { name: 'Orange', name_fr: 'Oranger', name_ar: 'برتقال', value: 'orange', scientific_name: 'Citrus sinensis', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', category: 'citrus', sort_order: 1 },
  { name: 'Lemon', name_fr: 'Citronnier', name_ar: 'ليمون', value: 'lemon', scientific_name: 'Citrus limon', icon: '🍋', water_requirements: 'medium', growth_rate: 'medium', category: 'citrus', sort_order: 2 },
  { name: 'Clementine', name_fr: 'Clémentinier', name_ar: 'كلمنتين', value: 'clementine', scientific_name: 'Citrus clementina', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', category: 'citrus', sort_order: 3 },
  { name: 'Grapefruit', name_fr: 'Pamplemoussier', name_ar: 'جريب فروت', value: 'grapefruit', scientific_name: 'Citrus paradisi', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', category: 'citrus', sort_order: 4 },
  { name: 'Olive', name_fr: 'Olivier', name_ar: 'زيتون', value: 'olive', scientific_name: 'Olea europaea', icon: '🫒', water_requirements: 'low', growth_rate: 'slow', category: 'olives', sort_order: 1 },
  { name: 'Almond', name_fr: 'Amandier', name_ar: 'لوز', value: 'almond', scientific_name: 'Prunus dulcis', icon: '🥜', water_requirements: 'low', growth_rate: 'medium', category: 'nuts', sort_order: 1 },
  { name: 'Walnut', name_fr: 'Noyer', name_ar: 'جوز', value: 'walnut', scientific_name: 'Juglans regia', icon: '🥜', water_requirements: 'medium', growth_rate: 'medium', category: 'nuts', sort_order: 2 },
  { name: 'Apple', name_fr: 'Pommier', name_ar: 'تفاح', value: 'apple', scientific_name: 'Malus domestica', icon: '🍎', water_requirements: 'medium', growth_rate: 'medium', category: 'pome_fruits', sort_order: 1 },
  { name: 'Pear', name_fr: 'Poirier', name_ar: 'إجاص', value: 'pear', scientific_name: 'Pyrus communis', icon: '🍐', water_requirements: 'medium', growth_rate: 'medium', category: 'pome_fruits', sort_order: 2 },
  { name: 'Peach', name_fr: 'Pêcher', name_ar: 'خوخ', value: 'peach', scientific_name: 'Prunus persica', icon: '🍑', water_requirements: 'medium', growth_rate: 'fast', category: 'stone_fruits', sort_order: 1 },
  { name: 'Apricot', name_fr: 'Abricotier', name_ar: 'مشمش', value: 'apricot', scientific_name: 'Prunus armeniaca', icon: '🍑', water_requirements: 'medium', growth_rate: 'medium', category: 'stone_fruits', sort_order: 2 },
  { name: 'Cherry', name_fr: 'Cerisier', name_ar: 'كرز', value: 'cherry', scientific_name: 'Prunus avium', icon: '🍒', water_requirements: 'medium', growth_rate: 'medium', category: 'stone_fruits', sort_order: 3 },
  { name: 'Avocado', name_fr: 'Avocatier', name_ar: 'أفوكادو', value: 'avocado', scientific_name: 'Persea americana', icon: '🥑', water_requirements: 'high', growth_rate: 'fast', category: 'tropical', sort_order: 1 },
  { name: 'Date Palm', name_fr: 'Palmier dattier', name_ar: 'نخيل التمر', value: 'date_palm', scientific_name: 'Phoenix dactylifera', icon: '🌴', water_requirements: 'medium', growth_rate: 'slow', category: 'dates', sort_order: 1 },
  { name: 'Argan', name_fr: 'Arganier', name_ar: 'أركان', value: 'argan', scientific_name: 'Argania spinosa', icon: '🌳', water_requirements: 'low', growth_rate: 'slow', category: 'argan', sort_order: 1 },
  { name: 'Fig', name_fr: 'Figuier', name_ar: 'تين', value: 'fig', scientific_name: 'Ficus carica', icon: '🥝', water_requirements: 'low', growth_rate: 'fast', category: 'tropical', sort_order: 2 },
  { name: 'Pomegranate', name_fr: 'Grenadier', name_ar: 'رمان', value: 'pomegranate', scientific_name: 'Punica granatum', icon: '🍎', water_requirements: 'low', growth_rate: 'medium', category: 'tropical', sort_order: 3 },
];

const cropCategories = [
  { name: 'Cereals', name_fr: 'Céréales', name_ar: 'الحبوب', value: 'cereals', icon: '🌾', color: '#DAA520', sort_order: 1, is_global: true },
  { name: 'Vegetables', name_fr: 'Légumes', name_ar: 'الخضروات', value: 'vegetables', icon: '🥬', color: '#228B22', sort_order: 2, is_global: true },
  { name: 'Legumes', name_fr: 'Légumineuses', name_ar: 'البقوليات', value: 'legumes', icon: '🫘', color: '#8B4513', sort_order: 3, is_global: true },
  { name: 'Oilseeds', name_fr: 'Oléagineux', name_ar: 'البذور الزيتية', value: 'oilseeds', icon: '🌻', color: '#FFD700', sort_order: 4, is_global: true },
  { name: 'Fodder', name_fr: 'Fourrage', name_ar: 'العلف', value: 'fodder', icon: '🌿', color: '#32CD32', sort_order: 5, is_global: true },
  { name: 'Industrial Crops', name_fr: 'Cultures industrielles', name_ar: 'المحاصيل الصناعية', value: 'industrial', icon: '🏭', color: '#708090', sort_order: 6, is_global: true },
];

const cropTypes = [
  { name: 'Wheat', name_fr: 'Blé', name_ar: 'قمح', value: 'wheat', scientific_name: 'Triticum aestivum', icon: '🌾', category: 'cereals', water_requirements: 'medium', growth_cycle_days: 120, sort_order: 1 },
  { name: 'Barley', name_fr: 'Orge', name_ar: 'شعير', value: 'barley', scientific_name: 'Hordeum vulgare', icon: '🌾', category: 'cereals', water_requirements: 'low', growth_cycle_days: 90, sort_order: 2 },
  { name: 'Corn', name_fr: 'Maïs', name_ar: 'ذرة', value: 'corn', scientific_name: 'Zea mays', icon: '🌽', category: 'cereals', water_requirements: 'high', growth_cycle_days: 100, sort_order: 3 },
  { name: 'Tomato', name_fr: 'Tomate', name_ar: 'طماطم', value: 'tomato', scientific_name: 'Solanum lycopersicum', icon: '🍅', category: 'vegetables', water_requirements: 'high', growth_cycle_days: 80, sort_order: 1 },
  { name: 'Potato', name_fr: 'Pomme de terre', name_ar: 'بطاطا', value: 'potato', scientific_name: 'Solanum tuberosum', icon: '🥔', category: 'vegetables', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 2 },
  { name: 'Onion', name_fr: 'Oignon', name_ar: 'بصل', value: 'onion', scientific_name: 'Allium cepa', icon: '🧅', category: 'vegetables', water_requirements: 'medium', growth_cycle_days: 120, sort_order: 3 },
  { name: 'Carrot', name_fr: 'Carotte', name_ar: 'جزر', value: 'carrot', scientific_name: 'Daucus carota', icon: '🥕', category: 'vegetables', water_requirements: 'medium', growth_cycle_days: 75, sort_order: 4 },
  { name: 'Chickpea', name_fr: 'Pois chiche', name_ar: 'حمص', value: 'chickpea', scientific_name: 'Cicer arietinum', icon: '🫘', category: 'legumes', water_requirements: 'low', growth_cycle_days: 100, sort_order: 1 },
  { name: 'Lentil', name_fr: 'Lentille', name_ar: 'عدس', value: 'lentil', scientific_name: 'Lens culinaris', icon: '🫘', category: 'legumes', water_requirements: 'low', growth_cycle_days: 80, sort_order: 2 },
  { name: 'Fava Bean', name_fr: 'Fève', name_ar: 'فول', value: 'fava_bean', scientific_name: 'Vicia faba', icon: '🫘', category: 'legumes', water_requirements: 'medium', growth_cycle_days: 90, sort_order: 3 },
  { name: 'Sunflower', name_fr: 'Tournesol', name_ar: 'عباد الشمس', value: 'sunflower', scientific_name: 'Helianthus annuus', icon: '🌻', category: 'oilseeds', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 1 },
  { name: 'Alfalfa', name_fr: 'Luzerne', name_ar: 'فصة', value: 'alfalfa', scientific_name: 'Medicago sativa', icon: '🌿', category: 'fodder', water_requirements: 'high', growth_cycle_days: 60, sort_order: 1 },
  { name: 'Sugar Beet', name_fr: 'Betterave sucrière', name_ar: 'شمندر سكري', value: 'sugar_beet', scientific_name: 'Beta vulgaris', icon: '🟣', category: 'industrial', water_requirements: 'medium', growth_cycle_days: 180, sort_order: 1 },
];

async function seedTrees(categories) {
  console.log('\nSeeding trees with category relations...');
  
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const tree of trees) {
    try {
      const existing = await apiRequest(`/trees?filters[value][$eq]=${encodeURIComponent(tree.value)}`);
      
      if (existing.data && existing.data.length > 0) {
        skipped++;
        continue;
      }

      const categoryId = categories[tree.category];
      const treeData = {
        name: tree.name,
        name_fr: tree.name_fr,
        name_ar: tree.name_ar,
        value: tree.value,
        scientific_name: tree.scientific_name,
        icon: tree.icon,
        water_requirements: tree.water_requirements,
        growth_rate: tree.growth_rate,
        sort_order: tree.sort_order,
        is_global: true,
      };
      
      if (categoryId) {
        treeData.tree_category = categoryId;
      }

      await apiRequest('/trees', 'POST', treeData);
      created++;
      console.log(`  + ${tree.name}`);
    } catch (error) {
      console.error(`  x Failed: ${tree.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`  Summary: ${created} created, ${skipped} skipped, ${failed} failed`);
  return { created, skipped, failed };
}

async function seedCropTypes(categories) {
  console.log('\nSeeding crop types with category relations...');
  
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const crop of cropTypes) {
    try {
      const existing = await apiRequest(`/crop-types?filters[value][$eq]=${encodeURIComponent(crop.value)}`);
      
      if (existing.data && existing.data.length > 0) {
        skipped++;
        continue;
      }

      const categoryId = categories[crop.category];
      const cropData = {
        name: crop.name,
        name_fr: crop.name_fr,
        name_ar: crop.name_ar,
        value: crop.value,
        scientific_name: crop.scientific_name,
        icon: crop.icon,
        water_requirements: crop.water_requirements,
        growth_cycle_days: crop.growth_cycle_days,
        sort_order: crop.sort_order,
        is_global: true,
      };
      
      if (categoryId) {
        cropData.crop_category = categoryId;
      }

      await apiRequest('/crop-types', 'POST', cropData);
      created++;
      console.log(`  + ${crop.name}`);
    } catch (error) {
      console.error(`  x Failed: ${crop.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`  Summary: ${created} created, ${skipped} skipped, ${failed} failed`);
  return { created, skipped, failed };
}

async function main() {
  console.log('='.repeat(60));
  console.log('AgriTech Agronomy Reference Data Seeder');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Token: ${API_TOKEN.substring(0, 10)}...`);

  try {
    await seedCollection('soil-types', soilTypes);
    await seedCollection('irrigation-types', irrigationTypes);
    
    await seedCollection('tree-categories', treeCategories);
    
    const treeCatResponse = await apiRequest('/tree-categories');
    const treeCategoryMap = {};
    for (const cat of treeCatResponse.data || []) {
      treeCategoryMap[cat.attributes?.value || cat.value] = cat.id;
    }
    await seedTrees(treeCategoryMap);
    
    await seedCollection('crop-categories', cropCategories);
    
    const cropCatResponse = await apiRequest('/crop-categories');
    const cropCategoryMap = {};
    for (const cat of cropCatResponse.data || []) {
      cropCategoryMap[cat.attributes?.value || cat.value] = cat.id;
    }
    await seedCropTypes(cropCategoryMap);

    console.log('\n' + '='.repeat(60));
    console.log('Seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Go to Strapi Admin: http://localhost:1337/admin');
    console.log('2. Verify the reference data in Content Manager');
    console.log('3. Configure API permissions for public access if needed');
    console.log('4. Restart your NestJS API to fetch new data');

  } catch (error) {
    console.error('\nSeeding failed:', error.message);
    process.exit(1);
  }
}

main();
