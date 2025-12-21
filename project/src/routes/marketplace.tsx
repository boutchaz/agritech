import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingBag, TrendingUp, Package, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/marketplace')({
    component: MarketplacePage,
});

function MarketplacePage() {
    const { t } = useTranslation();

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('marketplace.dashboard.title', 'Marketplace Seller Dashboard')}</h2>
                    <p className="text-muted-foreground">{t('marketplace.dashboard.subtitle', 'Manage your listings, orders, and sales.')}</p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('marketplace.actions.createListing', 'Create Listing')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketplace.stats.revenue', 'Total Revenue')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0.00 MAD</div>
                        <p className="text-xs text-muted-foreground">+0% {t('marketplace.stats.fromLastMonth', 'from last month')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketplace.stats.activeListings', 'Active Listings')}</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">0 {t('marketplace.stats.draftListings', 'draft listings')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketplace.stats.pendingOrders', 'Pending Orders')}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">0 {t('marketplace.stats.confirmed', 'confirmed')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketplace.stats.reviews', 'Customer Reviews')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0.0</div>
                        <p className="text-xs text-muted-foreground">{t('marketplace.stats.basedOnReviews', 'Based on 0 reviews')}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="listings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="listings">{t('marketplace.tabs.listings', 'Listings')}</TabsTrigger>
                    <TabsTrigger value="orders">{t('marketplace.tabs.orders', 'Orders')}</TabsTrigger>
                    <TabsTrigger value="insights">{t('marketplace.tabs.insights', 'Insights')}</TabsTrigger>
                </TabsList>
                <TabsContent value="listings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('marketplace.listings.title', 'Your Listings')}</CardTitle>
                            <CardDescription>
                                {t('marketplace.listings.description', 'Manage your products available on the marketplace.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10 text-muted-foreground">
                                {t('marketplace.listings.empty', 'No active listings found. Create your first listing to start selling.')}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('marketplace.orders.title', 'Recent Orders')}</CardTitle>
                            <CardDescription>
                                {t('marketplace.orders.description', 'View and manage your incoming orders.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10 text-muted-foreground">
                                {t('marketplace.orders.empty', 'No orders yet.')}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
