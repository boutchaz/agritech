import type { Core } from '@strapi/strapi';
import {
  cropCategoriesFromPlantingData,
  treeTypesFromPlantingData,
  cerealCropsFromPlantingData,
  vegetableCropsFromPlantingData,
  oliveVarietiesFromPlantingData,
} from './planting-system-data';
import { blogCategories, blogPosts } from './blog-seed-data';

// =====================================================
// REFERENCE DATA - EN/FR/AR TRANSLATIONS
// =====================================================

const soilTypes = [
  { name: 'Sandy Soil', name_fr: 'Sol sableux', name_ar: 'تربة رملية', value: 'sandy', icon: '🏜️', sort_order: 1, is_global: true },
  { name: 'Clay Soil', name_fr: 'Sol argileux', name_ar: 'تربة طينية', value: 'clay', icon: '🧱', sort_order: 2, is_global: true },
  { name: 'Loam Soil', name_fr: 'Sol limoneux', name_ar: 'تربة طفالية', value: 'loam', icon: '🌱', sort_order: 3, is_global: true },
  { name: 'Silt Soil', name_fr: 'Sol limoneux fin', name_ar: 'تربة غرينية', value: 'silt', icon: '💧', sort_order: 4, is_global: true },
  { name: 'Chalky Soil', name_fr: 'Sol calcaire', name_ar: 'تربة كلسية', value: 'chalky', icon: '⚪', sort_order: 5, is_global: true },
  { name: 'Peat Soil', name_fr: 'Sol tourbeux', name_ar: 'تربة خثية', value: 'peat', icon: '🟤', sort_order: 6, is_global: true },
  { name: 'Sandy Loam', name_fr: 'Sol sablo-limoneux', name_ar: 'تربة رملية طفالية', value: 'sandy_loam', icon: '🏕️', sort_order: 7, is_global: true },
  { name: 'Clay Loam', name_fr: 'Sol argilo-limoneux', name_ar: 'تربة طينية طفالية', value: 'clay_loam', icon: '🌾', sort_order: 8, is_global: true },
];

const irrigationTypes = [
  { name: 'Drip Irrigation', name_fr: 'Irrigation goutte à goutte', name_ar: 'الري بالتنقيط', value: 'drip', icon: '💧', sort_order: 1, is_global: true },
  { name: 'Sprinkler Irrigation', name_fr: 'Irrigation par aspersion', name_ar: 'الري بالرش', value: 'sprinkler', icon: '🌧️', sort_order: 2, is_global: true },
  { name: 'Flood Irrigation', name_fr: 'Irrigation par submersion', name_ar: 'الري بالغمر', value: 'flood', icon: '🌊', sort_order: 3, is_global: true },
  { name: 'Furrow Irrigation', name_fr: 'Irrigation par sillons', name_ar: 'الري بالأخاديد', value: 'furrow', icon: '〰️', sort_order: 4, is_global: true },
  { name: 'Center Pivot', name_fr: 'Pivot central', name_ar: 'الري المحوري', value: 'center_pivot', icon: '🔄', sort_order: 5, is_global: true },
  { name: 'Micro-sprinkler', name_fr: 'Micro-aspersion', name_ar: 'الري بالرش الدقيق', value: 'micro_sprinkler', icon: '💦', sort_order: 6, is_global: true },
  { name: 'Subsurface Drip', name_fr: 'Goutte à goutte enterré', name_ar: 'الري بالتنقيط تحت السطحي', value: 'subsurface_drip', icon: '⬇️', sort_order: 7, is_global: true },
  { name: 'Manual/Traditional', name_fr: 'Manuel/Traditionnel', name_ar: 'يدوي/تقليدي', value: 'manual', icon: '🪣', sort_order: 8, is_global: true },
];

const treeCategories = [
  { name: 'Citrus', name_fr: 'Agrumes', name_ar: 'الحمضيات', value: 'citrus', icon: '🍊', sort_order: 1, is_global: true },
  { name: 'Stone Fruits', name_fr: 'Fruits à noyau', name_ar: 'الفواكه ذات النواة', value: 'stone_fruits', icon: '🍑', sort_order: 2, is_global: true },
  { name: 'Olives', name_fr: 'Oliviers', name_ar: 'الزيتون', value: 'olives', icon: '🫒', sort_order: 3, is_global: true },
  { name: 'Nuts', name_fr: 'Fruits à coque', name_ar: 'المكسرات', value: 'nuts', icon: '🥜', sort_order: 4, is_global: true },
  { name: 'Tropical', name_fr: 'Tropicaux', name_ar: 'الاستوائية', value: 'tropical', icon: '🥭', sort_order: 5, is_global: true },
  { name: 'Pome Fruits', name_fr: 'Fruits à pépins', name_ar: 'الفواكه ذات البذور', value: 'pome_fruits', icon: '🍎', sort_order: 6, is_global: true },
  { name: 'Dates', name_fr: 'Palmiers dattiers', name_ar: 'النخيل', value: 'dates', icon: '🌴', sort_order: 7, is_global: true },
  { name: 'Argan', name_fr: 'Arganiers', name_ar: 'الأركان', value: 'argan', icon: '🌳', sort_order: 8, is_global: true },
];

// Crop categories from plantingSystemData.ts
const cropCategories = cropCategoriesFromPlantingData;

const unitsOfMeasure = [
  { name: 'Kilograms', name_fr: 'Kilogrammes', name_ar: 'كيلوغرام', value: 'kg', symbol: 'kg', category: 'weight', sort_order: 1 },
  { name: 'Tons', name_fr: 'Tonnes', name_ar: 'طن', value: 'tons', symbol: 't', category: 'weight', sort_order: 2 },
  { name: 'Units', name_fr: 'Unités', name_ar: 'وحدات', value: 'units', symbol: 'u', category: 'count', sort_order: 3 },
  { name: 'Boxes', name_fr: 'Caisses', name_ar: 'صناديق', value: 'boxes', symbol: 'box', category: 'count', sort_order: 4 },
  { name: 'Crates', name_fr: 'Cageots', name_ar: 'أقفاص', value: 'crates', symbol: 'crt', category: 'count', sort_order: 5 },
  { name: 'Liters', name_fr: 'Litres', name_ar: 'لتر', value: 'liters', symbol: 'L', category: 'volume', sort_order: 6 },
  { name: 'Hectares', name_fr: 'Hectares', name_ar: 'هكتار', value: 'hectares', symbol: 'ha', category: 'area', sort_order: 7 },
  { name: 'Square Meters', name_fr: 'Mètres carrés', name_ar: 'متر مربع', value: 'sqm', symbol: 'm²', category: 'area', sort_order: 8 },
];

const qualityGrades = [
  { name: 'Extra (Premium)', name_fr: 'Extra (Premium)', name_ar: 'ممتاز', value: 'Extra', rank: 1, color: '#22c55e', sort_order: 1 },
  { name: 'Category A', name_fr: 'Catégorie A', name_ar: 'فئة أ', value: 'A', rank: 2, color: '#3b82f6', sort_order: 2 },
  { name: 'First Choice', name_fr: 'Premier choix', name_ar: 'الخيار الأول', value: 'First', rank: 3, color: '#3b82f6', sort_order: 3 },
  { name: 'Category B', name_fr: 'Catégorie B', name_ar: 'فئة ب', value: 'B', rank: 4, color: '#f59e0b', sort_order: 4 },
  { name: 'Second Choice', name_fr: 'Deuxième choix', name_ar: 'الخيار الثاني', value: 'Second', rank: 5, color: '#f59e0b', sort_order: 5 },
  { name: 'Category C', name_fr: 'Catégorie C', name_ar: 'فئة ج', value: 'C', rank: 6, color: '#ef4444', sort_order: 6 },
];

const taskPriorities = [
  { name: 'Low', name_fr: 'Basse', name_ar: 'منخفضة', value: 'low', level: 1, color: '#22c55e', sort_order: 1 },
  { name: 'Medium', name_fr: 'Moyenne', name_ar: 'متوسطة', value: 'medium', level: 2, color: '#3b82f6', sort_order: 2 },
  { name: 'High', name_fr: 'Haute', name_ar: 'عالية', value: 'high', level: 3, color: '#f59e0b', sort_order: 3 },
  { name: 'Urgent', name_fr: 'Urgente', name_ar: 'عاجلة', value: 'urgent', level: 4, color: '#ef4444', sort_order: 4 },
];

const paymentMethods = [
  { name: 'Cash', name_fr: 'Espèces', name_ar: 'نقداً', value: 'cash', icon: '💵', requires_reference: false, sort_order: 1 },
  { name: 'Bank Transfer', name_fr: 'Virement bancaire', name_ar: 'تحويل بنكي', value: 'bank_transfer', icon: '🏦', requires_reference: true, sort_order: 2 },
  { name: 'Check', name_fr: 'Chèque', name_ar: 'شيك', value: 'check', icon: '📝', requires_reference: true, sort_order: 3 },
  { name: 'Mobile Money', name_fr: 'Mobile Money', name_ar: 'المحفظة الإلكترونية', value: 'mobile_money', icon: '📱', requires_reference: true, sort_order: 4 },
];

const currencies = [
  { name: 'Moroccan Dirham', name_fr: 'Dirham Marocain', code: 'MAD', symbol: 'DH', symbol_position: 'after', decimal_places: 2, country_code: 'MA', sort_order: 1 },
  { name: 'Euro', name_fr: 'Euro', code: 'EUR', symbol: '€', symbol_position: 'before', decimal_places: 2, country_code: 'EU', sort_order: 2 },
  { name: 'US Dollar', name_fr: 'Dollar US', code: 'USD', symbol: '$', symbol_position: 'before', decimal_places: 2, country_code: 'US', sort_order: 3 },
  { name: 'CFA Franc', name_fr: 'Franc CFA', code: 'XOF', symbol: 'FCFA', symbol_position: 'after', decimal_places: 0, country_code: 'SN', sort_order: 4 },
];

const languages = [
  { name: 'French', native_name: 'Français', code: 'fr', locale: 'fr-FR', direction: 'ltr', is_default: true, sort_order: 1 },
  { name: 'English', native_name: 'English', code: 'en', locale: 'en-US', direction: 'ltr', is_default: false, sort_order: 2 },
  { name: 'Arabic', native_name: 'العربية', code: 'ar', locale: 'ar-MA', direction: 'rtl', is_default: false, sort_order: 3 },
];

const labServiceCategories = [
  { name: 'Soil Analysis', name_fr: 'Analyses de Sol', name_ar: 'تحليل التربة', value: 'soil', icon: '🌍', sort_order: 1 },
  { name: 'Foliar Analysis', name_fr: 'Analyses Foliaires', name_ar: 'تحليل الأوراق', value: 'leaf', icon: '🍃', sort_order: 2 },
  { name: 'Water Analysis', name_fr: "Analyses d'Eau", name_ar: 'تحليل المياه', value: 'water', icon: '💧', sort_order: 3 },
  { name: 'Tissue Analysis', name_fr: 'Analyses Tissulaires', name_ar: 'تحليل الأنسجة', value: 'tissue', icon: '🔬', sort_order: 4 },
  { name: 'Other', name_fr: 'Autres', name_ar: 'أخرى', value: 'other', icon: '📋', sort_order: 5 },
];

const costCategories = [
  { name: 'Planting', name_fr: 'Plantation', name_ar: 'الزراعة', value: 'planting', icon: '🌱', sort_order: 1 },
  { name: 'Harvesting', name_fr: 'Récolte', name_ar: 'الحصاد', value: 'harvesting', icon: '🌾', sort_order: 2 },
  { name: 'Irrigation', name_fr: 'Irrigation', name_ar: 'الري', value: 'irrigation', icon: '💧', sort_order: 3 },
  { name: 'Fertilization', name_fr: 'Fertilisation', name_ar: 'التسميد', value: 'fertilization', icon: '🧪', sort_order: 4 },
  { name: 'Pesticide', name_fr: 'Application pesticide', name_ar: 'المبيدات', value: 'pesticide', icon: '🔫', sort_order: 5 },
  { name: 'Pruning', name_fr: 'Taille', name_ar: 'التقليم', value: 'pruning', icon: '✂️', sort_order: 6 },
  { name: 'Maintenance', name_fr: 'Entretien', name_ar: 'الصيانة', value: 'maintenance', icon: '🔧', sort_order: 7 },
  { name: 'Transport', name_fr: 'Transport', name_ar: 'النقل', value: 'transport', icon: '🚛', sort_order: 8 },
  { name: 'Labor', name_fr: "Main d'oeuvre", name_ar: 'العمالة', value: 'labor', icon: '👷', sort_order: 9 },
  { name: 'Materials', name_fr: 'Matériaux', name_ar: 'المواد', value: 'materials', icon: '📦', sort_order: 10 },
  { name: 'Utilities', name_fr: 'Services publics', name_ar: 'المرافق', value: 'utilities', icon: '⚡', sort_order: 11 },
  { name: 'Other', name_fr: 'Autre', name_ar: 'أخرى', value: 'other', icon: '📋', sort_order: 12 },
];

const workerTypes = [
  { name: 'Fixed Salary', name_fr: 'Salaire fixe', name_ar: 'راتب ثابت', value: 'fixed_salary', payment_frequency: 'monthly', sort_order: 1 },
  { name: 'Daily Worker', name_fr: 'Journalier', name_ar: 'عامل يومي', value: 'daily_worker', payment_frequency: 'daily', sort_order: 2 },
  { name: 'Sharecropper', name_fr: 'Métayer', name_ar: 'مزارع بالمشاركة', value: 'metayage', payment_frequency: 'harvest_share', sort_order: 3 },
];

// Marketplace Categories seed data
const marketplaceCategories = [
  { name: 'Cultures & Récoltes', slug: 'crops', description: 'Fruits, légumes, céréales et produits frais de la ferme', icon: '🌾', sort_order: 1, is_featured: true, locale: 'fr' },
  { name: 'Machines & Équipements', slug: 'machinery', description: "Tracteurs, moissonneuses, systèmes d'irrigation et équipements agricoles", icon: '🚜', sort_order: 2, is_featured: true, locale: 'fr' },
  { name: 'Intrants & Fournitures', slug: 'inputs', description: 'Engrais, semences, pesticides et produits phytosanitaires', icon: '🧪', sort_order: 3, is_featured: true, locale: 'fr' },
  { name: 'Bétail & Aliments', slug: 'livestock', description: 'Animaux, aliments pour bétail et produits vétérinaires', icon: '🐄', sort_order: 4, is_featured: true, locale: 'fr' },
  { name: 'Services Agricoles', slug: 'services', description: "Main d'œuvre, conseil agricole, transport et logistique", icon: '👨‍🌾', sort_order: 5, is_featured: false, locale: 'fr' },
  { name: 'Bio & Organique', slug: 'organic', description: 'Produits certifiés bio, agriculture biologique', icon: '♻️', sort_order: 6, is_featured: false, locale: 'fr' },
];

// Individual Trees (species) - Morocco-focused
const trees = [
  // Citrus
  { name: 'Orange', name_fr: 'Oranger', name_ar: 'البرتقال', scientific_name: 'Citrus sinensis', value: 'orange', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', sort_order: 1, is_global: true },
  { name: 'Clementine', name_fr: 'Clémentine', name_ar: 'الكليمونتين', scientific_name: 'Citrus clementina', value: 'clementine', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', sort_order: 2, is_global: true },
  { name: 'Lemon', name_fr: 'Citronnier', name_ar: 'الليمون', scientific_name: 'Citrus limon', value: 'lemon', icon: '🍋', water_requirements: 'medium', growth_rate: 'medium', sort_order: 3, is_global: true },
  { name: 'Mandarin', name_fr: 'Mandarine', name_ar: 'اليوسفي', scientific_name: 'Citrus reticulata', value: 'mandarin', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', sort_order: 4, is_global: true },
  { name: 'Grapefruit', name_fr: 'Pamplemousse', name_ar: 'الجريب فروت', scientific_name: 'Citrus paradisi', value: 'grapefruit', icon: '🍊', water_requirements: 'medium', growth_rate: 'medium', sort_order: 5, is_global: true },
  // Olives
  { name: 'Picholine Olive', name_fr: 'Olivier Picholine', name_ar: 'زيتون بيشولين', scientific_name: 'Olea europaea', value: 'picholine', icon: '🫒', water_requirements: 'low', growth_rate: 'slow', sort_order: 10, is_global: true },
  { name: 'Moroccan Picholine', name_fr: 'Picholine Marocaine', name_ar: 'البيشولين المغربية', scientific_name: 'Olea europaea', value: 'moroccan_picholine', icon: '🫒', water_requirements: 'low', growth_rate: 'slow', sort_order: 11, is_global: true },
  { name: 'Haouzia Olive', name_fr: 'Olivier Haouzia', name_ar: 'زيتون الحوزية', scientific_name: 'Olea europaea', value: 'haouzia', icon: '🫒', water_requirements: 'low', growth_rate: 'slow', sort_order: 12, is_global: true },
  { name: 'Menara Olive', name_fr: 'Olivier Menara', name_ar: 'زيتون المنارة', scientific_name: 'Olea europaea', value: 'menara', icon: '🫒', water_requirements: 'low', growth_rate: 'slow', sort_order: 13, is_global: true },
  // Stone Fruits
  { name: 'Peach', name_fr: 'Pêcher', name_ar: 'الخوخ', scientific_name: 'Prunus persica', value: 'peach', icon: '🍑', water_requirements: 'medium', growth_rate: 'fast', sort_order: 20, is_global: true },
  { name: 'Apricot', name_fr: 'Abricotier', name_ar: 'المشمش', scientific_name: 'Prunus armeniaca', value: 'apricot', icon: '🍑', water_requirements: 'medium', growth_rate: 'medium', sort_order: 21, is_global: true },
  { name: 'Plum', name_fr: 'Prunier', name_ar: 'البرقوق', scientific_name: 'Prunus domestica', value: 'plum', icon: '🍑', water_requirements: 'medium', growth_rate: 'medium', sort_order: 22, is_global: true },
  { name: 'Cherry', name_fr: 'Cerisier', name_ar: 'الكرز', scientific_name: 'Prunus avium', value: 'cherry', icon: '🍒', water_requirements: 'medium', growth_rate: 'medium', sort_order: 23, is_global: true },
  { name: 'Nectarine', name_fr: 'Nectarinier', name_ar: 'النكتارين', scientific_name: 'Prunus persica var. nucipersica', value: 'nectarine', icon: '🍑', water_requirements: 'medium', growth_rate: 'fast', sort_order: 24, is_global: true },
  // Nuts
  { name: 'Almond', name_fr: 'Amandier', name_ar: 'اللوز', scientific_name: 'Prunus dulcis', value: 'almond', icon: '🥜', water_requirements: 'low', growth_rate: 'medium', sort_order: 30, is_global: true },
  { name: 'Walnut', name_fr: 'Noyer', name_ar: 'الجوز', scientific_name: 'Juglans regia', value: 'walnut', icon: '🥜', water_requirements: 'medium', growth_rate: 'slow', sort_order: 31, is_global: true },
  { name: 'Pistachio', name_fr: 'Pistachier', name_ar: 'الفستق', scientific_name: 'Pistacia vera', value: 'pistachio', icon: '🥜', water_requirements: 'low', growth_rate: 'slow', sort_order: 32, is_global: true },
  { name: 'Hazelnut', name_fr: 'Noisetier', name_ar: 'البندق', scientific_name: 'Corylus avellana', value: 'hazelnut', icon: '🥜', water_requirements: 'medium', growth_rate: 'medium', sort_order: 33, is_global: true },
  // Pome Fruits
  { name: 'Apple', name_fr: 'Pommier', name_ar: 'التفاح', scientific_name: 'Malus domestica', value: 'apple', icon: '🍎', water_requirements: 'medium', growth_rate: 'medium', sort_order: 40, is_global: true },
  { name: 'Pear', name_fr: 'Poirier', name_ar: 'الإجاص', scientific_name: 'Pyrus communis', value: 'pear', icon: '🍐', water_requirements: 'medium', growth_rate: 'medium', sort_order: 41, is_global: true },
  { name: 'Quince', name_fr: 'Cognassier', name_ar: 'السفرجل', scientific_name: 'Cydonia oblonga', value: 'quince', icon: '🍐', water_requirements: 'medium', growth_rate: 'slow', sort_order: 42, is_global: true },
  // Dates
  { name: 'Medjool Date', name_fr: 'Palmier Medjool', name_ar: 'نخيل المجهول', scientific_name: 'Phoenix dactylifera', value: 'medjool', icon: '🌴', water_requirements: 'medium', growth_rate: 'slow', sort_order: 50, is_global: true },
  { name: 'Deglet Nour', name_fr: 'Deglet Nour', name_ar: 'دقلة نور', scientific_name: 'Phoenix dactylifera', value: 'deglet_nour', icon: '🌴', water_requirements: 'medium', growth_rate: 'slow', sort_order: 51, is_global: true },
  { name: 'Boufeggous', name_fr: 'Boufeggous', name_ar: 'بوفقوس', scientific_name: 'Phoenix dactylifera', value: 'boufeggous', icon: '🌴', water_requirements: 'medium', growth_rate: 'slow', sort_order: 52, is_global: true },
  { name: 'Jihel', name_fr: 'Jihel', name_ar: 'الجيهل', scientific_name: 'Phoenix dactylifera', value: 'jihel', icon: '🌴', water_requirements: 'low', growth_rate: 'slow', sort_order: 53, is_global: true },
  // Tropical
  { name: 'Avocado', name_fr: 'Avocatier', name_ar: 'الأفوكادو', scientific_name: 'Persea americana', value: 'avocado', icon: '🥑', water_requirements: 'high', growth_rate: 'fast', sort_order: 60, is_global: true },
  { name: 'Mango', name_fr: 'Manguier', name_ar: 'المانجو', scientific_name: 'Mangifera indica', value: 'mango', icon: '🥭', water_requirements: 'high', growth_rate: 'medium', sort_order: 61, is_global: true },
  { name: 'Banana', name_fr: 'Bananier', name_ar: 'الموز', scientific_name: 'Musa acuminata', value: 'banana', icon: '🍌', water_requirements: 'high', growth_rate: 'fast', sort_order: 62, is_global: true },
  { name: 'Fig', name_fr: 'Figuier', name_ar: 'التين', scientific_name: 'Ficus carica', value: 'fig', icon: '🍇', water_requirements: 'low', growth_rate: 'fast', sort_order: 63, is_global: true },
  { name: 'Pomegranate', name_fr: 'Grenadier', name_ar: 'الرمان', scientific_name: 'Punica granatum', value: 'pomegranate', icon: '🍎', water_requirements: 'low', growth_rate: 'medium', sort_order: 64, is_global: true },
  // Argan
  { name: 'Argan', name_fr: 'Arganier', name_ar: 'الأركان', scientific_name: 'Argania spinosa', value: 'argan', icon: '🌳', water_requirements: 'low', growth_rate: 'slow', sort_order: 70, is_global: true },
  // Grapes
  { name: 'Table Grape', name_fr: 'Vigne de table', name_ar: 'عنب المائدة', scientific_name: 'Vitis vinifera', value: 'table_grape', icon: '🍇', water_requirements: 'medium', growth_rate: 'fast', sort_order: 80, is_global: true },
  { name: 'Wine Grape', name_fr: 'Vigne à vin', name_ar: 'عنب النبيذ', scientific_name: 'Vitis vinifera', value: 'wine_grape', icon: '🍇', water_requirements: 'medium', growth_rate: 'fast', sort_order: 81, is_global: true },
];

// Individual Crop Types - Morocco-focused
const cropTypes = [
  // Cereals
  { name: 'Soft Wheat', name_fr: 'Blé tendre', name_ar: 'القمح اللين', scientific_name: 'Triticum aestivum', value: 'soft_wheat', icon: '🌾', water_requirements: 'medium', growth_cycle_days: 120, sort_order: 1, is_global: true },
  { name: 'Durum Wheat', name_fr: 'Blé dur', name_ar: 'القمح الصلب', scientific_name: 'Triticum durum', value: 'durum_wheat', icon: '🌾', water_requirements: 'low', growth_cycle_days: 130, sort_order: 2, is_global: true },
  { name: 'Barley', name_fr: 'Orge', name_ar: 'الشعير', scientific_name: 'Hordeum vulgare', value: 'barley', icon: '🌾', water_requirements: 'low', growth_cycle_days: 90, sort_order: 3, is_global: true },
  { name: 'Corn/Maize', name_fr: 'Maïs', name_ar: 'الذرة', scientific_name: 'Zea mays', value: 'corn', icon: '🌽', water_requirements: 'high', growth_cycle_days: 100, sort_order: 4, is_global: true },
  { name: 'Oats', name_fr: 'Avoine', name_ar: 'الشوفان', scientific_name: 'Avena sativa', value: 'oats', icon: '🌾', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 5, is_global: true },
  { name: 'Rice', name_fr: 'Riz', name_ar: 'الأرز', scientific_name: 'Oryza sativa', value: 'rice', icon: '🌾', water_requirements: 'high', growth_cycle_days: 120, sort_order: 6, is_global: true },
  { name: 'Sorghum', name_fr: 'Sorgho', name_ar: 'الذرة الرفيعة', scientific_name: 'Sorghum bicolor', value: 'sorghum', icon: '🌾', water_requirements: 'low', growth_cycle_days: 110, sort_order: 7, is_global: true },
  // Vegetables
  { name: 'Tomato', name_fr: 'Tomate', name_ar: 'الطماطم', scientific_name: 'Solanum lycopersicum', value: 'tomato', icon: '🍅', water_requirements: 'high', growth_cycle_days: 75, sort_order: 10, is_global: true },
  { name: 'Potato', name_fr: 'Pomme de terre', name_ar: 'البطاطس', scientific_name: 'Solanum tuberosum', value: 'potato', icon: '🥔', water_requirements: 'medium', growth_cycle_days: 90, sort_order: 11, is_global: true },
  { name: 'Onion', name_fr: 'Oignon', name_ar: 'البصل', scientific_name: 'Allium cepa', value: 'onion', icon: '🧅', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 12, is_global: true },
  { name: 'Carrot', name_fr: 'Carotte', name_ar: 'الجزر', scientific_name: 'Daucus carota', value: 'carrot', icon: '🥕', water_requirements: 'medium', growth_cycle_days: 70, sort_order: 13, is_global: true },
  { name: 'Pepper', name_fr: 'Poivron', name_ar: 'الفلفل', scientific_name: 'Capsicum annuum', value: 'pepper', icon: '🫑', water_requirements: 'medium', growth_cycle_days: 70, sort_order: 14, is_global: true },
  { name: 'Eggplant', name_fr: 'Aubergine', name_ar: 'الباذنجان', scientific_name: 'Solanum melongena', value: 'eggplant', icon: '🍆', water_requirements: 'medium', growth_cycle_days: 80, sort_order: 15, is_global: true },
  { name: 'Zucchini', name_fr: 'Courgette', name_ar: 'الكوسة', scientific_name: 'Cucurbita pepo', value: 'zucchini', icon: '🥒', water_requirements: 'medium', growth_cycle_days: 50, sort_order: 16, is_global: true },
  { name: 'Cucumber', name_fr: 'Concombre', name_ar: 'الخيار', scientific_name: 'Cucumis sativus', value: 'cucumber', icon: '🥒', water_requirements: 'high', growth_cycle_days: 55, sort_order: 17, is_global: true },
  { name: 'Lettuce', name_fr: 'Laitue', name_ar: 'الخس', scientific_name: 'Lactuca sativa', value: 'lettuce', icon: '🥬', water_requirements: 'high', growth_cycle_days: 45, sort_order: 18, is_global: true },
  { name: 'Cabbage', name_fr: 'Chou', name_ar: 'الملفوف', scientific_name: 'Brassica oleracea', value: 'cabbage', icon: '🥬', water_requirements: 'medium', growth_cycle_days: 70, sort_order: 19, is_global: true },
  { name: 'Cauliflower', name_fr: 'Chou-fleur', name_ar: 'القرنبيط', scientific_name: 'Brassica oleracea var. botrytis', value: 'cauliflower', icon: '🥬', water_requirements: 'medium', growth_cycle_days: 80, sort_order: 20, is_global: true },
  { name: 'Melon', name_fr: 'Melon', name_ar: 'البطيخ الأصفر', scientific_name: 'Cucumis melo', value: 'melon', icon: '🍈', water_requirements: 'medium', growth_cycle_days: 85, sort_order: 21, is_global: true },
  { name: 'Watermelon', name_fr: 'Pastèque', name_ar: 'البطيخ الأحمر', scientific_name: 'Citrullus lanatus', value: 'watermelon', icon: '🍉', water_requirements: 'medium', growth_cycle_days: 90, sort_order: 22, is_global: true },
  { name: 'Green Bean', name_fr: 'Haricot vert', name_ar: 'الفاصوليا الخضراء', scientific_name: 'Phaseolus vulgaris', value: 'green_bean', icon: '🫘', water_requirements: 'medium', growth_cycle_days: 55, sort_order: 23, is_global: true },
  { name: 'Peas', name_fr: 'Petits pois', name_ar: 'البازلاء', scientific_name: 'Pisum sativum', value: 'peas', icon: '🫛', water_requirements: 'medium', growth_cycle_days: 60, sort_order: 24, is_global: true },
  // Legumes
  { name: 'Chickpea', name_fr: 'Pois chiche', name_ar: 'الحمص', scientific_name: 'Cicer arietinum', value: 'chickpea', icon: '🫘', water_requirements: 'low', growth_cycle_days: 100, sort_order: 30, is_global: true },
  { name: 'Lentil', name_fr: 'Lentille', name_ar: 'العدس', scientific_name: 'Lens culinaris', value: 'lentil', icon: '🫘', water_requirements: 'low', growth_cycle_days: 80, sort_order: 31, is_global: true },
  { name: 'Fava Bean', name_fr: 'Fève', name_ar: 'الفول', scientific_name: 'Vicia faba', value: 'fava_bean', icon: '🫘', water_requirements: 'medium', growth_cycle_days: 90, sort_order: 32, is_global: true },
  { name: 'Dry Bean', name_fr: 'Haricot sec', name_ar: 'الفاصوليا الجافة', scientific_name: 'Phaseolus vulgaris', value: 'dry_bean', icon: '🫘', water_requirements: 'medium', growth_cycle_days: 85, sort_order: 33, is_global: true },
  // Oilseeds
  { name: 'Sunflower', name_fr: 'Tournesol', name_ar: 'عباد الشمس', scientific_name: 'Helianthus annuus', value: 'sunflower', icon: '🌻', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 40, is_global: true },
  { name: 'Rapeseed', name_fr: 'Colza', name_ar: 'الكولزا', scientific_name: 'Brassica napus', value: 'rapeseed', icon: '🌻', water_requirements: 'medium', growth_cycle_days: 150, sort_order: 41, is_global: true },
  { name: 'Peanut', name_fr: 'Arachide', name_ar: 'الفول السوداني', scientific_name: 'Arachis hypogaea', value: 'peanut', icon: '🥜', water_requirements: 'medium', growth_cycle_days: 120, sort_order: 42, is_global: true },
  { name: 'Sesame', name_fr: 'Sésame', name_ar: 'السمسم', scientific_name: 'Sesamum indicum', value: 'sesame', icon: '🌾', water_requirements: 'low', growth_cycle_days: 90, sort_order: 43, is_global: true },
  // Fodder
  { name: 'Alfalfa', name_fr: 'Luzerne', name_ar: 'البرسيم الحجازي', scientific_name: 'Medicago sativa', value: 'alfalfa', icon: '🌿', water_requirements: 'medium', growth_cycle_days: 60, sort_order: 50, is_global: true },
  { name: 'Berseem Clover', name_fr: 'Trèfle d\'Alexandrie', name_ar: 'البرسيم', scientific_name: 'Trifolium alexandrinum', value: 'berseem', icon: '🌿', water_requirements: 'high', growth_cycle_days: 50, sort_order: 51, is_global: true },
  { name: 'Fodder Beet', name_fr: 'Betterave fourragère', name_ar: 'الشمندر العلفي', scientific_name: 'Beta vulgaris', value: 'fodder_beet', icon: '🌿', water_requirements: 'medium', growth_cycle_days: 120, sort_order: 52, is_global: true },
  // Industrial
  { name: 'Sugar Beet', name_fr: 'Betterave sucrière', name_ar: 'الشمندر السكري', scientific_name: 'Beta vulgaris', value: 'sugar_beet', icon: '🏭', water_requirements: 'medium', growth_cycle_days: 150, sort_order: 60, is_global: true },
  { name: 'Sugarcane', name_fr: 'Canne à sucre', name_ar: 'قصب السكر', scientific_name: 'Saccharum officinarum', value: 'sugarcane', icon: '🏭', water_requirements: 'high', growth_cycle_days: 365, sort_order: 61, is_global: true },
  { name: 'Cotton', name_fr: 'Coton', name_ar: 'القطن', scientific_name: 'Gossypium hirsutum', value: 'cotton', icon: '🏭', water_requirements: 'medium', growth_cycle_days: 150, sort_order: 62, is_global: true },
  { name: 'Tobacco', name_fr: 'Tabac', name_ar: 'التبغ', scientific_name: 'Nicotiana tabacum', value: 'tobacco', icon: '🏭', water_requirements: 'medium', growth_cycle_days: 100, sort_order: 63, is_global: true },
];

// Harvest Statuses
const harvestStatuses = [
  { name: 'Planned', name_fr: 'Planifié', name_ar: 'مخطط', value: 'planned', icon: '📅', color: '#6366f1', is_final: false, sort_order: 1, is_global: true },
  { name: 'In Progress', name_fr: 'En cours', name_ar: 'قيد التنفيذ', value: 'in_progress', icon: '🔄', color: '#f59e0b', is_final: false, sort_order: 2, is_global: true },
  { name: 'Completed', name_fr: 'Terminé', name_ar: 'مكتمل', value: 'completed', icon: '✅', color: '#22c55e', is_final: true, sort_order: 3, is_global: true },
  { name: 'Cancelled', name_fr: 'Annulé', name_ar: 'ملغى', value: 'cancelled', icon: '❌', color: '#ef4444', is_final: true, sort_order: 4, is_global: true },
];

// Delivery Types
const deliveryTypes = [
  { name: 'Farm Pickup', name_fr: 'Enlèvement à la ferme', name_ar: 'الاستلام من المزرعة', value: 'farm_pickup', icon: '🚜', requires_destination: false, sort_order: 1, is_global: true },
  { name: 'Delivery to Client', name_fr: 'Livraison client', name_ar: 'التوصيل للعميل', value: 'delivery_client', icon: '🚚', requires_destination: true, sort_order: 2, is_global: true },
  { name: 'Market Delivery', name_fr: 'Livraison au marché', name_ar: 'التوصيل للسوق', value: 'market_delivery', icon: '🏪', requires_destination: true, sort_order: 3, is_global: true },
  { name: 'Export', name_fr: 'Export', name_ar: 'تصدير', value: 'export', icon: '🌍', requires_destination: true, sort_order: 4, is_global: true },
  { name: 'Processing Plant', name_fr: 'Usine de transformation', name_ar: 'مصنع التحويل', value: 'processing', icon: '🏭', requires_destination: true, sort_order: 5, is_global: true },
];

// Delivery Statuses
const deliveryStatuses = [
  { name: 'Pending', name_fr: 'En attente', name_ar: 'قيد الانتظار', value: 'pending', icon: '⏳', color: '#6366f1', is_final: false, sort_order: 1, is_global: true },
  { name: 'Dispatched', name_fr: 'Expédié', name_ar: 'تم الإرسال', value: 'dispatched', icon: '🚚', color: '#f59e0b', is_final: false, sort_order: 2, is_global: true },
  { name: 'In Transit', name_fr: 'En transit', name_ar: 'في الطريق', value: 'in_transit', icon: '🛣️', color: '#3b82f6', is_final: false, sort_order: 3, is_global: true },
  { name: 'Delivered', name_fr: 'Livré', name_ar: 'تم التسليم', value: 'delivered', icon: '✅', color: '#22c55e', is_final: true, sort_order: 4, is_global: true },
  { name: 'Returned', name_fr: 'Retourné', name_ar: 'مرتجع', value: 'returned', icon: '↩️', color: '#ef4444', is_final: true, sort_order: 5, is_global: true },
];

// Payment Statuses
const paymentStatuses = [
  { name: 'Pending', name_fr: 'En attente', name_ar: 'قيد الانتظار', value: 'pending', icon: '⏳', color: '#6366f1', is_final: false, sort_order: 1, is_global: true },
  { name: 'Partial', name_fr: 'Partiel', name_ar: 'جزئي', value: 'partial', icon: '💰', color: '#f59e0b', is_final: false, sort_order: 2, is_global: true },
  { name: 'Paid', name_fr: 'Payé', name_ar: 'مدفوع', value: 'paid', icon: '✅', color: '#22c55e', is_final: true, sort_order: 3, is_global: true },
  { name: 'Overdue', name_fr: 'En retard', name_ar: 'متأخر', value: 'overdue', icon: '⚠️', color: '#ef4444', is_final: false, sort_order: 4, is_global: true },
  { name: 'Cancelled', name_fr: 'Annulé', name_ar: 'ملغى', value: 'cancelled', icon: '❌', color: '#9ca3af', is_final: true, sort_order: 5, is_global: true },
];

// Experience Levels
const experienceLevels = [
  { name: 'Beginner', name_fr: 'Débutant', name_ar: 'مبتدئ', value: 'beginner', level: 1, wage_multiplier: 1.0, color: '#22c55e', sort_order: 1, is_global: true },
  { name: 'Intermediate', name_fr: 'Intermédiaire', name_ar: 'متوسط', value: 'intermediate', level: 2, wage_multiplier: 1.15, color: '#3b82f6', sort_order: 2, is_global: true },
  { name: 'Experienced', name_fr: 'Expérimenté', name_ar: 'ذو خبرة', value: 'experienced', level: 3, wage_multiplier: 1.3, color: '#f59e0b', sort_order: 3, is_global: true },
  { name: 'Expert', name_fr: 'Expert', name_ar: 'خبير', value: 'expert', level: 4, wage_multiplier: 1.5, color: '#8b5cf6', sort_order: 4, is_global: true },
];

// Sale Types
const saleTypes = [
  { name: 'Direct Sale', name_fr: 'Vente directe', name_ar: 'بيع مباشر', value: 'direct', icon: '🤝', requires_client: true, sort_order: 1, is_global: true },
  { name: 'Market Sale', name_fr: 'Vente au marché', name_ar: 'بيع في السوق', value: 'market', icon: '🏪', requires_client: false, sort_order: 2, is_global: true },
  { name: 'Wholesale', name_fr: 'Vente en gros', name_ar: 'بيع بالجملة', value: 'wholesale', icon: '📦', requires_client: true, sort_order: 3, is_global: true },
  { name: 'Export', name_fr: 'Export', name_ar: 'تصدير', value: 'export', icon: '🌍', requires_client: true, sort_order: 4, is_global: true },
  { name: 'Contract Sale', name_fr: 'Vente sous contrat', name_ar: 'بيع بموجب عقد', value: 'contract', icon: '📝', requires_client: true, sort_order: 5, is_global: true },
];

// Revenue Categories
const revenueCategories = [
  { name: 'Crop Sales', name_fr: 'Vente de récoltes', name_ar: 'مبيعات المحاصيل', value: 'crop_sales', icon: '🌾', sort_order: 1, is_global: true },
  { name: 'Fruit Sales', name_fr: 'Vente de fruits', name_ar: 'مبيعات الفواكه', value: 'fruit_sales', icon: '🍊', sort_order: 2, is_global: true },
  { name: 'Livestock Sales', name_fr: 'Vente de bétail', name_ar: 'مبيعات الماشية', value: 'livestock_sales', icon: '🐄', sort_order: 3, is_global: true },
  { name: 'Dairy Products', name_fr: 'Produits laitiers', name_ar: 'منتجات الألبان', value: 'dairy', icon: '🥛', sort_order: 4, is_global: true },
  { name: 'Equipment Rental', name_fr: 'Location équipement', name_ar: 'تأجير المعدات', value: 'equipment_rental', icon: '🚜', sort_order: 5, is_global: true },
  { name: 'Subsidies/Grants', name_fr: 'Subventions', name_ar: 'الإعانات', value: 'subsidies', icon: '💰', sort_order: 6, is_global: true },
  { name: 'Other Revenue', name_fr: 'Autres revenus', name_ar: 'إيرادات أخرى', value: 'other', icon: '📋', sort_order: 7, is_global: true },
];

// Metayage Types (Sharecropping)
const metayageTypes = [
  { name: 'Half Share (50/50)', name_fr: 'Moitié-moitié', name_ar: 'مناصفة', value: 'half_share', worker_share_percentage: 50, owner_share_percentage: 50, sort_order: 1, is_global: true },
  { name: 'Third Share (1/3)', name_fr: 'Tiers', name_ar: 'الثلث', value: 'third_share', worker_share_percentage: 33, owner_share_percentage: 67, sort_order: 2, is_global: true },
  { name: 'Quarter Share (1/4)', name_fr: 'Quart', name_ar: 'الربع', value: 'quarter_share', worker_share_percentage: 25, owner_share_percentage: 75, sort_order: 3, is_global: true },
  { name: 'Fifth Share (1/5)', name_fr: 'Cinquième', name_ar: 'الخمس', value: 'fifth_share', worker_share_percentage: 20, owner_share_percentage: 80, sort_order: 4, is_global: true },
  { name: 'Custom', name_fr: 'Personnalisé', name_ar: 'مخصص', value: 'custom', worker_share_percentage: 0, owner_share_percentage: 0, sort_order: 5, is_global: true },
];

// Intended Uses (for harvest)
const intendedUses = [
  { name: 'Fresh Market', name_fr: 'Marché frais', name_ar: 'السوق الطازج', value: 'fresh_market', icon: '🏪', sort_order: 1, is_global: true },
  { name: 'Processing', name_fr: 'Transformation', name_ar: 'التحويل', value: 'processing', icon: '🏭', sort_order: 2, is_global: true },
  { name: 'Export', name_fr: 'Export', name_ar: 'تصدير', value: 'export', icon: '🌍', sort_order: 3, is_global: true },
  { name: 'Storage', name_fr: 'Stockage', name_ar: 'التخزين', value: 'storage', icon: '📦', sort_order: 4, is_global: true },
  { name: 'Seed', name_fr: 'Semence', name_ar: 'البذور', value: 'seed', icon: '🌱', sort_order: 5, is_global: true },
  { name: 'Animal Feed', name_fr: 'Alimentation animale', name_ar: 'علف الحيوانات', value: 'animal_feed', icon: '🐄', sort_order: 6, is_global: true },
  { name: 'Self-Consumption', name_fr: 'Autoconsommation', name_ar: 'الاستهلاك الذاتي', value: 'self_consumption', icon: '🏠', sort_order: 7, is_global: true },
];

// Generic seed function
async function seedCollection(
  strapi: Core.Strapi,
  apiId: string,
  items: any[],
  uniqueField = 'value',
  collectionName: string
) {
  try {
    const existingItems = await strapi.entityService.findMany(apiId as any, {
      filters: {},
      publicationState: 'preview',
    });

    const existingValues = new Set(
      (existingItems || []).map((item: any) => item[uniqueField]).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      if (existingValues.has(item[uniqueField])) {
        skipped++;
        continue;
      }

      try {
        await strapi.entityService.create(apiId as any, {
          data: { ...item, publishedAt: new Date() },
        });
        created++;
      } catch {
        // Silently skip failed items
      }
    }

    if (created > 0) {
      strapi.log.info(`  ✅ ${collectionName}: ${created} created, ${skipped} skipped`);
    }
  } catch {
    // Collection may not exist, skip silently
  }
}

// Seed crop types with category relations
async function seedCropTypes(strapi: Core.Strapi) {
  try {
    // Get all crop categories
    const categories = await strapi.entityService.findMany('api::crop-category.crop-category', {
      filters: {},
      publicationState: 'preview',
    });

    const categoryMap = new Map<string, any>();
    for (const cat of categories || []) {
      categoryMap.set(cat.value, cat.id);
    }

    // Combine all crop types
    const allCropTypes = [
      ...treeTypesFromPlantingData,
      ...cerealCropsFromPlantingData,
      ...vegetableCropsFromPlantingData,
    ];

    const existingCropTypes = await strapi.entityService.findMany('api::crop-type.crop-type', {
      filters: {},
      publicationState: 'preview',
    });

    const existingValues = new Set(
      (existingCropTypes || []).map((item: any) => item.value).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;

    for (const cropType of allCropTypes) {
      if (existingValues.has(cropType.value)) {
        skipped++;
        continue;
      }

      try {
        const categoryId = categoryMap.get(cropType.category);
        const cropTypeData: any = {
          name: cropType.name,
          name_fr: cropType.name_fr,
          name_ar: cropType.name_ar,
          value: cropType.value,
          sort_order: cropType.sort_order,
          is_global: true,
          publishedAt: new Date(),
        };

        if (categoryId) {
          cropTypeData.crop_category = categoryId;
        }

        await strapi.entityService.create('api::crop-type.crop-type', {
          data: cropTypeData,
        });
        created++;
      } catch (error: any) {
        strapi.log.warn(`Failed to create crop type ${cropType.name}: ${error.message}`);
      }
    }

    if (created > 0 || skipped > 0) {
      strapi.log.info(`  ✅ Crop Types: ${created} created, ${skipped} skipped`);
    }
  } catch (error: any) {
    strapi.log.error(`Error seeding crop types: ${error.message}`);
  }
}

// Seed varieties with crop type relations
async function seedVarieties(strapi: Core.Strapi) {
  try {
    // Get all crop types
    const cropTypes = await strapi.entityService.findMany('api::crop-type.crop-type', {
      filters: {},
      publicationState: 'preview',
    });

    const cropTypeMap = new Map<string, any>();
    for (const ct of cropTypes || []) {
      // Map by value (e.g., 'olivier') or name
      cropTypeMap.set(ct.value, ct.id);
      cropTypeMap.set(ct.name?.toLowerCase(), ct.id);
      cropTypeMap.set(ct.name_fr?.toLowerCase(), ct.id);
    }

    const existingVarieties = await strapi.entityService.findMany('api::variety.variety', {
      filters: {},
      publicationState: 'preview',
    });

    const existingValues = new Set(
      (existingVarieties || []).map((item: any) => item.value).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;

    // Seed olive varieties (only varieties we have data for)
    for (const variety of oliveVarietiesFromPlantingData) {
      if (existingValues.has(variety.value)) {
        skipped++;
        continue;
      }

      try {
        // Find the olive crop type (value is 'olivier' from treeTypesFromPlantingData)
        const oliveCropTypeId = cropTypeMap.get('olivier');

        if (!oliveCropTypeId) {
          strapi.log.warn(`Olive crop type not found, skipping variety ${variety.name}`);
          continue;
        }

        const varietyData: any = {
          name: variety.name,
          name_fr: variety.name_fr,
          name_ar: variety.name_ar,
          value: variety.value,
          origin: variety.origin,
          main_use: variety.main_use,
          characteristics: variety.characteristics,
          sort_order: variety.sort_order,
          is_global: true,
          crop_type: oliveCropTypeId,
          publishedAt: new Date(),
        };

        await strapi.entityService.create('api::variety.variety', {
          data: varietyData,
        });
        created++;
      } catch (error: any) {
        strapi.log.warn(`Failed to create variety ${variety.name}: ${error.message}`);
      }
    }

    if (created > 0 || skipped > 0) {
      strapi.log.info(`  ✅ Varieties: ${created} created, ${skipped} skipped`);
    }
  } catch (error: any) {
    strapi.log.error(`Error seeding varieties: ${error.message}`);
  }
}

// Seed blog categories and posts
async function seedBlogs(strapi: Core.Strapi) {
  try {
    // Step 1: Seed blog categories
    const existingCategories = await strapi.entityService.findMany('api::blog-category.blog-category', {
      filters: {},
      publicationState: 'preview',
    });

    const existingCategorySlugs = new Set(
      (existingCategories || []).map((cat: any) => cat.slug).filter(Boolean)
    );

    const categoryMap = new Map<string, number>();
    let categoriesCreated = 0;
    let categoriesSkipped = 0;

    for (const category of blogCategories) {
      if (existingCategorySlugs.has(category.slug)) {
        // Get existing category ID
        const existing = (existingCategories || []).find((c: any) => c.slug === category.slug);
        if (existing) {
          categoryMap.set(category.slug, existing.id);
        }
        categoriesSkipped++;
        continue;
      }

      try {
        const result = await strapi.entityService.create('api::blog-category.blog-category', {
          data: {
            ...category,
            publishedAt: new Date(),
          },
        });
        categoryMap.set(category.slug, result.id);
        categoriesCreated++;
      } catch (error: any) {
        strapi.log.warn(`Failed to create blog category ${category.name}: ${error.message}`);
      }
    }

    if (categoriesCreated > 0 || categoriesSkipped > 0) {
      strapi.log.info(`  ✅ Blog Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`);
    }

    // Step 2: Seed blog posts
    const existingPosts = await strapi.entityService.findMany('api::blog.blog', {
      filters: {},
      publicationState: 'preview',
    });

    const existingPostSlugs = new Set(
      (existingPosts || []).map((post: any) => post.slug).filter(Boolean)
    );

    let postsCreated = 0;
    let postsSkipped = 0;

    for (const post of blogPosts) {
      if (existingPostSlugs.has(post.slug)) {
        postsSkipped++;
        continue;
      }

      try {
        const { category_slug, ...postData } = post;
        const postPayload: any = {
          ...postData,
          publishedAt: new Date(),
        };

        // Add category relation if category exists
        if (category_slug && categoryMap.has(category_slug)) {
          postPayload.blog_category = categoryMap.get(category_slug);
        }

        await strapi.entityService.create('api::blog.blog', {
          data: postPayload,
        });
        postsCreated++;
      } catch (error: any) {
        strapi.log.warn(`Failed to create blog post ${post.title}: ${error.message}`);
      }
    }

    if (postsCreated > 0 || postsSkipped > 0) {
      strapi.log.info(`  ✅ Blog Posts: ${postsCreated} created, ${postsSkipped} skipped`);
    }
  } catch (error: any) {
    strapi.log.error(`Error seeding blogs: ${error.message}`);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.log.info('🌱 Starting reference data seeding...');

    // Seed all reference data collections
    await seedCollection(strapi, 'api::soil-type.soil-type', soilTypes, 'value', 'Soil Types');
    await seedCollection(strapi, 'api::irrigation-type.irrigation-type', irrigationTypes, 'value', 'Irrigation Types');
    await seedCollection(strapi, 'api::tree-category.tree-category', treeCategories, 'value', 'Tree Categories');
    
    // Seed crop categories from plantingSystemData.ts
    await seedCollection(strapi, 'api::crop-category.crop-category', cropCategories, 'value', 'Crop Categories');
    
    // Seed crop types with category relations
    await seedCropTypes(strapi);
    
    // Seed varieties with crop type relations
    await seedVarieties(strapi);
    
    await seedCollection(strapi, 'api::unit-of-measure.unit-of-measure', unitsOfMeasure, 'value', 'Units of Measure');
    await seedCollection(strapi, 'api::quality-grade.quality-grade', qualityGrades, 'value', 'Quality Grades');
    await seedCollection(strapi, 'api::task-priority.task-priority', taskPriorities, 'value', 'Task Priorities');
    await seedCollection(strapi, 'api::payment-method.payment-method', paymentMethods, 'value', 'Payment Methods');
    await seedCollection(strapi, 'api::currency.currency', currencies, 'code', 'Currencies');
    await seedCollection(strapi, 'api::language.language', languages, 'code', 'Languages');
    await seedCollection(strapi, 'api::lab-service-category.lab-service-category', labServiceCategories, 'value', 'Lab Service Categories');
    await seedCollection(strapi, 'api::cost-category.cost-category', costCategories, 'value', 'Cost Categories');
    await seedCollection(strapi, 'api::worker-type.worker-type', workerTypes, 'value', 'Worker Types');
    await seedCollection(strapi, 'api::marketplace-category.marketplace-category', marketplaceCategories, 'slug', 'Marketplace Categories');

    // Seed blog categories and posts
    await seedBlogs(strapi);

    strapi.log.info('✅ Reference data seeding completed');
  },
};
