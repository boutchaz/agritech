import { useMemo } from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';

type TabDef = { value: string; label: string; to: string };
type GroupDef = { value: string; label: string; tabs: TabDef[] };

/**
 * Shared workforce/personnel tabs. Renders two rows: top groups,
 * then the active group's sub-tabs. Highlights based on current pathname,
 * so it works whether mounted inside WorkforceLayout (Outlet children)
 * or in standalone routes like /workers and /tasks.
 */
export function WorkforceNav() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { location } = useRouterState();
  const isRTL = isRTLLocale(i18n.language);

  const groups = useMemo<GroupDef[]>(
    () => [
      {
        value: 'team',
        label: t('workforceHub.groups.team', 'Team'),
        tabs: [
          { value: 'workers', label: t('nav.workers', 'Workers'), to: '/workers' },
          { value: 'tasks', label: t('nav.tasks', 'Tasks'), to: '/tasks' },
        ],
      },
      {
        value: 'leave',
        label: t('workforceHub.groups.leave', 'Leave & Time'),
        tabs: [
          { value: 'applications', label: t('nav.leaveApplications', 'Leave Applications'), to: '/workforce/leave-applications' },
          { value: 'allocations', label: t('nav.leaveAllocations', 'Leave Allocations'), to: '/workforce/leave-allocations' },
          { value: 'types', label: t('nav.leaveTypes', 'Leave Types'), to: '/workforce/leave-types' },
          { value: 'holidays', label: t('nav.holidays', 'Holidays'), to: '/workforce/holidays' },
          { value: 'encashments', label: t('workforceHub.tabs.encashments', 'Encashments'), to: '/workforce/leave-encashments' },
          { value: 'block-dates', label: t('workforceHub.tabs.blockDates', 'Block Dates'), to: '/workforce/leave-block-dates' },
        ],
      },
      {
        value: 'scheduling',
        label: t('workforceHub.groups.scheduling', 'Scheduling'),
        tabs: [
          { value: 'shifts', label: t('nav.shifts', 'Shifts'), to: '/workforce/shifts' },
          { value: 'roster', label: t('nav.roster', 'Roster'), to: '/workforce/roster' },
          { value: 'hr-calendar', label: t('nav.hrCalendar', 'HR Calendar'), to: '/workforce/hr-calendar' },
          { value: 'geofences', label: t('nav.geofences', 'Geofences'), to: '/workforce/geofences' },
          { value: 'attendance', label: t('workforceHub.tabs.attendance', 'Attendance'), to: '/workforce/attendance' },
        ],
      },
      {
        value: 'payroll',
        label: t('workforceHub.groups.payroll', 'Payroll'),
        tabs: [
          { value: 'salary-structures', label: t('nav.salaryStructures', 'Salary Structures'), to: '/workforce/salary-structures' },
          { value: 'payroll-runs', label: t('nav.payrollRuns', 'Payroll Runs'), to: '/workforce/payroll-runs' },
          { value: 'salary-slips', label: t('nav.salarySlips', 'Salary Slips'), to: '/workforce/salary-slips' },
          { value: 'expense-claims', label: t('nav.expenseClaims', 'Expense Claims'), to: '/workforce/expense-claims' },
          { value: 'piece-work', label: t('workforceHub.tabs.pieceWork', 'Piece Work'), to: '/workforce/workers/piece-work' },
          { value: 'payments', label: t('nav.paymentRecords', 'Payment Records'), to: '/workforce/payments' },
        ],
      },
      {
        value: 'lifecycle',
        label: t('workforceHub.groups.lifecycle', 'Lifecycle'),
        tabs: [
          { value: 'recruitment', label: t('nav.recruitment', 'Recruitment'), to: '/workforce/recruitment' },
          { value: 'onboarding', label: t('nav.onboarding', 'Onboarding'), to: '/workforce/onboarding' },
          { value: 'qualifications', label: t('nav.qualifications', 'Qualifications'), to: '/workforce/qualifications' },
          { value: 'appraisals', label: t('nav.appraisals', 'Appraisals'), to: '/workforce/appraisals' },
          { value: 'training', label: t('nav.training', 'Training'), to: '/workforce/training' },
          { value: 'separations', label: t('nav.separations', 'Separations'), to: '/workforce/separations' },
          { value: 'seasonal-campaigns', label: t('nav.seasonalCampaigns', 'Seasonal Campaigns'), to: '/workforce/seasonal-campaigns' },
        ],
      },
      {
        value: 'workplace',
        label: t('workforceHub.groups.workplace', 'Workplace'),
        tabs: [
          { value: 'safety-incidents', label: t('nav.safetyIncidents', 'Safety Incidents'), to: '/workforce/safety-incidents' },
          { value: 'worker-transport', label: t('nav.workerTransport', 'Worker Transport'), to: '/workforce/worker-transport' },
          { value: 'grievances', label: t('nav.grievances', 'Grievances'), to: '/workforce/grievances' },
          { value: 'day-laborers', label: t('workforceHub.tabs.dayLaborers', 'Day Laborers'), to: '/workforce/day-laborers' },
          { value: 'employees', label: t('workforceHub.tabs.employees', 'Employees'), to: '/workforce/employees' },
        ],
      },
      {
        value: 'insights',
        label: t('workforceHub.groups.insights', 'Insights'),
        tabs: [
          { value: 'hr-analytics', label: t('nav.hrAnalytics', 'HR Analytics'), to: '/workforce/hr-analytics' },
          { value: 'my-hr', label: t('nav.myHr', 'My HR'), to: '/workforce/my-hr' },
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
    if (!location) return allTabs[0]?.value ?? 'workers';
    const path = location.pathname;
    const match = allTabs
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((tab) => path === tab.to || path.startsWith(`${tab.to}/`));
    return match?.value ?? allTabs[0]?.value ?? 'workers';
  }, [location, allTabs]);

  const activeGroupValue = useMemo(
    () => allTabs.find((tab) => tab.value === activeTab)?.group ?? groups[0]?.value ?? 'team',
    [allTabs, activeTab, groups],
  );

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
    <div className="space-y-2">
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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
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
