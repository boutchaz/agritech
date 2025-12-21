import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MarketplaceService {
    private readonly logger = new Logger(MarketplaceService.name);

    constructor(
        private readonly databaseService: DatabaseService
    ) { }

    /**
     * Fetch public products from Supabase.
     * All content (descriptions, images, SEO) is now in marketplace_listings table.
     */
    async getPublicProducts(category?: string) {
        const supabase = this.databaseService.getAdminClient();

        let query = supabase
            .from('marketplace_listings')
            .select('*')
            .eq('is_public', true)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('product_category_id', category);
        }

        const { data: listings, error } = await query;

        if (error) {
            this.logger.error(`Error fetching public products: ${error.message}`);
            throw error;
        }

        return listings || [];
    }

    async getProduct(id: string) {
        const supabase = this.databaseService.getAdminClient();

        const { data: listing, error } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('id', id)
            .eq('is_public', true)
            .single();

        if (error) {
            this.logger.error(`Error fetching product ${id}: ${error.message}`);
            return null;
        }

        return listing;
    }

    /**
     * Fetch dashboard stats for a seller.
     * Uses the user's Auth Token to create an RLS-scoped client.
     * This ensures they can only see their own data.
     */
    async getDashboardStats(token: string, organizationId?: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        const { count: listingsCount, error: listError } = await supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact', head: true });

        if (listError) {
            this.logger.error(`Error fetching listings stats: ${listError.message}`);
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { data: userData } = await supabase
            .from('auth_users_view')
            .select('organization_id')
            .eq('id', user?.id)
            .single();

        const myOrgId = userData?.organization_id;

        let ordersCount = 0;
        if (myOrgId) {
            const { count, error: orderError } = await supabase
                .from('marketplace_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_organization_id', myOrgId)
                .eq('status', 'pending');

            if (!orderError) ordersCount = count || 0;
        }

        let revenue = 0;

        return {
            listingsCount: listingsCount || 0,
            ordersCount: ordersCount,
            revenue
        };
    }
}
