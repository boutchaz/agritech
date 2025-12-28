#!/usr/bin/env node
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error('Error: STRAPI_API_TOKEN environment variable is required');
  console.error('Generate a token in Strapi Admin: Settings > API Tokens');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

async function createEntry(endpoint, data) {
  try {
    const response = await fetch(`${STRAPI_URL}/api/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create ${endpoint}: ${error}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error creating ${endpoint}:`, error.message);
    return null;
  }
}

async function seedCollection(name, endpoint, items) {
  console.log(`\nSeeding ${name}...`);
  let created = 0;
  for (const item of items) {
    const result = await createEntry(endpoint, item);
    if (result) created++;
  }
  console.log(`  Created ${created}/${items.length} ${name}`);
}

async function main() {
  console.log('🌱 Starting comprehensive reference data seed...\n');

  await seedCollection('Units of Measure', 'units-of-measure', [
    { name: 'Kilograms', name_fr: 'Kilogrammes', name_ar: 'كيلوغرام', value: 'kg', symbol: 'kg', category: 'weight', sort_order: 1 },
    { name: 'Tons', name_fr: 'Tonnes', name_ar: 'طن', value: 'tons', symbol: 't', category: 'weight', sort_order: 2 },
    { name: 'Units', name_fr: 'Unités', name_ar: 'وحدات', value: 'units', symbol: 'u', category: 'count', sort_order: 3 },
    { name: 'Boxes', name_fr: 'Caisses', name_ar: 'صناديق', value: 'boxes', symbol: 'box', category: 'count', sort_order: 4 },
    { name: 'Crates', name_fr: 'Cageots', name_ar: 'أقفاص', value: 'crates', symbol: 'crt', category: 'count', sort_order: 5 },
    { name: 'Liters', name_fr: 'Litres', name_ar: 'لتر', value: 'liters', symbol: 'L', category: 'volume', sort_order: 6 },
    { name: 'Hectares', name_fr: 'Hectares', name_ar: 'هكتار', value: 'hectares', symbol: 'ha', category: 'area', sort_order: 7 },
    { name: 'Square Meters', name_fr: 'Mètres carrés', name_ar: 'متر مربع', value: 'sqm', symbol: 'm²', category: 'area', sort_order: 8 },
  ]);

  await seedCollection('Quality Grades', 'quality-grades', [
    { name: 'Extra (Premium)', name_fr: 'Extra (Premium)', name_ar: 'ممتاز', value: 'Extra', rank: 1, color: '#22c55e', sort_order: 1 },
    { name: 'Category A', name_fr: 'Catégorie A', name_ar: 'فئة أ', value: 'A', rank: 2, color: '#3b82f6', sort_order: 2 },
    { name: 'First Choice', name_fr: 'Premier choix', name_ar: 'الخيار الأول', value: 'First', rank: 3, color: '#3b82f6', sort_order: 3 },
    { name: 'Category B', name_fr: 'Catégorie B', name_ar: 'فئة ب', value: 'B', rank: 4, color: '#f59e0b', sort_order: 4 },
    { name: 'Second Choice', name_fr: 'Deuxième choix', name_ar: 'الخيار الثاني', value: 'Second', rank: 5, color: '#f59e0b', sort_order: 5 },
    { name: 'Category C', name_fr: 'Catégorie C', name_ar: 'فئة ج', value: 'C', rank: 6, color: '#ef4444', sort_order: 6 },
    { name: 'Third Choice', name_fr: 'Troisième choix', name_ar: 'الخيار الثالث', value: 'Third', rank: 7, color: '#ef4444', sort_order: 7 },
  ]);

  await seedCollection('Harvest Statuses', 'harvest-statuses', [
    { name: 'Stored', name_fr: 'Stockée', name_ar: 'مخزنة', value: 'stored', color: '#3b82f6', is_final: false, sort_order: 1 },
    { name: 'In Delivery', name_fr: 'En livraison', name_ar: 'قيد التوصيل', value: 'in_delivery', color: '#f59e0b', is_final: false, sort_order: 2 },
    { name: 'Delivered', name_fr: 'Livrée', name_ar: 'تم التسليم', value: 'delivered', color: '#22c55e', is_final: false, sort_order: 3 },
    { name: 'Sold', name_fr: 'Vendue', name_ar: 'تم البيع', value: 'sold', color: '#22c55e', is_final: true, sort_order: 4 },
    { name: 'Spoiled', name_fr: 'Avariée', name_ar: 'تالفة', value: 'spoiled', color: '#ef4444', is_final: true, sort_order: 5 },
  ]);

  await seedCollection('Intended Uses', 'intended-uses', [
    { name: 'Local Market', name_fr: 'Marché local', name_ar: 'السوق المحلي', value: 'market', icon: '🏪', sort_order: 1 },
    { name: 'Storage', name_fr: 'Stockage', name_ar: 'التخزين', value: 'storage', icon: '📦', sort_order: 2 },
    { name: 'Processing', name_fr: 'Transformation', name_ar: 'التحويل', value: 'processing', icon: '🏭', sort_order: 3 },
    { name: 'Export', name_fr: 'Export', name_ar: 'التصدير', value: 'export', icon: '🚢', sort_order: 4 },
    { name: 'Direct Client', name_fr: 'Client direct', name_ar: 'عميل مباشر', value: 'direct_client', icon: '🤝', sort_order: 5 },
  ]);

  await seedCollection('Utility Types', 'utility-types', [
    { name: 'Electricity', name_fr: 'Électricité', name_ar: 'الكهرباء', value: 'electricity', icon: 'Zap', color: '#f59e0b', default_unit: 'kWh', sort_order: 1 },
    { name: 'Water', name_fr: 'Eau', name_ar: 'الماء', value: 'water', icon: 'Droplets', color: '#3b82f6', default_unit: 'm³', sort_order: 2 },
    { name: 'Diesel', name_fr: 'Diesel', name_ar: 'الديزل', value: 'diesel', icon: 'Fuel', color: '#6b7280', default_unit: 'L', sort_order: 3 },
    { name: 'Gas', name_fr: 'Gaz', name_ar: 'الغاز', value: 'gas', icon: 'Fuel', color: '#ef4444', default_unit: 'kg', sort_order: 4 },
    { name: 'Internet', name_fr: 'Internet', name_ar: 'الإنترنت', value: 'internet', icon: 'Wifi', color: '#8b5cf6', sort_order: 5 },
    { name: 'Phone', name_fr: 'Téléphone', name_ar: 'الهاتف', value: 'phone', icon: 'Phone', color: '#22c55e', sort_order: 6 },
    { name: 'Other', name_fr: 'Autre', name_ar: 'أخرى', value: 'other', icon: 'Plus', color: '#6b7280', sort_order: 7 },
  ]);

  await seedCollection('Infrastructure Types', 'infrastructure-types', [
    { name: 'Stable', name_fr: 'Écurie', name_ar: 'اسطبل', value: 'stable', category: 'building', sort_order: 1 },
    { name: 'Technical Room', name_fr: 'Local technique', name_ar: 'غرفة تقنية', value: 'technical_room', category: 'building', sort_order: 2 },
    { name: 'Basin', name_fr: 'Bassin', name_ar: 'حوض', value: 'basin', category: 'water', sort_order: 3 },
    { name: 'Well', name_fr: 'Puits', name_ar: 'بئر', value: 'well', category: 'water', sort_order: 4 },
    { name: 'Warehouse', name_fr: 'Entrepôt', name_ar: 'مستودع', value: 'warehouse', category: 'storage', sort_order: 5 },
    { name: 'Cold Storage', name_fr: 'Chambre froide', name_ar: 'غرفة التبريد', value: 'cold_storage', category: 'storage', sort_order: 6 },
    { name: 'Pump Station', name_fr: 'Station de pompage', name_ar: 'محطة ضخ', value: 'pump_station', category: 'equipment', sort_order: 7 },
  ]);

  await seedCollection('Basin Shapes', 'basin-shapes', [
    { name: 'Trapezoidal', name_fr: 'Trapézoïdal', name_ar: 'شبه منحرف', value: 'trapezoidal', volume_formula: '((A1+A2)/2)*h*L', sort_order: 1 },
    { name: 'Rectangular', name_fr: 'Rectangulaire', name_ar: 'مستطيل', value: 'rectangular', volume_formula: 'L*W*H', sort_order: 2 },
    { name: 'Cubic', name_fr: 'Cubique', name_ar: 'مكعب', value: 'cubic', volume_formula: 'S^3', sort_order: 3 },
    { name: 'Circular', name_fr: 'Circulaire', name_ar: 'دائري', value: 'circular', volume_formula: 'π*r²*h', sort_order: 4 },
  ]);

  await seedCollection('Payment Methods', 'payment-methods', [
    { name: 'Cash', name_fr: 'Espèces', name_ar: 'نقداً', value: 'cash', icon: '💵', requires_reference: false, sort_order: 1 },
    { name: 'Bank Transfer', name_fr: 'Virement bancaire', name_ar: 'تحويل بنكي', value: 'bank_transfer', icon: '🏦', requires_reference: true, sort_order: 2 },
    { name: 'Check', name_fr: 'Chèque', name_ar: 'شيك', value: 'check', icon: '📝', requires_reference: true, sort_order: 3 },
    { name: 'Mobile Money', name_fr: 'Mobile Money', name_ar: 'المحفظة الإلكترونية', value: 'mobile_money', icon: '📱', requires_reference: true, sort_order: 4 },
  ]);

  await seedCollection('Payment Statuses', 'payment-statuses', [
    { name: 'Pending', name_fr: 'En attente', name_ar: 'قيد الانتظار', value: 'pending', color: '#f59e0b', is_final: false, sort_order: 1 },
    { name: 'Approved', name_fr: 'Approuvé', name_ar: 'موافق عليه', value: 'approved', color: '#3b82f6', is_final: false, sort_order: 2 },
    { name: 'Paid', name_fr: 'Payé', name_ar: 'مدفوع', value: 'paid', color: '#22c55e', is_final: true, sort_order: 3 },
    { name: 'Disputed', name_fr: 'Contesté', name_ar: 'متنازع عليه', value: 'disputed', color: '#ef4444', is_final: false, sort_order: 4 },
    { name: 'Cancelled', name_fr: 'Annulé', name_ar: 'ملغى', value: 'cancelled', color: '#6b7280', is_final: true, sort_order: 5 },
  ]);

  await seedCollection('Task Priorities', 'task-priorities', [
    { name: 'Low', name_fr: 'Basse', name_ar: 'منخفضة', value: 'low', level: 1, color: '#22c55e', sort_order: 1 },
    { name: 'Medium', name_fr: 'Moyenne', name_ar: 'متوسطة', value: 'medium', level: 2, color: '#3b82f6', sort_order: 2 },
    { name: 'High', name_fr: 'Haute', name_ar: 'عالية', value: 'high', level: 3, color: '#f59e0b', sort_order: 3 },
    { name: 'Urgent', name_fr: 'Urgente', name_ar: 'عاجلة', value: 'urgent', level: 4, color: '#ef4444', sort_order: 4 },
  ]);

  await seedCollection('Worker Types', 'worker-types', [
    { name: 'Fixed Salary', name_fr: 'Salaire fixe', name_ar: 'راتب ثابت', value: 'fixed_salary', payment_frequency: 'monthly', sort_order: 1 },
    { name: 'Daily Worker', name_fr: 'Journalier', name_ar: 'عامل يومي', value: 'daily_worker', payment_frequency: 'daily', sort_order: 2 },
    { name: 'Sharecropper', name_fr: 'Métayer', name_ar: 'مزارع بالمشاركة', value: 'metayage', payment_frequency: 'harvest_share', sort_order: 3 },
  ]);

  await seedCollection('Metayage Types', 'metayage-types', [
    { name: 'Khammass (1/5)', name_fr: 'Khammass (1/5)', name_ar: 'خماس', value: 'khammass', worker_share_percentage: 20, owner_share_percentage: 80, sort_order: 1 },
    { name: 'Rebaa (1/4)', name_fr: 'Rebaa (1/4)', name_ar: 'ربع', value: 'rebaa', worker_share_percentage: 25, owner_share_percentage: 75, sort_order: 2 },
    { name: 'Tholth (1/3)', name_fr: 'Tholth (1/3)', name_ar: 'ثلث', value: 'tholth', worker_share_percentage: 33.33, owner_share_percentage: 66.67, sort_order: 3 },
    { name: 'Noss (1/2)', name_fr: 'Noss (1/2)', name_ar: 'نص', value: 'noss', worker_share_percentage: 50, owner_share_percentage: 50, sort_order: 4 },
    { name: 'Custom', name_fr: 'Personnalisé', name_ar: 'مخصص', value: 'custom', sort_order: 5 },
  ]);

  await seedCollection('Document Types', 'document-types', [
    { name: 'Invoice', name_fr: 'Facture', name_ar: 'فاتورة', value: 'invoice', prefix: 'INV', requires_numbering: true, sort_order: 1 },
    { name: 'Quote', name_fr: 'Devis', name_ar: 'عرض أسعار', value: 'quote', prefix: 'QUO', requires_numbering: true, sort_order: 2 },
    { name: 'Sales Order', name_fr: 'Bon de commande', name_ar: 'أمر مبيعات', value: 'sales_order', prefix: 'SO', requires_numbering: true, sort_order: 3 },
    { name: 'Purchase Order', name_fr: 'Bon de commande achat', name_ar: 'أمر شراء', value: 'purchase_order', prefix: 'PO', requires_numbering: true, sort_order: 4 },
    { name: 'Delivery Note', name_fr: 'Bon de livraison', name_ar: 'إذن تسليم', value: 'delivery_note', prefix: 'DN', requires_numbering: true, sort_order: 5 },
    { name: 'Report', name_fr: 'Rapport', name_ar: 'تقرير', value: 'report', prefix: 'RPT', requires_numbering: false, sort_order: 6 },
  ]);

  await seedCollection('Currencies', 'currencies', [
    { name: 'Moroccan Dirham', name_fr: 'Dirham Marocain', code: 'MAD', symbol: 'DH', symbol_position: 'after', decimal_places: 2, country_code: 'MA', sort_order: 1 },
    { name: 'Euro', name_fr: 'Euro', code: 'EUR', symbol: '€', symbol_position: 'before', decimal_places: 2, country_code: 'EU', sort_order: 2 },
    { name: 'US Dollar', name_fr: 'Dollar US', code: 'USD', symbol: '$', symbol_position: 'before', decimal_places: 2, country_code: 'US', sort_order: 3 },
    { name: 'British Pound', name_fr: 'Livre Sterling', code: 'GBP', symbol: '£', symbol_position: 'before', decimal_places: 2, country_code: 'GB', sort_order: 4 },
    { name: 'CFA Franc', name_fr: 'Franc CFA', code: 'XOF', symbol: 'FCFA', symbol_position: 'after', decimal_places: 0, country_code: 'SN', sort_order: 5 },
  ]);

  await seedCollection('Timezones', 'timezones', [
    { name: 'Morocco (Africa/Casablanca)', name_fr: 'Maroc (Africa/Casablanca)', value: 'Africa/Casablanca', offset: '+01:00', region: 'Africa', country_code: 'MA', sort_order: 1 },
    { name: 'Paris (Europe/Paris)', name_fr: 'Paris (Europe/Paris)', value: 'Europe/Paris', offset: '+01:00', region: 'Europe', country_code: 'FR', sort_order: 2 },
    { name: 'London (Europe/London)', name_fr: 'Londres (Europe/London)', value: 'Europe/London', offset: '+00:00', region: 'Europe', country_code: 'GB', sort_order: 3 },
    { name: 'New York (America/New_York)', name_fr: 'New York (America/New_York)', value: 'America/New_York', offset: '-05:00', region: 'America', country_code: 'US', sort_order: 4 },
    { name: 'Dakar (Africa/Dakar)', name_fr: 'Dakar (Africa/Dakar)', value: 'Africa/Dakar', offset: '+00:00', region: 'Africa', country_code: 'SN', sort_order: 5 },
    { name: 'UTC', name_fr: 'UTC', value: 'UTC', offset: '+00:00', region: 'Global', sort_order: 6 },
  ]);

  await seedCollection('Languages', 'languages', [
    { name: 'French', native_name: 'Français', code: 'fr', locale: 'fr-FR', direction: 'ltr', is_default: true, sort_order: 1 },
    { name: 'English', native_name: 'English', code: 'en', locale: 'en-US', direction: 'ltr', is_default: false, sort_order: 2 },
    { name: 'Arabic', native_name: 'العربية', code: 'ar', locale: 'ar-MA', direction: 'rtl', is_default: false, sort_order: 3 },
    { name: 'Spanish', native_name: 'Español', code: 'es', locale: 'es-ES', direction: 'ltr', is_default: false, sort_order: 4 },
  ]);

  await seedCollection('Lab Service Categories', 'lab-service-categories', [
    { name: 'Soil Analysis', name_fr: 'Analyses de Sol', name_ar: 'تحليل التربة', value: 'soil', description_fr: 'Analyses physico-chimiques et microbiologiques', icon: '🌍', sort_order: 1 },
    { name: 'Foliar Analysis', name_fr: 'Analyses Foliaires', name_ar: 'تحليل الأوراق', value: 'leaf', description_fr: 'Diagnostic nutritionnel des plantes', icon: '🍃', sort_order: 2 },
    { name: 'Water Analysis', name_fr: "Analyses d'Eau", name_ar: 'تحليل المياه', value: 'water', description_fr: "Qualité de l'eau d'irrigation", icon: '💧', sort_order: 3 },
    { name: 'Tissue Analysis', name_fr: 'Analyses Tissulaires', name_ar: 'تحليل الأنسجة', value: 'tissue', description_fr: 'Analyses de tissus végétaux', icon: '🔬', sort_order: 4 },
    { name: 'Other', name_fr: 'Autres', name_ar: 'أخرى', value: 'other', description_fr: "Autres types d'analyses", icon: '📋', sort_order: 5 },
  ]);

  await seedCollection('Soil Textures', 'soil-textures', [
    { name: 'Sand', name_fr: 'Sable', name_ar: 'رمل', value: 'sand', sort_order: 1 },
    { name: 'Loamy Sand', name_fr: 'Sable limoneux', name_ar: 'رمل طميي', value: 'loamy_sand', sort_order: 2 },
    { name: 'Sandy Loam', name_fr: 'Limon sableux', name_ar: 'طمي رملي', value: 'sandy_loam', sort_order: 3 },
    { name: 'Loam', name_fr: 'Limon', name_ar: 'طمي', value: 'loam', sort_order: 4 },
    { name: 'Silt Loam', name_fr: 'Limon argileux', name_ar: 'طمي غريني', value: 'silt_loam', sort_order: 5 },
    { name: 'Silt', name_fr: 'Silt', name_ar: 'غرين', value: 'silt', sort_order: 6 },
    { name: 'Clay Loam', name_fr: 'Argile limoneuse', name_ar: 'طمي طيني', value: 'clay_loam', sort_order: 7 },
    { name: 'Silty Clay Loam', name_fr: 'Argile silteuse limoneuse', name_ar: 'طمي طيني غريني', value: 'silty_clay_loam', sort_order: 8 },
    { name: 'Sandy Clay', name_fr: 'Argile sableuse', name_ar: 'طين رملي', value: 'sandy_clay', sort_order: 9 },
    { name: 'Silty Clay', name_fr: 'Argile silteuse', name_ar: 'طين غريني', value: 'silty_clay', sort_order: 10 },
    { name: 'Clay', name_fr: 'Argile', name_ar: 'طين', value: 'clay', sort_order: 11 },
  ]);

  await seedCollection('Cost Categories', 'cost-categories', [
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
  ]);

  await seedCollection('Revenue Categories', 'revenue-categories', [
    { name: 'Product Sales', name_fr: 'Ventes de produits', name_ar: 'مبيعات المنتجات', value: 'product_sales', icon: '💰', sort_order: 1 },
    { name: 'Service Income', name_fr: 'Revenus de services', name_ar: 'إيرادات الخدمات', value: 'service_income', icon: '🛠️', sort_order: 2 },
    { name: 'Other Income', name_fr: 'Autres revenus', name_ar: 'إيرادات أخرى', value: 'other_income', icon: '📊', sort_order: 3 },
  ]);

  await seedCollection('Sale Types', 'sale-types', [
    { name: 'Market Sale', name_fr: 'Vente au marché', name_ar: 'بيع بالسوق', value: 'market', requires_client: false, sort_order: 1 },
    { name: 'Export Sale', name_fr: 'Vente export', name_ar: 'بيع للتصدير', value: 'export', requires_client: true, sort_order: 2 },
    { name: 'Wholesale', name_fr: 'Vente en gros', name_ar: 'بيع بالجملة', value: 'wholesale', requires_client: true, sort_order: 3 },
    { name: 'Direct Sale', name_fr: 'Vente directe', name_ar: 'بيع مباشر', value: 'direct', requires_client: true, sort_order: 4 },
    { name: 'Processing', name_fr: 'Transformation', name_ar: 'تحويل', value: 'processing', requires_client: false, sort_order: 5 },
  ]);

  await seedCollection('Experience Levels', 'experience-levels', [
    { name: 'Basic', name_fr: 'Débutant', name_ar: 'مبتدئ', value: 'basic', level: 1, wage_multiplier: 1.0, sort_order: 1 },
    { name: 'Medium', name_fr: 'Intermédiaire', name_ar: 'متوسط', value: 'medium', level: 2, wage_multiplier: 1.15, sort_order: 2 },
    { name: 'Expert', name_fr: 'Expert', name_ar: 'خبير', value: 'expert', level: 3, wage_multiplier: 1.3, sort_order: 3 },
  ]);

  await seedCollection('Seasonalities', 'seasonalities', [
    { name: 'Spring', name_fr: 'Printemps', name_ar: 'الربيع', value: 'spring', start_month: 3, end_month: 5, color: '#22c55e', sort_order: 1 },
    { name: 'Summer', name_fr: 'Été', name_ar: 'الصيف', value: 'summer', start_month: 6, end_month: 8, color: '#f59e0b', sort_order: 2 },
    { name: 'Autumn', name_fr: 'Automne', name_ar: 'الخريف', value: 'autumn', start_month: 9, end_month: 11, color: '#ef4444', sort_order: 3 },
    { name: 'Winter', name_fr: 'Hiver', name_ar: 'الشتاء', value: 'winter', start_month: 12, end_month: 2, color: '#3b82f6', sort_order: 4 },
    { name: 'Year Round', name_fr: "Toute l'année", name_ar: 'طوال السنة', value: 'year-round', color: '#6b7280', sort_order: 5 },
  ]);

  await seedCollection('Delivery Types', 'delivery-types', [
    { name: 'Market Sale', name_fr: 'Vente au marché', name_ar: 'بيع بالسوق', value: 'market_sale', requires_destination: true, sort_order: 1 },
    { name: 'Export', name_fr: 'Export', name_ar: 'تصدير', value: 'export', requires_destination: true, sort_order: 2 },
    { name: 'Processor', name_fr: 'Transformateur', name_ar: 'مصنع', value: 'processor', requires_destination: true, sort_order: 3 },
    { name: 'Direct Client', name_fr: 'Client direct', name_ar: 'عميل مباشر', value: 'direct_client', requires_destination: true, sort_order: 4 },
    { name: 'Wholesale', name_fr: 'Grossiste', name_ar: 'تاجر جملة', value: 'wholesale', requires_destination: true, sort_order: 5 },
  ]);

  await seedCollection('Delivery Statuses', 'delivery-statuses', [
    { name: 'Pending', name_fr: 'En attente', name_ar: 'قيد الانتظار', value: 'pending', color: '#f59e0b', is_final: false, sort_order: 1 },
    { name: 'Prepared', name_fr: 'Préparée', name_ar: 'جاهزة', value: 'prepared', color: '#3b82f6', is_final: false, sort_order: 2 },
    { name: 'In Transit', name_fr: 'En transit', name_ar: 'في الطريق', value: 'in_transit', color: '#8b5cf6', is_final: false, sort_order: 3 },
    { name: 'Delivered', name_fr: 'Livrée', name_ar: 'تم التسليم', value: 'delivered', color: '#22c55e', is_final: true, sort_order: 4 },
    { name: 'Cancelled', name_fr: 'Annulée', name_ar: 'ملغاة', value: 'cancelled', color: '#6b7280', is_final: true, sort_order: 5 },
    { name: 'Returned', name_fr: 'Retournée', name_ar: 'مرتجعة', value: 'returned', color: '#ef4444', is_final: true, sort_order: 6 },
  ]);

  console.log('\n✅ All reference data seeded successfully!');
  console.log('\nRun the agronomy seed script separately for soil types, irrigation types, trees, and crops:');
  console.log('  node scripts/seed-agronomy-reference-data.js');
}

main().catch(console.error);
