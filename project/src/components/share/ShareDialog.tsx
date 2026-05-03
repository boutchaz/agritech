import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/FormField';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useShareResource } from '@/hooks/useShare';
import type {
  ShareChannel,
  ShareableResourceType,
} from '@/lib/api/share';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ShareableResourceType;
  resourceId: string;
  /** Pre-fill defaults so the user does not have to type. */
  defaultRecipientEmail?: string;
  defaultRecipientPhone?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  /** Title shown in the dialog header (e.g. "Share invoice INV-001"). */
  title?: string;
  /** When the resource type supports PDF generation. Defaults to true. */
  supportsPdf?: boolean;
}

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  defaultRecipientEmail,
  defaultRecipientPhone,
  defaultSubject,
  defaultMessage,
  title,
  supportsPdf = true,
}: ShareDialogProps) {
  const { t } = useTranslation('common');
  const share = useShareResource();

  const [channel, setChannel] = useState<ShareChannel>('email');
  const [emailTo, setEmailTo] = useState('');
  const [phoneTo, setPhoneTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [waTemplate, setWaTemplate] = useState('');
  const [waLanguage, setWaLanguage] = useState('en_US');
  const [waParams, setWaParams] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);

  // Reset form state every time the dialog opens. setState-in-effect is
  // intentional: dialog contents aren't visible until `open` flips true,
  // so the extra render the rule warns about is hidden behind the mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setEmailTo(defaultRecipientEmail ?? '');
    setPhoneTo(defaultRecipientPhone ?? '');
    setSubject(defaultSubject ?? '');
    setMessage(defaultMessage ?? '');
    setWaTemplate('');
    setWaLanguage('en_US');
    setWaParams('');
    setAttachPdf(true);
    setChannel('email');
  }, [
    open,
    defaultRecipientEmail,
    defaultRecipientPhone,
    defaultSubject,
    defaultMessage,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dialogTitle = useMemo(
    () => title ?? t('share.title', 'Share document'),
    [title, t],
  );

  const onSend = async () => {
    const recipient = channel === 'email' ? emailTo : phoneTo;
    if (!recipient) {
      toast.error(
        channel === 'email'
          ? t('share.errors.emailRequired', 'Recipient email is required')
          : t('share.errors.phoneRequired', 'Recipient phone is required'),
      );
      return;
    }
    try {
      const params =
        channel === 'whatsapp' && waParams.trim().length > 0
          ? waParams.split(/\s*,\s*/).filter(Boolean)
          : undefined;
      const result = await share.mutateAsync({
        resource_type: resourceType,
        resource_id: resourceId,
        channel,
        recipient,
        subject: channel === 'email' ? subject || undefined : undefined,
        message: message || undefined,
        whatsapp_template:
          channel === 'whatsapp' && waTemplate ? waTemplate : undefined,
        whatsapp_language:
          channel === 'whatsapp' ? waLanguage || undefined : undefined,
        whatsapp_template_params: params,
        attach_pdf: supportsPdf ? attachPdf : false,
      });
      if (result.success) {
        toast.success(
          channel === 'email'
            ? t('share.toast.emailSent', 'Email sent')
            : t('share.toast.whatsappSent', 'WhatsApp message sent'),
        );
        onOpenChange(false);
      } else {
        toast.error(result.error ?? t('share.toast.failed', 'Send failed'));
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('share.toast.failed', 'Send failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {t(
              'share.description',
              'Send via email or WhatsApp. Configure providers under Settings → Integrations.',
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={channel}
          onValueChange={(v) => setChannel(v as ShareChannel)}
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              {t('share.channel.email', 'Email')}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {t('share.channel.whatsapp', 'WhatsApp')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4 space-y-4">
            <FormField
              label={t('share.fields.to', 'To')}
              htmlFor="share-email-to"
              required
            >
              <Input
                id="share-email-to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@example.com"
              />
            </FormField>
            <FormField
              label={t('share.fields.subject', 'Subject')}
              htmlFor="share-subject"
            >
              <Input
                id="share-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t(
                  'share.fields.subjectPlaceholder',
                  'Leave empty to use the default subject',
                )}
              />
            </FormField>
            <FormField
              label={t('share.fields.message', 'Message')}
              htmlFor="share-message"
            >
              <Textarea
                id="share-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder={t(
                  'share.fields.messagePlaceholder',
                  'Leave empty to use the default message',
                )}
              />
            </FormField>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4 space-y-4">
            <FormField
              label={t('share.fields.phone', 'Phone (E.164)')}
              htmlFor="share-phone-to"
              required
              helper={t(
                'share.fields.phoneHelper',
                'Include country code, e.g. +212612345678',
              )}
            >
              <Input
                id="share-phone-to"
                value={phoneTo}
                onChange={(e) => setPhoneTo(e.target.value)}
                placeholder="+212612345678"
              />
            </FormField>
            <FormField
              label={t('share.fields.message', 'Message')}
              htmlFor="share-wa-message"
              helper={t(
                'share.fields.whatsappMessageHelper',
                'Plain text only works inside the 24h customer-initiated window. For cold contacts, use a template below.',
              )}
            >
              <Textarea
                id="share-wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label={t('share.fields.waTemplate', 'Template name')}
                htmlFor="share-wa-template"
                helper={t(
                  'share.fields.waTemplateHelper',
                  'Approved Meta template (optional)',
                )}
              >
                <Input
                  id="share-wa-template"
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  placeholder="document_share"
                />
              </FormField>
              <FormField
                label={t('share.fields.waLanguage', 'Language')}
                htmlFor="share-wa-language"
              >
                <Input
                  id="share-wa-language"
                  value={waLanguage}
                  onChange={(e) => setWaLanguage(e.target.value)}
                  placeholder="en_US"
                />
              </FormField>
            </div>
            {waTemplate && (
              <FormField
                label={t('share.fields.waParams', 'Template parameters')}
                htmlFor="share-wa-params"
                helper={t(
                  'share.fields.waParamsHelper',
                  'Comma-separated, in order matching template variables',
                )}
              >
                <Input
                  id="share-wa-params"
                  value={waParams}
                  onChange={(e) => setWaParams(e.target.value)}
                  placeholder="John Doe, INV-001, 1500 MAD"
                />
              </FormField>
            )}
          </TabsContent>
        </Tabs>

        {supportsPdf && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
            <div className="text-sm">
              <div className="font-medium">
                {t('share.fields.attachPdf', 'Attach PDF')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  'share.fields.attachPdfHelper',
                  'Attach the document as a PDF (email attachment or WhatsApp document).',
                )}
              </div>
            </div>
            <Switch checked={attachPdf} onCheckedChange={setAttachPdf} />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={share.isPending}
          >
            {t('app.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={onSend}
            disabled={share.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {share.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t('share.actions.send', 'Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
