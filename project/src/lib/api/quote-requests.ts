import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/marketplace/quote-requests';

export interface QuoteRequest {
  id: string;
  requester_organization_id: string;
  seller_organization_id: string;
  item_id?: string;
  listing_id?: string;
  product_title: string;
  product_description?: string;
  requested_quantity?: number;
  unit_of_measure?: string;
  message?: string;
  buyer_contact_name?: string;
  buyer_contact_email?: string;
  buyer_contact_phone?: string;
  status: 'pending' | 'viewed' | 'responded' | 'quoted' | 'accepted' | 'declined' | 'cancelled';
  seller_response?: string;
  quoted_price?: number;
  quoted_currency?: string;
  quote_valid_until?: string;
  created_at: string;
  updated_at: string;
  viewed_at?: string;
  responded_at?: string;
  seller?: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string;
    city?: string;
    email?: string;
    phone?: string;
  };
  requester?: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string;
    city?: string;
    email?: string;
    phone?: string;
  };
  item?: {
    id: string;
    item_name: string;
    image_url?: string;
    standard_rate?: number;
    default_unit?: string;
  };
  listing?: {
    id: string;
    title: string;
    images?: string[];
    price?: number;
    unit?: string;
  };
}

export interface CreateQuoteRequestDto {
  item_id?: string;
  listing_id?: string;
  product_title: string;
  product_description?: string;
  requested_quantity?: number;
  unit_of_measure?: string;
  message?: string;
  buyer_contact_name?: string;
  buyer_contact_email?: string;
  buyer_contact_phone?: string;
  seller_organization_id: string;
}

export interface UpdateQuoteRequestDto {
  status?: 'pending' | 'viewed' | 'responded' | 'quoted' | 'accepted' | 'declined' | 'cancelled';
  seller_response?: string;
  quoted_price?: number;
  quoted_currency?: string;
  quote_valid_until?: string;
}

export interface QuoteRequestStats {
  total_requests: number;
  pending_requests: number;
  responded_requests: number;
  accepted_requests: number;
}

export const quoteRequestsApi = {
  /**
   * Create a new quote request
   */
  async create(dto: CreateQuoteRequestDto, organizationId?: string): Promise<QuoteRequest> {
    return apiClient.post<QuoteRequest>(BASE_URL, dto, {}, organizationId);
  },

  /**
   * Get quote requests sent by current organization (as buyer)
   */
  async getSent(status?: string, organizationId?: string): Promise<QuoteRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<QuoteRequest[]>(`${BASE_URL}/sent${params}`, {}, organizationId);
  },

  /**
   * Get quote requests received by current organization (as seller)
   */
  async getReceived(status?: string, organizationId?: string): Promise<QuoteRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<QuoteRequest[]>(`${BASE_URL}/received${params}`, {}, organizationId);
  },

  /**
   * Get a specific quote request by ID
   */
  async getById(id: string, organizationId?: string): Promise<QuoteRequest> {
    return apiClient.get<QuoteRequest>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Update a quote request (seller responding or buyer accepting/declining)
   */
  async update(id: string, dto: UpdateQuoteRequestDto, organizationId?: string): Promise<QuoteRequest> {
    return apiClient.patch<QuoteRequest>(`${BASE_URL}/${id}`, dto, {}, organizationId);
  },

  /**
   * Get seller statistics
   */
  async getStats(organizationId?: string): Promise<QuoteRequestStats> {
    return apiClient.get<QuoteRequestStats>(`${BASE_URL}/stats`, {}, organizationId);
  },
};
