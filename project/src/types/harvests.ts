// =====================================================
// HARVEST AND DELIVERY MANAGEMENT TYPES
// =====================================================

export type HarvestUnit = 'kg' | 'tons' | 'units' | 'boxes' | 'crates' | 'liters';
export type QualityGrade = 'A' | 'B' | 'C' | 'Extra' | 'First' | 'Second' | 'Third';
export type HarvestStatus = 'stored' | 'in_delivery' | 'delivered' | 'sold' | 'spoiled';
export type IntendedFor = 'market' | 'storage' | 'processing' | 'export' | 'direct_client';

export type DeliveryType = 'market_sale' | 'export' | 'processor' | 'direct_client' | 'wholesale';
export type DeliveryStatus = 'pending' | 'prepared' | 'in_transit' | 'delivered' | 'cancelled' | 'returned';
export type DeliveryPaymentStatus = 'pending' | 'partial' | 'paid';

// =====================================================
// HARVEST RECORD
// =====================================================
export interface HarvestRecord {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  crop_id?: string;
  
  // Harvest Details
  harvest_date: string;
  quantity: number;
  unit: HarvestUnit;
  quality_grade?: QualityGrade;
  quality_notes?: string;
  quality_score?: number; // 1-10
  
  // Task Relation
  harvest_task_id?: string;
  
  // Workers Involved
  workers: HarvestWorker[];
  supervisor_id?: string;
  
  // Storage & Destination
  storage_location?: string;
  temperature?: number;
  humidity?: number;
  
  // Market/Delivery Intent
  intended_for?: IntendedFor;
  expected_price_per_unit?: number;
  estimated_revenue?: number; // calculated
  
  // Photos & Documentation
  photos?: string[];
  documents?: HarvestDocument[];
  
  // Status
  status: HarvestStatus;
  
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  farm_name?: string;
  parcel_name?: string;
  crop_name?: string;
  supervisor_name?: string;
}

export interface HarvestWorker {
  worker_id: string;
  worker_name?: string;
  hours_worked: number;
  quantity_picked?: number;
}

export interface HarvestDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

// =====================================================
// DELIVERY
// =====================================================
export interface Delivery {
  id: string;
  organization_id: string;
  farm_id: string;
  
  // Delivery Details
  delivery_date: string;
  delivery_type: DeliveryType;
  
  // Customer/Destination
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  delivery_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  
  // Products Summary
  total_quantity: number;
  total_amount: number;
  currency: string;
  
  // Logistics
  driver_id?: string;
  vehicle_info?: string;
  departure_time?: string;
  arrival_time?: string;
  distance_km?: number;
  
  // Status
  status: DeliveryStatus;
  
  // Payment
  payment_status: DeliveryPaymentStatus;
  payment_method?: string;
  payment_terms?: string;
  payment_received: number;
  payment_date?: string;
  
  // Documentation
  delivery_note_number?: string;
  invoice_number?: string;
  signature_image?: string;
  signature_name?: string;
  signature_date?: string;
  
  // Photos
  photos?: string[];
  
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  farm_name?: string;
  driver_name?: string;
  item_count?: number;
}

// =====================================================
// DELIVERY ITEM
// =====================================================
export interface DeliveryItem {
  id: string;
  delivery_id: string;
  harvest_record_id: string;
  
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number; // calculated
  
  // Quality at delivery
  quality_grade?: QualityGrade;
  quality_notes?: string;
  
  notes?: string;
  created_at: string;
  
  // Joined data
  harvest_date?: string;
  crop_name?: string;
  parcel_name?: string;
}

// =====================================================
// DELIVERY TRACKING
// =====================================================
export interface DeliveryTracking {
  id: string;
  delivery_id: string;
  
  status: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  
  notes?: string;
  photo_url?: string;
  
  recorded_by?: string;
  recorded_at: string;
  
  // Joined data
  recorded_by_name?: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface HarvestFilters {
  status?: HarvestStatus | HarvestStatus[];
  farm_id?: string;
  parcel_id?: string;
  crop_id?: string;
  date_from?: string;
  date_to?: string;
  quality_grade?: QualityGrade | QualityGrade[];
  intended_for?: IntendedFor;
}

export interface CreateHarvestRequest {
  farm_id: string;
  parcel_id: string;
  crop_id?: string;
  harvest_date: string;
  quantity: number;
  unit: HarvestUnit;
  quality_grade?: QualityGrade;
  quality_score?: number;
  quality_notes?: string;
  workers: Array<{
    worker_id: string;
    hours_worked: number;
    quantity_picked?: number;
  }>;
  supervisor_id?: string;
  storage_location?: string;
  temperature?: number;
  humidity?: number;
  intended_for?: IntendedFor;
  expected_price_per_unit?: number;
  harvest_task_id?: string;
  notes?: string;
}

export interface DeliveryFilters {
  status?: DeliveryStatus | DeliveryStatus[];
  payment_status?: DeliveryPaymentStatus | DeliveryPaymentStatus[];
  delivery_type?: DeliveryType | DeliveryType[];
  farm_id?: string;
  driver_id?: string;
  date_from?: string;
  date_to?: string;
  customer_name?: string;
}

export interface CreateDeliveryRequest {
  farm_id: string;
  delivery_date: string;
  delivery_type: DeliveryType;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  delivery_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  driver_id?: string;
  vehicle_info?: string;
  payment_method?: string;
  payment_terms?: string;
  items: Array<{
    harvest_record_id: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
  }>;
  notes?: string;
}

export interface UpdateDeliveryStatusRequest {
  delivery_id: string;
  status: DeliveryStatus;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  notes?: string;
  photo_url?: string;
}

export interface CompleteDeliveryRequest {
  delivery_id: string;
  signature_image: string;
  signature_name: string;
  arrival_time?: string;
  notes?: string;
}

// =====================================================
// SUMMARY VIEWS
// =====================================================
export interface HarvestSummary extends HarvestRecord {
  worker_count: number;
  delivery_count: number;
  quantity_delivered: number;
}

export interface DeliverySummary extends Delivery {
  tracking_update_count: number;
  items: DeliveryItem[];
}

// =====================================================
// STATISTICS
// =====================================================
export interface HarvestStatistics {
  total_harvests: number;
  total_quantity: number;
  total_revenue: number;
  average_quality_score: number;
  
  by_parcel: Array<{
    parcel_id: string;
    parcel_name: string;
    harvest_count: number;
    total_quantity: number;
  }>;
  
  by_crop: Array<{
    crop_id: string;
    crop_name: string;
    harvest_count: number;
    total_quantity: number;
    average_quality: number;
  }>;
  
  by_month: Array<{
    month: string;
    harvest_count: number;
    total_quantity: number;
    total_revenue: number;
  }>;
  
  quality_distribution: Record<QualityGrade, number>;
}

export interface DeliveryStatistics {
  total_deliveries: number;
  completed_deliveries: number;
  in_transit: number;
  total_revenue: number;
  outstanding_payments: number;
  
  by_customer: Array<{
    customer_name: string;
    delivery_count: number;
    total_amount: number;
    outstanding: number;
  }>;
  
  by_type: Record<DeliveryType, {
    count: number;
    total_amount: number;
  }>;
  
  on_time_rate: number;
  average_delivery_time: number; // hours
}

// =====================================================
// LABELS & HELPERS
// =====================================================
export const HARVEST_STATUS_LABELS: Record<HarvestStatus, { en: string; fr: string }> = {
  stored: { en: 'Stored', fr: 'Stockée' },
  in_delivery: { en: 'In Delivery', fr: 'En livraison' },
  delivered: { en: 'Delivered', fr: 'Livrée' },
  sold: { en: 'Sold', fr: 'Vendue' },
  spoiled: { en: 'Spoiled', fr: 'Avariée' },
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, { en: string; fr: string }> = {
  pending: { en: 'Pending', fr: 'En attente' },
  prepared: { en: 'Prepared', fr: 'Préparée' },
  in_transit: { en: 'In Transit', fr: 'En transit' },
  delivered: { en: 'Delivered', fr: 'Livrée' },
  cancelled: { en: 'Cancelled', fr: 'Annulée' },
  returned: { en: 'Returned', fr: 'Retournée' },
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, { en: string; fr: string }> = {
  market_sale: { en: 'Market Sale', fr: 'Vente marché' },
  export: { en: 'Export', fr: 'Export' },
  processor: { en: 'Processor', fr: 'Transformateur' },
  direct_client: { en: 'Direct Client', fr: 'Client direct' },
  wholesale: { en: 'Wholesale', fr: 'Grossiste' },
};

export const QUALITY_GRADE_LABELS: Record<QualityGrade, { en: string; fr: string }> = {
  Extra: { en: 'Extra', fr: 'Extra' },
  A: { en: 'A', fr: 'A' },
  First: { en: 'First', fr: 'Premier choix' },
  B: { en: 'B', fr: 'B' },
  Second: { en: 'Second', fr: 'Deuxième choix' },
  C: { en: 'C', fr: 'C' },
  Third: { en: 'Third', fr: 'Troisième choix' },
};

export const HARVEST_STATUS_COLORS: Record<HarvestStatus, string> = {
  stored: 'bg-blue-100 text-blue-800',
  in_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  sold: 'bg-emerald-100 text-emerald-800',
  spoiled: 'bg-red-100 text-red-800',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  prepared: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800',
};

// Helper functions
export function getHarvestStatusLabel(status: HarvestStatus, lang: 'en' | 'fr' = 'fr'): string {
  return HARVEST_STATUS_LABELS[status][lang];
}

export function getDeliveryStatusLabel(status: DeliveryStatus, lang: 'en' | 'fr' = 'fr'): string {
  return DELIVERY_STATUS_LABELS[status][lang];
}

export function getQualityGradeLabel(grade: QualityGrade, lang: 'en' | 'fr' = 'fr'): string {
  return QUALITY_GRADE_LABELS[grade][lang];
}

export function calculateHarvestRevenue(harvest: HarvestRecord): number {
  if (!harvest.expected_price_per_unit) return 0;
  return harvest.quantity * harvest.expected_price_per_unit;
}

export function calculateDeliveryBalance(delivery: Delivery): number {
  return delivery.total_amount - delivery.payment_received;
}

export function isDeliveryFullyPaid(delivery: Delivery): boolean {
  return delivery.payment_received >= delivery.total_amount;
}

