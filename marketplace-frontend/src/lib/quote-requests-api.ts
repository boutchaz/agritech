import { ApiClient } from './api';

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
  status: string;
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
  };
  requester?: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string;
    city?: string;
  };
}

export class QuoteRequestsApi {
  /**
   * Create a new quote request
   */
  static async create(data: CreateQuoteRequestDto): Promise<QuoteRequest> {
    return ApiClient['request']<QuoteRequest>('/marketplace/quote-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get quote requests sent by current user (buyer)
   */
  static async getSent(status?: string): Promise<QuoteRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return ApiClient['request']<QuoteRequest[]>(`/marketplace/quote-requests/sent${params}`);
  }

  /**
   * Get quote requests received by current user (seller)
   */
  static async getReceived(status?: string): Promise<QuoteRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return ApiClient['request']<QuoteRequest[]>(`/marketplace/quote-requests/received${params}`);
  }

  /**
   * Get a specific quote request
   */
  static async getById(id: string): Promise<QuoteRequest> {
    return ApiClient['request']<QuoteRequest>(`/marketplace/quote-requests/${id}`);
  }

  /**
   * Accept a quoted request
   */
  static async accept(id: string): Promise<QuoteRequest> {
    return ApiClient['request']<QuoteRequest>(`/marketplace/quote-requests/${id}/accept`, {
      method: 'POST',
    });
  }

  /**
   * Decline a quoted request
   */
  static async decline(id: string): Promise<QuoteRequest> {
    return ApiClient['request']<QuoteRequest>(`/marketplace/quote-requests/${id}/decline`, {
      method: 'POST',
    });
  }

  /**
   * Get seller statistics
   */
  static async getStats(): Promise<{
    total_requests: number;
    pending_requests: number;
    responded_requests: number;
    accepted_requests: number;
  }> {
    return ApiClient['request'](`/marketplace/quote-requests/stats`);
  }
}
