import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SellerProfile {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    is_verified?: boolean;
    created_at: string;
    product_count: number;
    average_rating?: number;
    review_count: number;
}

export interface SellerListFilters {
    city?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class SellersService {
    private readonly logger = new Logger(SellersService.name);

    constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Get list of all sellers with products
     */
    async getSellers(filters: SellerListFilters = {}): Promise<{ sellers: SellerProfile[]; total: number }> {
        const supabase = this.databaseService.getAdminClient();
        const { city, category, search, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        // Get organizations that have products
        let query = supabase
            .from('organizations')
            .select(`
                id,
                name,
                slug,
                description,
                logo_url,
                address,
                city,
                phone,
                email,
                website,
                is_active,
                created_at
            `, { count: 'exact' })
            .eq('is_active', true)
            .order('name', { ascending: true });

        // Apply city filter
        if (city) {
            query = query.ilike('city', `%${city}%`);
        }

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: organizations, error, count } = await query
            .range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to fetch sellers: ${error.message}`);
            throw new HttpException('Failed to fetch sellers', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Get product counts and ratings for each organization
        const sellers: SellerProfile[] = await Promise.all(
            (organizations || []).map(async (org) => {
                // Count products (both marketplace listings and items)
                const [listingsCount, itemsCount, reviewStats] = await Promise.all([
                    this.getListingsCount(org.id),
                    this.getItemsCount(org.id),
                    this.getReviewStats(org.id),
                ]);

                const productCount = listingsCount + itemsCount;

                // Only include sellers with products
                if (productCount === 0) {
                    return null;
                }

                return {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    description: org.description,
                    logo_url: org.logo_url,
                    address: org.address,
                    city: org.city,
                    phone: org.phone,
                    email: org.email,
                    website: org.website,
                    is_verified: false, // TODO: Add verification system
                    created_at: org.created_at,
                    product_count: productCount,
                    average_rating: reviewStats.average_rating,
                    review_count: reviewStats.review_count,
                };
            })
        );

        // Filter out null entries (sellers without products)
        const activeSellers = sellers.filter((s): s is SellerProfile => s !== null);

        // If category filter is applied, filter by product category
        let filteredSellers = activeSellers;
        if (category) {
            const sellersWithCategory = await this.getSellersByCategory(category);
            filteredSellers = activeSellers.filter(s => sellersWithCategory.includes(s.id));
        }

        return {
            sellers: filteredSellers,
            total: filteredSellers.length,
        };
    }

    /**
     * Get seller profile by slug or ID
     */
    async getSellerBySlug(slug: string): Promise<SellerProfile | null> {
        const supabase = this.databaseService.getAdminClient();

        // Try to find by slug first, then by ID
        let query = supabase
            .from('organizations')
            .select(`
                id,
                name,
                slug,
                description,
                logo_url,
                address,
                city,
                state,
                postal_code,
                country,
                phone,
                email,
                website,
                is_active,
                created_at
            `)
            .eq('is_active', true);

        // Check if it's a UUID or slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        if (isUUID) {
            query = query.eq('id', slug);
        } else {
            query = query.eq('slug', slug);
        }

        const { data: org, error } = await query.single();

        if (error || !org) {
            return null;
        }

        // Get product count and ratings
        const [listingsCount, itemsCount, reviewStats] = await Promise.all([
            this.getListingsCount(org.id),
            this.getItemsCount(org.id),
            this.getReviewStats(org.id),
        ]);

        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            description: org.description,
            logo_url: org.logo_url,
            address: org.address,
            city: org.city,
            phone: org.phone,
            email: org.email,
            website: org.website,
            is_verified: false,
            created_at: org.created_at,
            product_count: listingsCount + itemsCount,
            average_rating: reviewStats.average_rating,
            review_count: reviewStats.review_count,
        };
    }

    /**
     * Get seller's products
     */
    async getSellerProducts(sellerId: string, page: number = 1, limit: number = 20) {
        const supabase = this.databaseService.getAdminClient();
        const offset = (page - 1) * limit;

        // Get marketplace listings
        const { data: listings, error: listingsError } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('organization_id', sellerId)
            .eq('is_public', true)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        // Get items marked as sales items
        const { data: items, error: itemsError } = await supabase
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
            .eq('organization_id', sellerId)
            .eq('is_sales_item', true)
            .eq('is_active', true)
            .eq('show_in_website', true)
            .order('created_at', { ascending: false });

        // Transform items to marketplace format
        const transformedItems = (items || []).map(item => ({
            id: item.id,
            organization_id: item.organization_id,
            title: item.item_name,
            description: (item as any).website_description || item.description,
            price: item.standard_rate || 0,
            currency: 'MAD',
            unit: item.default_unit,
            images: item.images || (item.image_url ? [item.image_url] : []),
            category_name: (item.item_groups as any)?.name || null,
            crop_type: item.crop_type,
            variety: item.variety,
            created_at: item.created_at,
            source: 'inventory_item',
        }));

        // Combine and paginate
        const allProducts = [
            ...(listings || []).map(l => ({ ...l, source: 'marketplace_listing' })),
            ...transformedItems,
        ];

        // Sort by created_at
        allProducts.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return {
            products: allProducts.slice(offset, offset + limit),
            total: allProducts.length,
        };
    }

    /**
     * Get seller reviews
     */
    async getSellerReviews(sellerId: string, page: number = 1, limit: number = 10) {
        const supabase = this.databaseService.getAdminClient();
        const offset = (page - 1) * limit;

        const { data: reviews, error, count } = await supabase
            .from('marketplace_reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                reviewer:organizations!marketplace_reviews_reviewer_organization_id_fkey(
                    id,
                    name,
                    logo_url
                )
            `, { count: 'exact' })
            .eq('reviewee_organization_id', sellerId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to fetch reviews: ${error.message}`);
            return { reviews: [], total: 0 };
        }

        return {
            reviews: reviews || [],
            total: count || 0,
        };
    }

    /**
     * Get list of cities with sellers
     */
    async getSellerCities(): Promise<string[]> {
        const supabase = this.databaseService.getAdminClient();

        const { data, error } = await supabase
            .from('organizations')
            .select('city')
            .eq('is_active', true)
            .not('city', 'is', null);

        if (error) {
            return [];
        }

        // Get unique cities
        const cities = [...new Set(data?.map(d => d.city).filter(Boolean))];
        return cities.sort();
    }

    // Helper methods
    private async getListingsCount(organizationId: string): Promise<number> {
        const supabase = this.databaseService.getAdminClient();
        const { count } = await supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('is_public', true)
            .eq('status', 'active');
        return count || 0;
    }

    private async getItemsCount(organizationId: string): Promise<number> {
        const supabase = this.databaseService.getAdminClient();
        const { count } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('is_sales_item', true)
            .eq('is_active', true)
            .eq('show_in_website', true);
        return count || 0;
    }

    private async getReviewStats(organizationId: string): Promise<{ average_rating: number | null; review_count: number }> {
        const supabase = this.databaseService.getAdminClient();
        const { data, error } = await supabase
            .from('marketplace_reviews')
            .select('rating')
            .eq('reviewee_organization_id', organizationId);

        if (error || !data || data.length === 0) {
            return { average_rating: null, review_count: 0 };
        }

        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        return {
            average_rating: Math.round((sum / data.length) * 10) / 10,
            review_count: data.length,
        };
    }

    private async getSellersByCategory(categoryId: string): Promise<string[]> {
        const supabase = this.databaseService.getAdminClient();

        // Get from listings
        const { data: listings } = await supabase
            .from('marketplace_listings')
            .select('organization_id')
            .eq('product_category_id', categoryId)
            .eq('is_public', true)
            .eq('status', 'active');

        // Get from items via item_groups
        const { data: items } = await supabase
            .from('items')
            .select('organization_id')
            .eq('item_group_id', categoryId)
            .eq('is_sales_item', true)
            .eq('is_active', true)
            .eq('show_in_website', true);

        const orgIds = [
            ...(listings || []).map(l => l.organization_id),
            ...(items || []).map(i => i.organization_id),
        ];

        return [...new Set(orgIds)];
    }
}
