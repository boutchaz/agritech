import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';

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
}

@Injectable()
export class QuoteRequestsService {
  private readonly logger = new Logger(QuoteRequestsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new quote request
   */
  async create(
    dto: CreateQuoteRequestDto,
    requesterOrgId: string,
  ): Promise<QuoteRequest> {
    const supabase = this.databaseService.getAdminClient();

    // Validate that either item_id or listing_id is provided
    if (!dto.item_id && !dto.listing_id) {
      throw new HttpException(
        'Either item_id or listing_id must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data, error } = await supabase
      .from('marketplace_quote_requests')
      .insert({
        requester_organization_id: requesterOrgId,
        seller_organization_id: dto.seller_organization_id,
        item_id: dto.item_id,
        listing_id: dto.listing_id,
        product_title: dto.product_title,
        product_description: dto.product_description,
        requested_quantity: dto.requested_quantity,
        unit_of_measure: dto.unit_of_measure,
        message: dto.message,
        buyer_contact_name: dto.buyer_contact_name,
        buyer_contact_email: dto.buyer_contact_email,
        buyer_contact_phone: dto.buyer_contact_phone,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create quote request: ${error.message}`);
      throw new HttpException(
        'Failed to create quote request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Send email notification to seller (non-blocking)
    this.sendSellerNotification(data, dto.seller_organization_id).catch((err) => {
      this.logger.error(`Failed to send quote request email: ${err.message}`);
    });

    return data;
  }

  /**
   * Send email notification to seller about new quote request
   */
  private async sendSellerNotification(
    quoteRequest: QuoteRequest,
    sellerOrgId: string,
  ): Promise<void> {
    try {
      // Fetch seller organization details
      const supabase = this.databaseService.getAdminClient();
      const { data: seller, error } = await supabase
        .from('organizations')
        .select('name, email')
        .eq('id', sellerOrgId)
        .single();

      if (error || !seller || !seller.email) {
        this.logger.warn(`Seller email not found for organization ${sellerOrgId}`);
        return;
      }

      // Send email notification
      const dashboardUrl = process.env.DASHBOARD_URL || 'https://agritech-dashboard.thebzlab.online';
      const quoteRequestUrl = `${dashboardUrl}/marketplace/quote-requests/${quoteRequest.id}`;

      await this.notificationsService.sendQuoteRequestNotification(seller.email, {
        buyerName: quoteRequest.buyer_contact_name || 'Client',
        buyerEmail: quoteRequest.buyer_contact_email || '',
        buyerPhone: quoteRequest.buyer_contact_phone,
        productTitle: quoteRequest.product_title,
        requestedQuantity: quoteRequest.requested_quantity,
        unitOfMeasure: quoteRequest.unit_of_measure,
        message: quoteRequest.message,
        quoteRequestUrl,
      });

      this.logger.log(`Quote request notification sent to ${seller.email}`);
    } catch (error) {
      this.logger.error(`Failed to send seller notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get quote requests for a buyer (their outgoing requests)
   */
  async getBuyerRequests(
    organizationId: string,
    status?: string,
  ): Promise<QuoteRequest[]> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('marketplace_quote_requests')
      .select(`
        *,
        seller:organizations!marketplace_quote_requests_seller_organization_id_fkey(
          id,
          name,
          slug,
          logo_url,
          city
        ),
        item:items(id, item_name, image_url),
        listing:marketplace_listings(id, title, images)
      `)
      .eq('requester_organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch buyer requests: ${error.message}`);
      throw new HttpException(
        'Failed to fetch quote requests',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data || [];
  }

  /**
   * Get quote requests for a seller (their incoming requests)
   */
  async getSellerRequests(
    organizationId: string,
    status?: string,
  ): Promise<QuoteRequest[]> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('marketplace_quote_requests')
      .select(`
        *,
        requester:organizations!marketplace_quote_requests_requester_organization_id_fkey(
          id,
          name,
          slug,
          logo_url,
          city
        ),
        item:items(id, item_name, image_url),
        listing:marketplace_listings(id, title, images)
      `)
      .eq('seller_organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch seller requests: ${error.message}`);
      throw new HttpException(
        'Failed to fetch quote requests',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data || [];
  }

  /**
   * Get a single quote request by ID
   */
  async getById(id: string, organizationId: string): Promise<QuoteRequest> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('marketplace_quote_requests')
      .select(`
        *,
        requester:organizations!marketplace_quote_requests_requester_organization_id_fkey(
          id,
          name,
          slug,
          logo_url,
          city,
          email,
          phone
        ),
        seller:organizations!marketplace_quote_requests_seller_organization_id_fkey(
          id,
          name,
          slug,
          logo_url,
          city,
          email,
          phone
        ),
        item:items(id, item_name, image_url, standard_rate, default_unit),
        listing:marketplace_listings(id, title, images, price, unit)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new HttpException('Quote request not found', HttpStatus.NOT_FOUND);
    }

    // Verify that the user has access to this quote request
    if (
      data.requester_organization_id !== organizationId &&
      data.seller_organization_id !== organizationId
    ) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    // Mark as viewed if seller is viewing for the first time
    if (
      data.seller_organization_id === organizationId &&
      !data.viewed_at &&
      data.status === 'pending'
    ) {
      await supabase
        .from('marketplace_quote_requests')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    return data;
  }

  /**
   * Update a quote request (seller responding/buyer cancelling)
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateQuoteRequestDto,
  ): Promise<QuoteRequest> {
    const supabase = this.databaseService.getAdminClient();

    // First verify access
    const existing = await this.getById(id, organizationId);

    // Determine update data based on role
    const updateData: any = {};

    if (existing.seller_organization_id === organizationId) {
      // Seller updating
      if (dto.status) updateData.status = dto.status;
      if (dto.seller_response) updateData.seller_response = dto.seller_response;
      if (dto.quoted_price !== undefined)
        updateData.quoted_price = dto.quoted_price;
      if (dto.quoted_currency) updateData.quoted_currency = dto.quoted_currency;
      if (dto.quote_valid_until)
        updateData.quote_valid_until = dto.quote_valid_until;

      // Set responded_at if providing a response
      if (dto.seller_response || dto.quoted_price !== undefined) {
        updateData.responded_at = new Date().toISOString();
        if (!dto.status) {
          updateData.status = dto.quoted_price ? 'quoted' : 'responded';
        }
      }
    } else if (existing.requester_organization_id === organizationId) {
      // Buyer updating (only allow status changes to accepted/cancelled)
      if (dto.status && ['accepted', 'cancelled'].includes(dto.status)) {
        updateData.status = dto.status;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpException('No valid updates provided', HttpStatus.BAD_REQUEST);
    }

    const { data, error } = await supabase
      .from('marketplace_quote_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update quote request: ${error.message}`);
      throw new HttpException(
        'Failed to update quote request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data;
  }

  /**
   * Get quote request statistics for a seller
   */
  async getSellerStats(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase.rpc('get_seller_quote_stats', {
      seller_org_id: organizationId,
    });

    if (error) {
      this.logger.error(`Failed to fetch seller stats: ${error.message}`);
      return {
        total_requests: 0,
        pending_requests: 0,
        responded_requests: 0,
        accepted_requests: 0,
      };
    }

    return data[0] || {
      total_requests: 0,
      pending_requests: 0,
      responded_requests: 0,
      accepted_requests: 0,
    };
  }
}
