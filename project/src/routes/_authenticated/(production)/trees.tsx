import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TreeDeciduous, Calendar, Scissors } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tasksApi } from '@/lib/api/tasks';
import { useParcelsByOrganization } from '@/hooks/useParcelsQuery';
import { ProductionTabs } from '@/components/Production/ProductionTabs';
import type { TaskSummary } from '@/types/tasks';

export const Route = createFileRoute('/_authenticated/(production)/trees')({
  component: Trees,
});

function Trees() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const organizationId = currentOrganization?.id;

  // Use parcels with tree_type as proxy for tree crops
  const { data: parcelsData = [] } = useParcelsByOrganization(organizationId);
  const treeCrops = parcelsData.filter((p) => p.tree_type);
  const cropsLoading = false;

  // Fetch pruning tasks
  const { data: pruningTasks } = useQuery({
    queryKey: ['tasks', organizationId, 'pruning'],
    queryFn: async () => (await tasksApi.getAll(organizationId!)).data,
    enabled: !!organizationId,
  });

  const pendingPruningCount = pruningTasks?.filter(
    (task: TaskSummary) => task.task_type === 'maintenance' &&
    (task.title?.toLowerCase().includes('pruning') || task.title?.toLowerCase().includes('taille')) &&
    task.status === 'pending'
  ).length || 0;

  type TreeCategory = {
    icon: typeof TreeDeciduous;
    title: string;
    description: string;
    route: '/orchards' | '/pruning' | '/harvests';
    search?: { module: 'fruit-trees' };
    color: string;
    bgColor: string;
    onClick: () => void;
  };

  // Update tree categories to use module-filtered routes
  const treeCategories: TreeCategory[] = [
    {
      icon: TreeDeciduous,
      title: t('trees.orchards', 'Orchards'),
      description: t('trees.orchardsDesc', 'Manage your fruit orchards'),
      route: '/orchards',
      onClick: () => navigate({ to: '/orchards' }),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      icon: Scissors,
      title: t('trees.pruning', 'Pruning'),
      description: t('trees.pruningDesc', 'Track pruning schedules'),
      route: '/pruning',
      onClick: () => navigate({ to: '/pruning' }),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      icon: Calendar,
      title: t('trees.harvests', 'Fruit Harvests'),
      description: t('trees.harvestsDesc', 'Track fruit harvest records'),
      route: '/harvests',
      search: { module: 'fruit-trees' },
      onClick: () => navigate({ to: '/harvests' }),
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <ProductionTabs />
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TreeDeciduous className="h-8 w-8" />
          {t('trees.title', 'Fruit Trees')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('trees.description', 'Manage your fruit tree orchards, pruning, and harvests')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {treeCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.route}
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={category.onClick}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${category.bgColor} ${category.color} flex items-center justify-center mb-2`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  {t('common.open', 'Open')} →
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('trees.totalOrchards', 'Total Orchards')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cropsLoading ? '-' : treeCrops?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('trees.totalTrees', 'Total Trees')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cropsLoading ? '-' : treeCrops?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('trees.pendingPruning', 'Pending Pruning')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPruningCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
