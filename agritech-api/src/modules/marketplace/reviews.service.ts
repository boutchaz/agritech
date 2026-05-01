import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { CreateReviewDto } from './dto/create-review.dto';

export interface Review {
  id: string;
  reviewer_organization_id: string;
  reviewee_organization_id: string;
  order_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async resolveUserOrg(token: string): Promise<{ userId: string; organizationId: string | null }> {
    const secret = this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, { secret });
    const userId = payload.sub;

    const { data: userData } = await this.databaseService.getAdminClient()
      .from('auth_users_view')
      .select('organization_id')
      .eq('id', userId)
      .single();

    return { userId, organizationId: userData?.organization_id ?? null };
  }

  async canReview(token: string, sellerOrganizationId: string): Promise<{ canReview: boolean; reason?: string }> {
    const { userId, organizationId: myOrgId } = await this.resolveUserOrg(token);
    const supabase = this.databaseService.getAdminClient();

    if (!userId) {
      return { canReview: false, reason: 'Unauthorized' };
    }

    if (!myOrgId) {
      return { canReview: false, reason: 'No organization' };
    }

    const { data: deliveredOrders } = await supabase
      .from('marketplace_orders')
      .select('id')
      .eq('buyer_organization_id', myOrgId)
      .eq('seller_organization_id', sellerOrganizationId)
      .eq('status', 'delivered');

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return { canReview: false, reason: 'No delivered order from this seller' };
    }

    const orderIds = deliveredOrders.map(o => o.id);
    const { data: existingReviews } = await supabase
      .from('marketplace_reviews')
      .select('order_id')
      .eq('reviewer_organization_id', myOrgId)
      .in('order_id', orderIds);

    const reviewedOrderIds = new Set((existingReviews || []).map(r => r.order_id));
    const unreviewedOrders = orderIds.filter(id => !reviewedOrderIds.has(id));

    if (unreviewedOrders.length === 0) {
      return { canReview: false, reason: 'All delivered orders already reviewed' };
    }

    return { canReview: true };
  }

  async createReview(token: string, dto: CreateReviewDto): Promise<Review> {
    const { userId, organizationId: myOrgId } = await this.resolveUserOrg(token);
    const supabase = this.databaseService.getAdminClient();

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!myOrgId) {
      throw new HttpException('No organization found', HttpStatus.FORBIDDEN);
    }

    const { data: order } = await supabase
      .from('marketplace_orders')
      .select('id, status, buyer_organization_id, seller_organization_id')
      .eq('id', dto.order_id)
      .single();

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.status !== 'delivered') {
      throw new HttpException('Order must be delivered to leave a review', HttpStatus.BAD_REQUEST);
    }

    if (order.buyer_organization_id !== myOrgId) {
      throw new HttpException('You can only review orders you placed', HttpStatus.FORBIDDEN);
    }

    if (order.seller_organization_id !== dto.reviewee_organization_id) {
      throw new HttpException('Reviewee organization does not match order seller', HttpStatus.BAD_REQUEST);
    }

    const { data: existingReview } = await supabase
      .from('marketplace_reviews')
      .select('id')
      .eq('order_id', dto.order_id)
      .eq('reviewer_organization_id', myOrgId)
      .single();

    if (existingReview) {
      throw new HttpException('You have already reviewed this order', HttpStatus.CONFLICT);
    }

    const { data: review, error } = await supabase
      .from('marketplace_reviews')
      .insert({
        reviewer_organization_id: myOrgId,
        reviewee_organization_id: dto.reviewee_organization_id,
        order_id: dto.order_id,
        rating: dto.rating,
        comment: dto.comment,
      })
      .select(`
        *,
        reviewer:organizations!marketplace_reviews_reviewer_organization_id_fkey(
          id, name, logo_url
        )
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to create review: ${error.message}`);
      throw new HttpException('Failed to create review', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    await this.updateSellerRating(dto.reviewee_organization_id);

    return review as Review;
  }

  private async updateSellerRating(sellerOrgId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { data: reviews } = await supabase
      .from('marketplace_reviews')
      .select('rating')
      .eq('reviewee_organization_id', sellerOrgId);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await supabase
        .from('organizations')
        .update({
          average_rating: Math.round(avgRating * 10) / 10,
          review_count: reviews.length,
        })
        .eq('id', sellerOrgId);
    }
  }
}
