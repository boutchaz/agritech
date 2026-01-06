/**
 * Planting System Data for CMS Seeding
 * Based on /project/src/lib/plantingSystemData.ts
 * 
 * This file contains the data structures needed to seed the CMS
 * with crop categories, crop types, and varieties from plantingSystemData.ts
 */

// Crop Categories from plantingSystemData.ts
export const cropCategoriesFromPlantingData = [
  { 
    name: 'Trees', 
    name_fr: 'Arbres fruitiers', 
    name_ar: 'أشجار الفاكهة', 
    value: 'trees', 
    icon: '🌳', 
    sort_order: 1, 
    is_global: true 
  },
  { 
    name: 'Cereals', 
    name_fr: 'Céréales', 
    name_ar: 'الحبوب', 
    value: 'cereals', 
    icon: '🌾', 
    sort_order: 2, 
    is_global: true 
  },
  { 
    name: 'Vegetables', 
    name_fr: 'Légumes', 
    name_ar: 'الخضروات', 
    value: 'vegetables', 
    icon: '🥬', 
    sort_order: 3, 
    is_global: true 
  },
  { 
    name: 'Other', 
    name_fr: 'Autre', 
    name_ar: 'أخرى', 
    value: 'other', 
    icon: '🌱', 
    sort_order: 4, 
    is_global: true 
  },
];

// Tree types from TREE_CATEGORIES
export const treeTypesFromPlantingData = [
  // Arbres fruitiers à noyau
  { name: 'Olivier', name_fr: 'Olivier', name_ar: 'الزيتون', value: 'olivier', category: 'trees', sort_order: 1 },
  { name: 'Pêcher', name_fr: 'Pêcher', name_ar: 'الخوخ', value: 'pecher', category: 'trees', sort_order: 2 },
  { name: 'Abricotier', name_fr: 'Abricotier', name_ar: 'المشمش', value: 'abricotier', category: 'trees', sort_order: 3 },
  { name: 'Prunier', name_fr: 'Prunier', name_ar: 'البرقوق', value: 'prunier', category: 'trees', sort_order: 4 },
  { name: 'Cerisier', name_fr: 'Cerisier', name_ar: 'الكرز', value: 'cerisier', category: 'trees', sort_order: 5 },
  { name: 'Amandier', name_fr: 'Amandier', name_ar: 'اللوز', value: 'amandier', category: 'trees', sort_order: 6 },
  { name: 'Nectarine', name_fr: 'Nectarine', name_ar: 'النكتارين', value: 'nectarine', category: 'trees', sort_order: 7 },
  { name: 'Arganier', name_fr: 'Arganier', name_ar: 'الأركان', value: 'arganier', category: 'trees', sort_order: 8 },
  // Arbres fruitiers à pépins
  { name: 'Pommier', name_fr: 'Pommier', name_ar: 'التفاح', value: 'pommier', category: 'trees', sort_order: 10 },
  { name: 'Poirier', name_fr: 'Poirier', name_ar: 'الإجاص', value: 'poirier', category: 'trees', sort_order: 11 },
  { name: 'Cognassier', name_fr: 'Cognassier', name_ar: 'السفرجل', value: 'cognassier', category: 'trees', sort_order: 12 },
  { name: 'Nashi', name_fr: 'Nashi', name_ar: 'الناشي', value: 'nashi', category: 'trees', sort_order: 13 },
  // Agrumes
  { name: 'Oranger', name_fr: 'Oranger', name_ar: 'البرتقال', value: 'oranger', category: 'trees', sort_order: 20 },
  { name: 'Mandariner', name_fr: 'Mandariner', name_ar: 'اليوسفي', value: 'mandariner', category: 'trees', sort_order: 21 },
  { name: 'Citronnier', name_fr: 'Citronnier', name_ar: 'الليمون', value: 'citronnier', category: 'trees', sort_order: 22 },
  { name: 'Pamplemoussier', name_fr: 'Pamplemoussier', name_ar: 'الجريب فروت', value: 'pamplemoussier', category: 'trees', sort_order: 23 },
  { name: 'Pomelo', name_fr: 'Pomelo', name_ar: 'البوميلو', value: 'pomelo', category: 'trees', sort_order: 24 },
  { name: 'Combava', name_fr: 'Combava', name_ar: 'الكمبافا', value: 'combava', category: 'trees', sort_order: 25 },
  { name: 'Cédratier', name_fr: 'Cédratier', name_ar: 'السيدرات', value: 'cedratier', category: 'trees', sort_order: 26 },
  // Arbres tropicaux et subtropicaux
  { name: 'Avocatier', name_fr: 'Avocatier', name_ar: 'الأفوكادو', value: 'avocatier', category: 'trees', sort_order: 30 },
  { name: 'Manguier', name_fr: 'Manguier', name_ar: 'المانجو', value: 'manguier', category: 'trees', sort_order: 31 },
  { name: 'Litchi', name_fr: 'Litchi', name_ar: 'الليتشي', value: 'litchi', category: 'trees', sort_order: 32 },
  { name: 'Longanier', name_fr: 'Longanier', name_ar: 'اللونجان', value: 'longanier', category: 'trees', sort_order: 33 },
  { name: 'Ramboutan', name_fr: 'Ramboutan', name_ar: 'الرامبوتان', value: 'ramboutan', category: 'trees', sort_order: 34 },
  { name: 'Garambolier', name_fr: 'Garambolier', name_ar: 'الجرامبولي', value: 'garambolier', category: 'trees', sort_order: 35 },
  { name: 'Goyavier', name_fr: 'Goyavier', name_ar: 'الجوافة', value: 'goyavier', category: 'trees', sort_order: 36 },
  { name: 'Coroddolier', name_fr: 'Coroddolier', name_ar: 'الكورودولي', value: 'coroddolier', category: 'trees', sort_order: 37 },
  { name: 'Cherimolier', name_fr: 'Cherimolier', name_ar: 'الشيريمويا', value: 'cherimolier', category: 'trees', sort_order: 38 },
  { name: 'Sapotillier', name_fr: 'Sapotillier', name_ar: 'السابوتيلا', value: 'sapotillier', category: 'trees', sort_order: 39 },
  { name: 'Jacquier', name_fr: 'Jacquier', name_ar: 'الجاك فروت', value: 'jacquier', category: 'trees', sort_order: 40 },
  { name: 'Durian', name_fr: 'Durian', name_ar: 'الدوريان', value: 'durian', category: 'trees', sort_order: 41 },
  { name: 'Papayer', name_fr: 'Papayer', name_ar: 'البابايا', value: 'papayer', category: 'trees', sort_order: 42 },
  { name: 'Bananiers', name_fr: 'Bananiers', name_ar: 'الموز', value: 'bananiers', category: 'trees', sort_order: 43 },
  // Arbres à fruits secs
  { name: 'Noyer', name_fr: 'Noyer', name_ar: 'الجوز', value: 'noyer', category: 'trees', sort_order: 50 },
  { name: 'Châtaignier', name_fr: 'Châtaignier', name_ar: 'الكستناء', value: 'chataignier', category: 'trees', sort_order: 51 },
  { name: 'Noisetier', name_fr: 'Noisetier', name_ar: 'البندق', value: 'noisetier', category: 'trees', sort_order: 52 },
  { name: 'Pistachier', name_fr: 'Pistachier', name_ar: 'الفستق', value: 'pistachier', category: 'trees', sort_order: 53 },
  { name: 'Macadamia', name_fr: 'Macadamia', name_ar: 'المكاديميا', value: 'macadamia', category: 'trees', sort_order: 54 },
  { name: 'Cacaoyer', name_fr: 'Cacaoyer', name_ar: 'الكاكاو', value: 'cacaoyer', category: 'trees', sort_order: 55 },
  { name: 'Caféier', name_fr: 'Caféier', name_ar: 'البن', value: 'cafeier', category: 'trees', sort_order: 56 },
  // Vigne et assimilés
  { name: 'Vigne', name_fr: 'Vigne', name_ar: 'العنب', value: 'vigne', category: 'trees', sort_order: 60 },
  { name: 'Kiwier', name_fr: 'Kiwier', name_ar: 'الكيوي', value: 'kiwier', category: 'trees', sort_order: 61 },
  { name: 'Grenadier', name_fr: 'Grenadier', name_ar: 'الرمان', value: 'grenadier', category: 'trees', sort_order: 62 },
  { name: 'Figuier', name_fr: 'Figuier', name_ar: 'التين', value: 'figuier', category: 'trees', sort_order: 63 },
  { name: 'Murier', name_fr: 'Murier', name_ar: 'التوت', value: 'murier', category: 'trees', sort_order: 64 },
  // Palmacées fruitières
  { name: 'Palmier dattier', name_fr: 'Palmier dattier', name_ar: 'نخيل التمر', value: 'palmier_dattier', category: 'trees', sort_order: 70 },
  { name: 'Cocotier', name_fr: 'Cocotier', name_ar: 'جوز الهند', value: 'cocotier', category: 'trees', sort_order: 71 },
  { name: 'Palmier à huile', name_fr: 'Palmier à huile', name_ar: 'نخيل الزيت', value: 'palmier_huile', category: 'trees', sort_order: 72 },
  { name: 'Açaï', name_fr: 'Açaï', name_ar: 'الأكاي', value: 'acai', category: 'trees', sort_order: 73 },
];

// Cereal crops from CEREAL_CROPS
export const cerealCropsFromPlantingData = [
  { name: 'Blé tendre', name_fr: 'Blé tendre', name_ar: 'القمح اللين', value: 'ble_tendre', category: 'cereals', sort_order: 1 },
  { name: 'Blé dur', name_fr: 'Blé dur', name_ar: 'القمح الصلب', value: 'ble_dur', category: 'cereals', sort_order: 2 },
  { name: 'Orge', name_fr: 'Orge', name_ar: 'الشعير', value: 'orge', category: 'cereals', sort_order: 3 },
  { name: 'Maïs', name_fr: 'Maïs', name_ar: 'الذرة', value: 'mais', category: 'cereals', sort_order: 4 },
  { name: 'Avoine', name_fr: 'Avoine', name_ar: 'الشوفان', value: 'avoine', category: 'cereals', sort_order: 5 },
  { name: 'Seigle', name_fr: 'Seigle', name_ar: 'الجاودار', value: 'seigle', category: 'cereals', sort_order: 6 },
  { name: 'Riz', name_fr: 'Riz', name_ar: 'الأرز', value: 'riz', category: 'cereals', sort_order: 7 },
  { name: 'Sorgho', name_fr: 'Sorgho', name_ar: 'الذرة الرفيعة', value: 'sorgho', category: 'cereals', sort_order: 8 },
  { name: 'Millet', name_fr: 'Millet', name_ar: 'الدخن', value: 'millet', category: 'cereals', sort_order: 9 },
  { name: 'Triticale', name_fr: 'Triticale', name_ar: 'التريتيكال', value: 'triticale', category: 'cereals', sort_order: 10 },
];

// Vegetable crops from VEGETABLE_CROPS
export const vegetableCropsFromPlantingData = [
  { name: 'Tomate', name_fr: 'Tomate', name_ar: 'الطماطم', value: 'tomate', category: 'vegetables', sort_order: 1 },
  { name: 'Pomme de terre', name_fr: 'Pomme de terre', name_ar: 'البطاطس', value: 'pomme_de_terre', category: 'vegetables', sort_order: 2 },
  { name: 'Oignon', name_fr: 'Oignon', name_ar: 'البصل', value: 'oignon', category: 'vegetables', sort_order: 3 },
  { name: 'Carotte', name_fr: 'Carotte', name_ar: 'الجزر', value: 'carotte', category: 'vegetables', sort_order: 4 },
  { name: 'Poivron', name_fr: 'Poivron', name_ar: 'الفلفل', value: 'poivron', category: 'vegetables', sort_order: 5 },
  { name: 'Aubergine', name_fr: 'Aubergine', name_ar: 'الباذنجان', value: 'aubergine', category: 'vegetables', sort_order: 6 },
  { name: 'Courgette', name_fr: 'Courgette', name_ar: 'الكوسة', value: 'courgette', category: 'vegetables', sort_order: 7 },
  { name: 'Concombre', name_fr: 'Concombre', name_ar: 'الخيار', value: 'concombre', category: 'vegetables', sort_order: 8 },
  { name: 'Laitue', name_fr: 'Laitue', name_ar: 'الخس', value: 'laitue', category: 'vegetables', sort_order: 9 },
  { name: 'Chou', name_fr: 'Chou', name_ar: 'الملفوف', value: 'chou', category: 'vegetables', sort_order: 10 },
  { name: 'Haricot vert', name_fr: 'Haricot vert', name_ar: 'الفاصوليا الخضراء', value: 'haricot_vert', category: 'vegetables', sort_order: 11 },
  { name: 'Petit pois', name_fr: 'Petit pois', name_ar: 'البازلاء', value: 'petit_pois', category: 'vegetables', sort_order: 12 },
  { name: 'Artichaut', name_fr: 'Artichaut', name_ar: 'الخرشوف', value: 'artichaut', category: 'vegetables', sort_order: 13 },
  { name: 'Betterave', name_fr: 'Betterave', name_ar: 'الشمندر', value: 'betterave', category: 'vegetables', sort_order: 14 },
  { name: 'Navet', name_fr: 'Navet', name_ar: 'اللفت', value: 'navet', category: 'vegetables', sort_order: 15 },
  { name: 'Radis', name_fr: 'Radis', name_ar: 'الفجل', value: 'radis', category: 'vegetables', sort_order: 16 },
  { name: 'Épinard', name_fr: 'Épinard', name_ar: 'السبانخ', value: 'epinard', category: 'vegetables', sort_order: 17 },
  { name: 'Persil', name_fr: 'Persil', name_ar: 'البقدونس', value: 'persil', category: 'vegetables', sort_order: 18 },
  { name: 'Coriandre', name_fr: 'Coriandre', name_ar: 'الكزبرة', value: 'coriandre', category: 'vegetables', sort_order: 19 },
  { name: 'Menthe', name_fr: 'Menthe', name_ar: 'النعناع', value: 'menthe', category: 'vegetables', sort_order: 20 },
];

// Olive varieties from OLIVE_VARIETIES with yield data
export const oliveVarietiesFromPlantingData = [
  {
    name: 'Arbequine',
    name_fr: 'Arbequine',
    name_ar: 'أربيكين',
    value: 'arbequine',
    origin: 'Espagne',
    main_use: 'Huile',
    characteristics: {
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
    sort_order: 1,
  },
  {
    name: 'Arbosana',
    name_fr: 'Arbosana',
    name_ar: 'أربوسانا',
    value: 'arbosana',
    origin: 'Espagne',
    main_use: 'Huile',
    characteristics: {
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
    sort_order: 2,
  },
  {
    name: 'Menara/Haouzia',
    name_fr: 'Menara/Haouzia',
    name_ar: 'المنارة/الحوزية',
    value: 'menara_haouzia',
    origin: 'Maroc',
    main_use: 'Huile et fruit',
    characteristics: {
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
    sort_order: 3,
  },
  {
    name: 'Picholine marocaine',
    name_fr: 'Picholine marocaine',
    name_ar: 'بيشولين مغربية',
    value: 'picholine_marocaine',
    origin: 'Maroc',
    main_use: 'Huile et fruit',
    characteristics: {
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
    sort_order: 4,
  },
  {
    name: 'Picholine languedoc',
    name_fr: 'Picholine languedoc',
    name_ar: 'بيشولين لانغدوك',
    value: 'picholine_languedoc',
    origin: 'France',
    main_use: 'Huile et fruit',
    characteristics: {
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
    sort_order: 5,
  },
  {
    name: 'Picholine languedoc herbassé',
    name_fr: 'Picholine languedoc herbassé',
    name_ar: 'بيشولين لانغدوك عشبي',
    value: 'picholine_languedoc_herbasse',
    origin: 'France',
    main_use: 'Huile et fruit',
    characteristics: {
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
    sort_order: 6,
  },
  {
    name: 'Koroneiki',
    name_fr: 'Koroneiki',
    name_ar: 'كورونيكي',
    value: 'koroneiki',
    origin: 'Grèce',
    main_use: 'Huile et fruit',
    characteristics: {
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
    sort_order: 7,
  },
  {
    name: 'Meslala',
    name_fr: 'Meslala',
    name_ar: 'المسلالة',
    value: 'meslala',
    origin: 'Maroc',
    main_use: 'Fruit',
    characteristics: {
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
    sort_order: 8,
  },
];

