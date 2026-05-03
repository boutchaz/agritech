import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/FormField';
import {
  useDeleteWhatsAppSettings,
  useOrganizationWhatsAppSettings,
  useTestWhatsAppSettings,
  useUpsertWhatsAppSettings,
} from '@/hooks/useOrganizationWhatsAppSettings';

const createSchema = (tr: (k: string, fallback: string) => string) =>
  z.object({
    phone_number_id: z.string().min(1, tr('validation.required', 'Required')),
    access_token: z.string().optional(),
    business_account_id: z.string().optional(),
    display_phone_number: z.string().optional(),
    enabled: z.boolean(),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

export default function WhatsAppSettingsTab() {
  const { t } = useTranslation('common');

  const { data: settings, isLoading } = useOrganizationWhatsAppSettings();
  const upsert = useUpsertWhatsAppSettings();
  const remove = useDeleteWhatsAppSettings();
  const test = useTestWhatsAppSettings();

  const schema = useMemo(
    () => createSchema((k, f) => t(k, { defaultValue: f })),
    [t],
  );
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      phone_number_id: '',
      access_token: '',
      business_account_id: '',
      display_phone_number: '',
      enabled: true,
    },
  });

  const [testTo, setTestTo] = useState<string>('');
  const [testTemplate, setTestTemplate] = useState<string>('hello_world');
  const [testLanguage, setTestLanguage] = useState<string>('en_US');

  useEffect(() => {
    if (!settings) return;
    form.reset({
      phone_number_id: settings.phone_number_id ?? '',
      access_token: '',
      business_account_id: settings.business_account_id ?? '',
      display_phone_number: settings.display_phone_number ?? '',
      enabled: settings.enabled ?? true,
    });
  }, [settings, form]);

  const onSubmit = async (values: FormData) => {
    const payload = {
      phone_number_id: values.phone_number_id,
      access_token:
        values.access_token && values.access_token.length > 0
          ? values.access_token
          : undefined,
      business_account_id: values.business_account_id || undefined,
      display_phone_number: values.display_phone_number || undefined,
      enabled: values.enabled,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success(
        t('whatsappSettings.toast.saved', 'WhatsApp settings saved'),
      );
      form.setValue('access_token', '');
    } catch (e: any) {
      toast.error(
        e?.message ?? t('whatsappSettings.toast.saveError', 'Failed to save'),
      );
    }
  };

  const onTest = async () => {
    if (!testTo) {
      toast.error(
        t(
          'whatsappSettings.toast.testToRequired',
          'Recipient phone number is required',
        ),
      );
      return;
    }
    try {
      const result = await test.mutateAsync({
        to: testTo,
        template: testTemplate || undefined,
        language: testLanguage || undefined,
      });
      if (result.success) {
        toast.success(
          t('whatsappSettings.toast.testSent', 'Test message sent'),
        );
      } else {
        toast.error(
          result.error ??
            t('whatsappSettings.toast.testFailed', 'Test failed'),
        );
      }
    } catch (e: any) {
      toast.error(
        e?.message ?? t('whatsappSettings.toast.testFailed', 'Test failed'),
      );
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        t(
          'whatsappSettings.confirm.delete',
          'Remove WhatsApp settings? Sharing via WhatsApp will be disabled.',
        ),
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync();
      toast.success(
        t('whatsappSettings.toast.removed', 'WhatsApp settings removed'),
      );
      form.reset({
        phone_number_id: '',
        access_token: '',
        business_account_id: '',
        display_phone_number: '',
        enabled: true,
      });
    } catch (e: any) {
      toast.error(
        e?.message ??
          t('whatsappSettings.toast.removeError', 'Failed to remove'),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const lastTestStatus = settings?.last_test_status;

  return (
    <div className="space-y-6">
      <Alert className="rounded-2xl bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
        <MessageCircle className="h-4 w-4" />
        <AlertTitle>
          {t(
            'whatsappSettings.intro.title',
            'WhatsApp Business (Meta Cloud API)',
          )}
        </AlertTitle>
        <AlertDescription>
          {t(
            'whatsappSettings.intro.description',
            'Connect your WhatsApp Business number to share invoices and quotes via WhatsApp. You need a Meta Cloud API phone_number_id and a permanent system-user access token from business.facebook.com.',
          )}
        </AlertDescription>
      </Alert>

      <Card className="rounded-3xl border-slate-100 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold uppercase tracking-tight">
              {t('whatsappSettings.section', 'Cloud API Credentials')}
            </CardTitle>
            {settings?.configured && (
              <Badge
                variant={settings.enabled ? 'default' : 'secondary'}
                className="uppercase tracking-widest"
              >
                {settings.enabled
                  ? t('whatsappSettings.status.enabled', 'Enabled')
                  : t('whatsappSettings.status.disabled', 'Disabled')}
              </Badge>
            )}
          </div>
          {lastTestStatus && (
            <Badge
              variant={lastTestStatus === 'success' ? 'default' : 'destructive'}
              className="gap-1 uppercase tracking-widest"
            >
              {lastTestStatus === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {lastTestStatus === 'success'
                ? t('whatsappSettings.test.success', 'Last test OK')
                : t('whatsappSettings.test.failed', 'Last test failed')}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <FormField
              label={t(
                'whatsappSettings.fields.phoneNumberId',
                'Phone Number ID',
              )}
              htmlFor="wa-phone-number-id"
              required
              helper={t(
                'whatsappSettings.fields.phoneNumberIdHelper',
                'From WhatsApp Manager → API Setup.',
              )}
              error={form.formState.errors.phone_number_id?.message}
            >
              <Input
                id="wa-phone-number-id"
                placeholder="123456789012345"
                {...form.register('phone_number_id')}
              />
            </FormField>

            <FormField
              label={t(
                'whatsappSettings.fields.businessAccountId',
                'WhatsApp Business Account ID',
              )}
              htmlFor="wa-waba-id"
              error={form.formState.errors.business_account_id?.message}
            >
              <Input
                id="wa-waba-id"
                placeholder="987654321098765"
                {...form.register('business_account_id')}
              />
            </FormField>

            <FormField
              label={t(
                'whatsappSettings.fields.accessToken',
                'Access Token',
              )}
              htmlFor="wa-access-token"
              required={!settings?.configured}
              helper={
                settings?.configured
                  ? t(
                      'whatsappSettings.fields.accessTokenHelperKept',
                      'Leave blank to keep the existing token (currently {{masked}}).',
                      { masked: settings.masked_access_token ?? '****' },
                    )
                  : t(
                      'whatsappSettings.fields.accessTokenHelperNew',
                      'Permanent system-user token. Stored encrypted.',
                    )
              }
              error={form.formState.errors.access_token?.message}
              className="md:col-span-2"
            >
              <PasswordInput
                id="wa-access-token"
                autoComplete="new-password"
                placeholder={settings?.configured ? '••••••••' : ''}
                {...form.register('access_token')}
              />
            </FormField>

            <FormField
              label={t(
                'whatsappSettings.fields.displayPhone',
                'Display Phone Number',
              )}
              htmlFor="wa-display-phone"
              helper={t(
                'whatsappSettings.fields.displayPhoneHelper',
                'Shown in the UI. Not used for sending.',
              )}
              error={form.formState.errors.display_phone_number?.message}
            >
              <Input
                id="wa-display-phone"
                placeholder="+212 6 12 34 56 78"
                {...form.register('display_phone_number')}
              />
            </FormField>

            <FormField
              label={t('whatsappSettings.fields.enabled', 'Enabled')}
              helper={t(
                'whatsappSettings.fields.enabledHelper',
                'When off, WhatsApp share is unavailable.',
              )}
            >
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={form.watch('enabled')}
                  onCheckedChange={(v) => form.setValue('enabled', v)}
                />
              </div>
            </FormField>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={upsert.isPending}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {upsert.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('whatsappSettings.actions.save', 'Save')}
              </Button>

              {settings?.configured && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={onDelete}
                  className="rounded-2xl"
                >
                  {remove.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {t('whatsappSettings.actions.remove', 'Remove')}
                </Button>
              )}
            </div>
          </form>

          {settings?.configured && (
            <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-tight">
                {t('whatsappSettings.test.title', 'Send a test message')}
              </h4>
              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  label={t('whatsappSettings.test.recipient', 'Recipient (E.164)')}
                  htmlFor="wa-test-to"
                >
                  <Input
                    id="wa-test-to"
                    placeholder="+212612345678"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                </FormField>
                <FormField
                  label={t('whatsappSettings.test.template', 'Template')}
                  htmlFor="wa-test-template"
                >
                  <Input
                    id="wa-test-template"
                    placeholder="hello_world"
                    value={testTemplate}
                    onChange={(e) => setTestTemplate(e.target.value)}
                  />
                </FormField>
                <FormField
                  label={t('whatsappSettings.test.language', 'Language')}
                  htmlFor="wa-test-language"
                >
                  <Input
                    id="wa-test-language"
                    placeholder="en_US"
                    value={testLanguage}
                    onChange={(e) => setTestLanguage(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={test.isPending}
                  onClick={onTest}
                  className="rounded-2xl"
                >
                  {test.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t('whatsappSettings.actions.test', 'Send Test')}
                </Button>
              </div>

              {settings.last_test_status === 'failed' &&
                settings.last_test_error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      {t('whatsappSettings.test.errorTitle', 'Last test error')}
                    </AlertTitle>
                    <AlertDescription className="break-words">
                      {settings.last_test_error}
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
