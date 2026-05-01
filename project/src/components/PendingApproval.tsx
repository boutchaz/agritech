import { Clock, Mail, Phone, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';

interface PendingApprovalProps {
  status: 'pending' | 'rejected' | 'approved';
}

const SUPPORT_EMAIL = 'support@agrogina.com';
const SUPPORT_PHONE = '+212 600 000 000';

const PendingApproval = ({ status }: PendingApprovalProps) => {
  const { t } = useTranslation();
  const { currentOrganization, signOut } = useAuth();
  const isRejected = status === 'rejected';

  const title = isRejected
    ? t('pendingApproval.rejectedTitle', 'Account not approved')
    : t('pendingApproval.pendingTitle', 'Account under review');

  const message = isRejected
    ? t(
        'pendingApproval.rejectedMessage',
        'Our team reviewed your application and is unable to activate your account at this time. Please contact us to discuss next steps.',
      )
    : t(
        'pendingApproval.pendingMessage',
        'Thanks for signing up. An AgroGina team member will contact you shortly to validate your organization and activate your account.',
      );

  const Icon = isRejected ? XCircle : Clock;
  const iconTone = isRejected
    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${iconTone}`}>
              <Icon className="h-12 w-12" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {title}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            {currentOrganization && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
                {t('pendingApproval.organizationLabel', 'Organization')}: {currentOrganization.name}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 mb-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('pendingApproval.needHelp', 'Need help?')}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Phone className="h-4 w-4" />
              {SUPPORT_PHONE}
            </a>
          </div>

          <Button onClick={() => signOut()} variant="outline" className="w-full">
            {t('pendingApproval.signOut', 'Sign out')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
