import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StrapiService } from '../strapi/strapi.service';

@Injectable()
export class MarketplaceService {
    private readonly logger = new Logger(MarketplaceService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly strapiService: StrapiService
    ) { }

    /**
     * Fetch public products.
     * Fetches active listings from Supabase and merges with Strapi content.
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
            // TODO: Filter by category logic (might need to filter AFTER strapi fetch if category is only in strapi)
        }

        const { data: listings, error } = await query;

        if (error) {
            this.logger.error(`Error fetching public products: ${error.message}`);
            throw error;
        }

        // Enhance listings with Strapi content
        const enhancedListings = await Promise.all(
            (listings || []).map(async (listing) => {
                const content = await this.strapiService.getProductByListingId(listing.id);
                return {
                    ...listing,
                    content: content || null,
                    // Fallback for key fields if content missing
                    title: content?.title || listing.title,
                    image: content?.mainImage?.url || null // Map Strapi media URL
                };
            })
        );

        return enhancedListings;
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

        // Fetch rich content from Strapi
        const content = await this.strapiService.getProductByListingId(id);

        return {
            ...listing,
            content: content || null
        };
    }

    /**
     * Fetch dashboard stats for a seller.
     * Uses the user's Auth Token to create an RLS-scoped client.
     * This ensures they can only see their own data.
     */
    async getDashboardStats(token: string, organizationId?: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        // 1. Get User Info to identify organization if not provided
        // (In strict RLS, we don't even need orgId if the policy filters by auth.uid() -> org)
        // However, our policy is: organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())

        // Let's rely on the Supabase Policy for security.

        const { count: listingsCount, error: listError } = await supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact', head: true });

        if (listError) {
            this.logger.error(`Error fetching listings stats: ${listError.message}`);
        }

        // Determine organization ID for Orders query if needed (since orders might be shared)
        // Actually, our RLS says: "Participants can view orders".
        // So simple select count should work for "My Orders" (either buyer or seller).
        // But specific "Pending Orders" usually implies "Orders I need to fulfill" (Seller).

        // We might need to know WHICH org we are acting as to filter seller_organization_id = my_org.
        // Let's fetch the user's org first.
        const { data: { user } } = await supabase.auth.getUser();

        // We can query auth_users_view with the same token
        const { data: userData } = await supabase
            .from('auth_users_view')
            .select('organization_id')
            .eq('id', user?.id)
            .single();

        const myOrgId = userData?.organization_id;

        // Count pending orders where I am the seller
        let ordersCount = 0;
        if (myOrgId) {
            const { count, error: orderError } = await supabase
                .from('marketplace_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_organization_id', myOrgId)
                .eq('status', 'pending');

            if (!orderError) ordersCount = count || 0;
        }

        // Calculate generic revenue (completed or shipped orders)
        let revenue = 0;
        // Calculation would go here (e.g., sum of total_amount for delivered orders)

        return {
            listingsCount: listingsCount || 0,
            ordersCount: ordersCount,
            revenue
        };
    }
}
