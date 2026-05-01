import { useMemo } from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';

type TabDef = { value: string; label: string; to: string };
type GroupDef = { value: string; label: string; tabs: TabDef[] };

export function ProductionTabs() {
  const { t, i18n } = useTranslation('production');
  const router = useRouter();
  const { location } = useRouterState();
  const isRTL = isRTLLocale(i18n.language);

  const groups = useMemo<GroupDef[]>(
    () => [
      {
        value: 'planning',
        label: t('groups.planning', 'Planning'),
        tabs: [
          { value: 'campaigns', label: t('tabs.campaigns', 'Campaigns'), to: '/campaigns' },
          { value: 'crop-cycles', label: t('tabs.cropCycles', 'Crop Cycles'), to: '/crop-cycles' },
        ],
      },
      {
        value: 'operations',
        label: t('groups.operations', 'Operations'),
        tabs: [
          { value: 'harvests', label: t('tabs.harvests', 'Harvests'), to: '/harvests' },
          { value: 'product-applications', label: t('tabs.productApplications', 'Treatments'), to: '/product-applications' },
          { value: 'pruning', label: t('tabs.pruning', 'Pruning'), to: '/pruning' },
        ],
      },
      {
        value: 'infrastructure',
        label: t('groups.infrastructure', 'Infrastructure'),
        tabs: [
          { value: 'parcels', label: t('tabs.parcels', 'Parcels'), to: '/parcels' },
          { value: 'farm-hierarchy', label: t('tabs.farmHierarchy', 'Farm Hierarchy'), to: '/farm-hierarchy' },
        ],
      },
      {
        value: 'quality',
        label: t('groups.quality', 'Quality & Analysis'),
        tabs: [
          { value: 'quality-control', label: t('tabs.qualityControl', 'Quality Control'), to: '/quality-control' },
          { value: 'satellite-analysis', label: t('tabs.satelliteAnalysis', 'Satellite'), to: '/production/satellite-analysis' },
        ],
      },
    ],
    [t],
  );

  const allTabs = useMemo(
    () => groups.flatMap((g) => g.tabs.map((tab) => ({ ...tab, group: g.value }))),
    [groups],
  );

  const activeTab = useMemo(() => {
    if (!location) return allTabs[0]?.value ?? 'campaigns';
    const path = location.pathname;
    const match = allTabs
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((tab) => path.startsWith(tab.to));
    return match?.value ?? allTabs[0]?.value ?? 'campaigns';
  }, [location, allTabs]);

  const activeGroupValue = useMemo(() => {
    return allTabs.find((tab) => tab.value === activeTab)?.group ?? groups[0]?.value ?? 'planning';
  }, [allTabs, activeTab, groups]);

  const activeGroupTabs = useMemo(
    () => groups.find((g) => g.value === activeGroupValue)?.tabs ?? [],
    [groups, activeGroupValue],
  );

  const handleGroupChange = (value: string) => {
    const target = groups.find((g) => g.value === value);
    if (!target || target.tabs.length === 0) return;
    router.navigate({ to: target.tabs[0].to });
  };

  const handleTabChange = (value: string) => {
    const target = allTabs.find((tab) => tab.value === value);
    if (!target) return;
    router.navigate({ to: target.to });
  };

  return (
    <div className="mb-4">
      <Tabs value={activeGroupValue} onValueChange={handleGroupChange}>
        <div
          className={cn(
            'relative flex w-full min-w-0 items-center gap-1',
            isRTL ? 'justify-end' : 'justify-start',
          )}
        >
          <TabsList
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-lg [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {groups.map((g) => (
              <TabsTrigger key={g.value} value={g.value} className="shrink-0 font-semibold">
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">
        <div
          className={cn(
            'relative flex w-full min-w-0 items-center gap-1',
            isRTL ? 'justify-end' : 'justify-start',
          )}
        >
          <TabsList
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-md bg-muted/50 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {activeGroupTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
