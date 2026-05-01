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
  Mail,
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
  useDeleteEmailSettings,
  useOrganizationEmailSettings,
  useTestEmailSettings,
  useUpsertEmailSettings,
} from '@/hooks/useOrganizationEmailSettings';
import { useAuth } from '@/hooks/useAuth';

const createSchema = (tr: (k: string, fallback: string) => string) =>
  z.object({
    host: z.string().min(1, tr('validation.required', 'Required')),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().min(1, tr('validation.required', 'Required')),
    password: z.string().optional(),
    from_email: z
      .string()
      .min(1, tr('validation.required', 'Required'))
      .email(tr('emailSettings.validation.invalidEmail', 'Invalid email')),
    from_name: z.string().optional(),
    reply_to: z
      .string()
      .email(tr('emailSettings.validation.invalidEmail', 'Invalid email'))
      .optional()
      .or(z.literal('')),
    enabled: z.boolean(),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

export default function EmailSettingsTab() {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  const { data: settings, isLoading } = useOrganizationEmailSettings();
  const upsert = useUpsertEmailSettings();
  const remove = useDeleteEmailSettings();
  const test = useTestEmailSettings();

  const schema = useMemo(
    () => createSchema((k, f) => t(k, { defaultValue: f })),
    [t],
  );
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      from_email: '',
      from_name: '',
      reply_to: '',
      enabled: true,
    },
  });

  const [testTo, setTestTo] = useState<string>('');

  useEffect(() => {
    if (!settings) return;
    form.reset({
      host: settings.host ?? '',
      port: settings.port ?? 587,
      secure: settings.secure ?? false,
      username: settings.username ?? '',
      password: '',
      from_email: settings.from_email ?? '',
      from_name: settings.from_name ?? '',
      reply_to: settings.reply_to ?? '',
      enabled: settings.enabled ?? true,
    });
    if (!testTo) {
      setTestTo(user?.email ?? '');
    }
  }, [settings, form, user?.email, testTo]);

  const onSubmit = async (values: FormData) => {
    const payload = {
      ...values,
      password: values.password && values.password.length > 0
        ? values.password
        : undefined,
      from_name: values.from_name || undefined,
      reply_to: values.reply_to || undefined,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success(
        t('emailSettings.toast.saved', 'SMTP settings saved'),
      );
      form.setValue('password', '');
    } catch (e: any) {
      toast.error(
        e?.message ?? t('emailSettings.toast.saveError', 'Failed to save'),
      );
    }
  };

  const onTest = async () => {
    if (!testTo) {
      toast.error(
        t('emailSettings.toast.testEmailRequired', 'Recipient email is required'),
      );
      return;
    }
    try {
      const result = await test.mutateAsync(testTo);
      if (result.success) {
        toast.success(
          t('emailSettings.toast.testSent', 'Test email sent'),
        );
      } else {
        toast.error(
          result.error ??
            t('emailSettings.toast.testFailed', 'Test failed'),
        );
      }
    } catch (e: any) {
      toast.error(
        e?.message ?? t('emailSettings.toast.testFailed', 'Test failed'),
      );
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        t(
          'emailSettings.confirm.delete',
          'Remove your SMTP settings? Invoice emails will fall back to the system default.',
        ),
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync();
      toast.success(t('emailSettings.toast.removed', 'SMTP settings removed'));
      form.reset({
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        from_email: '',
        from_name: '',
        reply_to: '',
        enabled: true,
      });
    } catch (e: any) {
      toast.error(
        e?.message ?? t('emailSettings.toast.removeError', 'Failed to remove'),
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
      <Alert className="rounded-2xl bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
        <Mail className="h-4 w-4" />
        <AlertTitle>
          {t('emailSettings.intro.title', 'Customer-facing billing emails')}
        </AlertTitle>
        <AlertDescription>
          {t(
            'emailSettings.intro.description',
            'Configure your own SMTP server. Invoices and billing emails will be sent from your domain. If unset, the system default SMTP is used.',
          )}
        </AlertDescription>
      </Alert>

      <Card className="rounded-3xl border-slate-100 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold uppercase tracking-tight">
              {t('emailSettings.smtpSection', 'SMTP Server')}
            </CardTitle>
            {settings?.configured && (
              <Badge
                variant={settings.enabled ? 'default' : 'secondary'}
                className="uppercase tracking-widest"
              >
                {settings.enabled
                  ? t('emailSettings.status.enabled', 'Enabled')
                  : t('emailSettings.status.disabled', 'Disabled')}
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
                ? t('emailSettings.test.success', 'Last test OK')
                : t('emailSettings.test.failed', 'Last test failed')}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <FormField
              label={t('emailSettings.fields.host', 'SMTP Host')}
              htmlFor="smtp-host"
              required
              error={form.formState.errors.host?.message}
            >
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                {...form.register('host')}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.port', 'Port')}
              htmlFor="smtp-port"
              required
              error={form.formState.errors.port?.message}
            >
              <Input
                id="smtp-port"
                type="number"
                {...form.register('port', { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.secure', 'TLS / SSL')}
              helper={t(
                'emailSettings.fields.secureHelper',
                'On for port 465. Off for STARTTLS on 587.',
              )}
            >
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={form.watch('secure')}
                  onCheckedChange={(v) => form.setValue('secure', v)}
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {form.watch('secure')
                    ? t('emailSettings.fields.secureOn', 'Secure (SSL/TLS)')
                    : t('emailSettings.fields.secureOff', 'STARTTLS')}
                </span>
              </div>
            </FormField>

            <FormField
              label={t('emailSettings.fields.enabled', 'Enabled')}
              helper={t(
                'emailSettings.fields.enabledHelper',
                'When off, fallback to system default SMTP.',
              )}
            >
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={form.watch('enabled')}
                  onCheckedChange={(v) => form.setValue('enabled', v)}
                />
              </div>
            </FormField>

            <FormField
              label={t('emailSettings.fields.username', 'Username')}
              htmlFor="smtp-username"
              required
              error={form.formState.errors.username?.message}
            >
              <Input
                id="smtp-username"
                placeholder="invoices@yourdomain.com"
                {...form.register('username')}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.password', 'Password')}
              htmlFor="smtp-password"
              helper={
                settings?.configured
                  ? t(
                      'emailSettings.fields.passwordHelperKept',
                      'Leave blank to keep the existing password (currently {{masked}}).',
                      { masked: settings.masked_password ?? '****' },
                    )
                  : t(
                      'emailSettings.fields.passwordHelperNew',
                      'App password or SMTP password. Stored encrypted.',
                    )
              }
              error={form.formState.errors.password?.message}
            >
              <PasswordInput
                id="smtp-password"
                autoComplete="new-password"
                placeholder={settings?.configured ? '••••••••' : ''}
                {...form.register('password')}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.fromEmail', 'From Email')}
              htmlFor="smtp-from-email"
              required
              error={form.formState.errors.from_email?.message}
            >
              <Input
                id="smtp-from-email"
                placeholder="invoices@yourdomain.com"
                {...form.register('from_email')}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.fromName', 'From Name')}
              htmlFor="smtp-from-name"
              error={form.formState.errors.from_name?.message}
            >
              <Input
                id="smtp-from-name"
                placeholder="Acme Sarl"
                {...form.register('from_name')}
              />
            </FormField>

            <FormField
              label={t('emailSettings.fields.replyTo', 'Reply-To')}
              htmlFor="smtp-reply-to"
              error={form.formState.errors.reply_to?.message}
              className="md:col-span-2"
            >
              <Input
                id="smtp-reply-to"
                placeholder="billing@yourdomain.com"
                {...form.register('reply_to')}
              />
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
                {t('emailSettings.actions.save', 'Save')}
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
                  {t('emailSettings.actions.remove', 'Remove')}
                </Button>
              )}
            </div>
          </form>

          {settings?.configured && (
            <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-tight">
                {t('emailSettings.test.title', 'Send a test email')}
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <FormField
                  label={t('emailSettings.test.recipient', 'Recipient')}
                  htmlFor="smtp-test-to"
                  className="min-w-[260px] flex-1"
                >
                  <Input
                    id="smtp-test-to"
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                </FormField>
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
                  {t('emailSettings.actions.test', 'Send Test')}
                </Button>
              </div>

              {settings.last_test_status === 'failed' && settings.last_test_error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {t('emailSettings.test.errorTitle', 'Last test error')}
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
