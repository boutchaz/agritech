import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle, Plug } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import EmailSettingsTab from '@/components/settings/EmailSettingsTab';
import WhatsAppSettingsTab from '@/components/settings/WhatsAppSettingsTab';

export const Route = createFileRoute(
  '/_authenticated/(settings)/settings/integrations',
)({
  component: IntegrationsSettingsPage,
});

function IntegrationsSettingsPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="w-6 h-6" />
          {t('integrationsSettings.title', 'Integrations')}
        </h2>
        <p className="text-muted-foreground">
          {t(
            'integrationsSettings.description',
            'Configure email (SMTP) and WhatsApp (Meta Cloud API) used to share invoices, quotes and other documents with customers.',
          )}
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            {t('integrationsSettings.tabs.email', 'Email')}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {t('integrationsSettings.tabs.whatsapp', 'WhatsApp')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-4">
          <EmailSettingsTab />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
