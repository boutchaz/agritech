import type { ReactNode } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  User,
  Plane,
  Receipt,
  GraduationCap,
  AlertTriangle,
  FileText,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyHrSummary } from '@/hooks/useHrAdvanced';
import { HrStatGrid } from '@/components/HrStatGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/my-hr')({
  component: MyHrPage,
});

function MyHrPage() {
  const { t } = useTranslation();
  const { currentOrganization, profile } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const query = useMyHrSummary(orgId);

  if (!orgId) return null;

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const data = query.data;
  if (!data?.worker) {
    return (
      <>
        <div className="p-3 sm:p-4 lg:p-6 space-y-6">
          <Card>
            <CardContent className="py-10 text-center">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {t(
                  'myHr.noWorkerLink',
                  'Your account is not linked to a worker profile yet. Ask your HR admin to link your user.',
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const w = data.worker;
  const totalRemaining = data.leave_balances.reduce((s, b) => s + Number(b.remaining_days || 0), 0);
  const fullName = `${profile?.first_name ?? w.first_name} ${profile?.last_name ?? w.last_name}`;

  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold">{fullName}</h2>
      </div>
      <HrStatGrid
        stats={[
          {
            label: t('myHr.leaveRemaining', 'Leave remaining'),
            value: `${totalRemaining} ${t('common.days', 'days')}`,
            accent: totalRemaining < 5 ? 'warn' : 'success',
          },
          {
            label: t('myHr.pendingLeave', 'Pending requests'),
            value: data.pending_leave,
            accent: data.pending_leave > 0 ? 'warn' : 'default',
          },
          {
            label: t('myHr.pendingClaims', 'Pending claims'),
            value: data.pending_expense_claims,
            accent: data.pending_expense_claims > 0 ? 'warn' : 'default',
          },
          {
            label: t('myHr.expiringCerts', 'Expiring certs (30d)'),
            value: data.expiring_qualifications.length,
            accent: data.expiring_qualifications.length > 0 ? 'danger' : 'success',
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('myHr.profile', 'Profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={t('myHr.workerType', 'Type')} value={w.worker_type} />
            {w.cin && <Row label="CIN" value={w.cin} />}
            {w.hire_date && <Row label={t('myHr.hireDate', 'Hire date')} value={w.hire_date} />}
            {w.monthly_salary && (
              <Row label={t('myHr.monthlySalary', 'Monthly salary')} value={`${w.monthly_salary.toLocaleString()} MAD`} />
            )}
            {w.daily_rate && (
              <Row label={t('myHr.dailyRate', 'Daily rate')} value={`${w.daily_rate.toLocaleString()} MAD`} />
            )}
            <Row
              label="CNSS"
              value={
                w.is_cnss_declared ? (
                  <Badge variant="default">{t('common.yes', 'Yes')}</Badge>
                ) : (
                  <Badge variant="secondary">{t('common.no', 'No')}</Badge>
                )
              }
            />
          </CardContent>
        </Card>

        {/* Leave balances */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="w-4 h-4" />
                {t('myHr.leaveBalances', 'Leave balances')}
              </CardTitle>
              <Link to="/workforce/leave-applications">
                <Button size="sm" variant="ghost">
                  {t('myHr.applyLeave', 'Apply')}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.leave_balances.length === 0 ? (
              <p className="text-xs text-gray-500">{t('myHr.noBalances', 'No allocations yet.')}</p>
            ) : (
              data.leave_balances.map((b, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div>
                    <div className="font-medium">{b.leave_type}</div>
                    <div className="text-xs text-gray-500">
                      {t('myHr.used', 'Used')} {Number(b.used_days).toFixed(1)} / {Number(b.total_days).toFixed(0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${
                        Number(b.remaining_days) < 5 ? 'text-amber-600' : ''
                      }`}
                    >
                      {Number(b.remaining_days).toFixed(1)}
                    </div>
                    <div className="text-[10px] text-gray-500">{t('common.days', 'days')}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Latest pay slip */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('myHr.latestSlip', 'Latest pay slip')}
              </CardTitle>
              <Link to="/workforce/salary-slips">
                <Button size="sm" variant="ghost">
                  {t('myHr.viewAll', 'View all')}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {!data.latest_slip ? (
              <p className="text-xs text-gray-500">{t('myHr.noSlip', 'No pay slip yet.')}</p>
            ) : (
              <div className="space-y-1">
                <Row
                  label={t('myHr.payPeriod', 'Period')}
                  value={`${data.latest_slip.pay_period_start} → ${data.latest_slip.pay_period_end}`}
                />
                <Row label={t('myHr.gross', 'Gross')} value={`${Number(data.latest_slip.gross_pay).toLocaleString()} MAD`} />
                <Row
                  label={t('myHr.net', 'Net')}
                  value={
                    <span className="text-emerald-600 font-semibold">
                      {Number(data.latest_slip.net_pay).toLocaleString()} MAD
                    </span>
                  }
                />
                <Row
                  label={t('common.status', 'Status')}
                  value={<Badge>{data.latest_slip.status}</Badge>}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active appraisal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              {t('myHr.appraisal', 'Active appraisal')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {!data.active_appraisal ? (
              <p className="text-xs text-gray-500">{t('myHr.noAppraisal', 'No active appraisal.')}</p>
            ) : (
              <div className="space-y-1">
                <Row label={t('myHr.cycle', 'Cycle')} value={data.active_appraisal.cycle?.name ?? '—'} />
                <Row label={t('common.status', 'Status')} value={<Badge>{data.active_appraisal.status}</Badge>} />
                {data.active_appraisal.cycle?.end_date && (
                  <Row
                    label={t('myHr.deadline', 'Deadline')}
                    value={data.active_appraisal.cycle.end_date}
                  />
                )}
                {data.active_appraisal.self_rating != null && (
                  <Row label={t('myHr.selfRating', 'Self rating')} value={Number(data.active_appraisal.self_rating).toFixed(1)} />
                )}
                {data.active_appraisal.manager_rating != null && (
                  <Row
                    label={t('myHr.managerRating', 'Manager rating')}
                    value={Number(data.active_appraisal.manager_rating).toFixed(1)}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring qualifications */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                {t('myHr.qualifications', 'Qualifications')}
              </CardTitle>
              <Link to="/workforce/qualifications">
                <Button size="sm" variant="ghost">
                  {t('myHr.viewAll', 'View all')}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {data.expiring_qualifications.length === 0 ? (
              <p className="text-xs text-gray-500">{t('myHr.noExpiring', 'No qualifications expiring soon.')}</p>
            ) : (
              <div className="space-y-1.5">
                {data.expiring_qualifications.map((q) => (
                  <div key={q.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span className="font-medium">{q.qualification_name}</span>
                      <Badge variant="secondary">{q.qualification_type}</Badge>
                    </div>
                    <div className="text-xs text-amber-700">
                      {t('myHr.expires', 'Expires')} {q.expiry_date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/workforce/leave-applications">
          <Button variant="outline" size="sm">
            <Plane className="w-3 h-3 mr-1" />
            {t('myHr.applyLeave', 'Apply leave')}
          </Button>
        </Link>
        <Link to="/workforce/expense-claims">
          <Button variant="outline" size="sm">
            <Receipt className="w-3 h-3 mr-1" />
            {t('myHr.submitClaim', 'Submit expense claim')}
          </Button>
        </Link>
        <Link to="/workforce/grievances">
          <Button variant="outline" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('myHr.raiseGrievance', 'Raise grievance')}
          </Button>
        </Link>
      </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
