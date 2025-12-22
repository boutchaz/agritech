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
     * Combines marketplace_listings AND items marked as is_sales_item.
     */
    async getPublicProducts(category?: string) {
        const supabase = this.databaseService.getAdminClient();

        // Fetch marketplace listings
        let listingsQuery = supabase
            .from('marketplace_listings')
            .select('*')
            .eq('is_public', true)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (category) {
            listingsQuery = listingsQuery.eq('product_category_id', category);
        }

        const { data: listings, error: listingsError } = await listingsQuery;

        if (listingsError) {
            this.logger.error(`Error fetching marketplace listings: ${listingsError.message}`);
        }

        // Fetch items marked as sales items AND published to marketplace (from stock/items)
        const { data: salesItems, error: itemsError } = await supabase
            .from('items')
            .select(`
                id,
                organization_id,
                item_code,
                item_name,
                description,
                website_description,
                standard_rate,
                default_unit,
                image_url,
                images,
                crop_type,
                variety,
                is_active,
                is_sales_item,
                show_in_website,
                created_at,
                updated_at,
                item_groups (
                    id,
                    name
                )
            `)
            .eq('is_sales_item', true)
            .eq('is_active', true)
            .eq('show_in_website', true) // Only show items published to marketplace
            .order('created_at', { ascending: false });

        if (itemsError) {
            this.logger.error(`Error fetching sales items: ${itemsError.message}`);
        }

        this.logger.log(`Marketplace: Found ${listings?.length || 0} listings and ${salesItems?.length || 0} sales items`);

        // Transform sales items to match marketplace listing format
        const transformedItems = (salesItems || []).map(item => ({
            id: item.id,
            organization_id: item.organization_id,
            title: item.item_name,
            description: (item as any).website_description || item.description, // Prefer marketplace description
            short_description: item.description, // Original description as short version
            price: item.standard_rate || 0,
            currency: 'MAD',
            quantity_available: null, // Stock level would need separate query
            unit: item.default_unit,
            product_category_id: (item.item_groups as any)?.id || null,
            category_name: (item.item_groups as any)?.name || null,
            status: 'active',
            is_public: true,
            images: item.images || (item.image_url ? [item.image_url] : []),
            item_code: item.item_code,
            crop_type: item.crop_type,
            variety: item.variety,
            created_at: item.created_at,
            updated_at: item.updated_at,
            source: 'inventory_item', // Mark source for frontend to distinguish
        }));

        // Combine and return both sources
        const combinedProducts = [
            ...(listings || []).map(l => ({ ...l, source: 'marketplace_listing' })),
            ...transformedItems,
        ];

        // Sort by created_at descending
        combinedProducts.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return combinedProducts;
    }

    /**
     * Get a single product by ID
     * First checks marketplace_listings, then falls back to items table
     */
    async getProduct(id: string) {
        const supabase = this.databaseService.getAdminClient();

        // Try marketplace_listings first
        const { data: listing, error: listingError } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('id', id)
            .eq('is_public', true)
            .single();

        if (!listingError && listing) {
            return { ...listing, source: 'marketplace_listing' };
        }

        // Fall back to items table
        const { data: item, error: itemError } = await supabase
            .from('items')
            .select(`
                id,
                organization_id,
                item_code,
                item_name,
                description,
                website_description,
                standard_rate,
                default_unit,
                image_url,
                images,
                crop_type,
                variety,
                is_active,
                show_in_website,
                created_at,
                updated_at,
                item_groups (
                    id,
                    name
                )
            `)
            .eq('id', id)
            .eq('is_sales_item', true)
            .eq('is_active', true)
            .eq('show_in_website', true) // Only show published items
            .single();

        if (itemError || !item) {
            this.logger.error(`Product not found: ${id}`);
            return null;
        }

        // Transform to marketplace format
        return {
            id: item.id,
            organization_id: item.organization_id,
            title: item.item_name,
            description: (item as any).website_description || item.description, // Prefer marketplace description
            short_description: item.description, // Original description as short version
            price: item.standard_rate || 0,
            currency: 'MAD',
            quantity_available: null,
            unit: item.default_unit,
            product_category_id: (item.item_groups as any)?.id || null,
            category_name: (item.item_groups as any)?.name || null,
            status: 'active',
            is_public: true,
            images: item.images || (item.image_url ? [item.image_url] : []),
            item_code: item.item_code,
            crop_type: item.crop_type,
            variety: item.variety,
            created_at: item.created_at,
            updated_at: item.updated_at,
            source: 'inventory_item',
        };
    }

    /**
     * Fetch dashboard stats for a seller.
     * Uses the user's Auth Token to create an RLS-scoped client.
     * This ensures they can only see their own data.
     */
    async getDashboardStats(token: string, organizationId?: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        // Get listings count from marketplace_listings
        const { count: listingsCount, error: listError } = await supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact', head: true });

        if (listError) {
            this.logger.error(`Error fetching listings stats: ${listError.message}`);
        }

        // Get sales items count
        const { count: salesItemsCount, error: itemsError } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('is_sales_item', true)
            .eq('is_active', true);

        if (itemsError) {
            this.logger.error(`Error fetching sales items stats: ${itemsError.message}`);
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
            listingsCount: (listingsCount || 0) + (salesItemsCount || 0),
            salesItemsCount: salesItemsCount || 0,
            marketplaceListingsCount: listingsCount || 0,
            ordersCount: ordersCount,
            revenue
        };
    }
}
