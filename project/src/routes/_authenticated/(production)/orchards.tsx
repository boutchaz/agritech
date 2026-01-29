import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cropsApi } from '@/lib/api/crops';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_authenticated/(production)/orchards')({
  component: Orchards,
});

function Orchards() {
  const { t } = useTranslation();
  const { organizationId } = useAuth();

  // Use crops API with module filter for fruit-trees
  const { data: orchards, isLoading } = useQuery({
    queryKey: ['crops', organizationId, 'fruit-trees'],
    queryFn: () => cropsApi.getAll(organizationId!, { module: 'fruit-trees' }),
    enabled: !!organizationId,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('orchards.title', 'Orchards')}
          </h1>
          <p className="text-muted-foreground">
            {t('orchards.description', 'Manage your fruit tree orchards')}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('orchards.new', 'New Orchard')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : orchards && orchards.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orchards.map((orchard) => (
            <Card
              key={orchard.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {orchard.name}
                  {orchard.crop_category && (
                    <Badge variant="secondary">{orchard.crop_category}</Badge>
                  )}
                </CardTitle>
                {orchard.notes && (
                  <CardDescription>{orchard.notes}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {orchard.planting_date && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('orchards.plantingDate', 'Planting Date')}:
                      </span>{' '}
                      {new Date(orchard.planting_date).toLocaleDateString()}
                    </div>
                  )}
                  {orchard.expected_yield && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('orchards.expectedYield', 'Expected Yield')}:
                      </span>{' '}
                      {orchard.expected_yield} {orchard.yield_unit || 'kg'}
                    </div>
                  )}
                  {orchard.expected_yield_per_tree && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('orchards.yieldPerTree', 'Yield per Tree')}:
                      </span>{' '}
                      {orchard.expected_yield_per_tree} kg
                    </div>
                  )}
                  {orchard.spacing_between_trees && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('orchards.spacing', 'Spacing')}:
                      </span>{' '}
                      {orchard.spacing_between_trees} m
                    </div>
                  )}
                  {orchard.tree_variety && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        {t('orchards.variety', 'Variety')}:
                      </span>{' '}
                      {orchard.tree_variety}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {t('orchards.noOrchards', 'No orchards yet')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('orchards.noOrchardsDesc', 'Create your first orchard to get started')}
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('orchards.new', 'New Orchard')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
