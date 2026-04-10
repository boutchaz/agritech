import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { emailTemplatesApi, type EmailTemplate, type EmailTemplateCategory } from '@/lib/api/email-templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Mail,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Search,
  ChevronRight,
  X,
  Save,
  Tag,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/loader';

const CATEGORIES: { key: EmailTemplateCategory | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'emailTemplates.categories.all' },
  { key: 'marketplace', labelKey: 'emailTemplates.categories.marketplace' },
  { key: 'invoice', labelKey: 'emailTemplates.categories.invoice' },
  { key: 'quote', labelKey: 'emailTemplates.categories.quote' },
  { key: 'order', labelKey: 'emailTemplates.categories.order' },
  { key: 'task', labelKey: 'emailTemplates.categories.task' },
  { key: 'reminder', labelKey: 'emailTemplates.categories.reminder' },
  { key: 'general', labelKey: 'emailTemplates.categories.general' },
];

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  marketplace: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  invoice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  quote: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  order: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  task: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  reminder: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function EmailTemplatesSettings() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<EmailTemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates', organizationId, activeCategory],
    queryFn: () =>
      activeCategory === 'all'
        ? emailTemplatesApi.getAll(undefined, organizationId)
        : emailTemplatesApi.getAll(activeCategory, organizationId),
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; subject: string; html_body: string; is_active?: boolean }) =>
      emailTemplatesApi.update(data.id, data, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', organizationId] });
      toast.success(t('emailTemplates.updated'));
      setIsEditing(false);
      if (selectedTemplate) {
        setSelectedTemplate((prev) =>
          prev ? { ...prev, subject: editSubject, html_body: editHtmlBody } : prev,
        );
      }
    },
    onError: () => {
      toast.error(t('emailTemplates.updateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplatesApi.delete(id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', organizationId] });
      toast.success(t('emailTemplates.deleted'));
      setSelectedTemplate(null);
      setIsEditing(false);
    },
    onError: () => {
      toast.error(t('emailTemplates.deleteFailed'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      emailTemplatesApi.duplicate(id, name, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', organizationId] });
      toast.success(t('emailTemplates.duplicated'));
    },
    onError: () => {
      toast.error(t('emailTemplates.duplicateFailed'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: string; is_active: boolean }) =>
      emailTemplatesApi.update(data.id, { is_active: data.is_active }, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', organizationId] });
    },
  });

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        tpl.type.toLowerCase().includes(q) ||
        (tpl.description?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, search]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, EmailTemplate[]> = {};
    for (const tpl of filteredTemplates) {
      const cat = tpl.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tpl);
    }
    return groups;
  }, [filteredTemplates]);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    setIsEditing(false);
    setEditSubject(tpl.subject);
    setEditHtmlBody(tpl.html_body);
    setShowPreview(false);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      subject: editSubject,
      html_body: editHtmlBody,
    });
  };

  const handleDuplicate = (tpl: EmailTemplate) => {
    duplicateMutation.mutate({ id: tpl.id });
  };

  const handleDelete = (tpl: EmailTemplate) => {
    deleteMutation.mutate(tpl.id);
  };

  if (isLoading) {
    return <PageLoader className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-tight text-slate-900 dark:text-white">
            {t('emailTemplates.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('emailTemplates.description')}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('emailTemplates.search', 'Search templates...')}
            className="pl-9 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              'rounded-xl text-xs font-semibold uppercase tracking-widest whitespace-nowrap',
              activeCategory === cat.key && 'bg-emerald-600 hover:bg-emerald-700 text-white',
            )}
          >
            {t(cat.labelKey)}
          </Button>
        ))}
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-xl border-dashed">
          <Mail className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {search ? t('emailTemplates.noResults') : t('emailTemplates.noTemplates')}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, tpls]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={CATEGORY_COLORS[category as EmailTemplateCategory]} variant="secondary">
                    {t(`emailTemplates.categories.${category}`)}
                  </Badge>
                  <span className="text-xs font-medium text-slate-400">
                    {tpls.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tpls.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left',
                        selectedTemplate?.id === tpl.id
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm',
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-xl flex-shrink-0',
                        selectedTemplate?.id === tpl.id
                          ? 'bg-emerald-100 dark:bg-emerald-900/40'
                          : 'bg-slate-100 dark:bg-slate-800',
                      )}>
                        <Mail className={cn(
                          'h-4 w-4',
                          selectedTemplate?.id === tpl.id
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500',
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {tpl.name}
                          </span>
                          {tpl.is_system && (
                            <Shield className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          )}
                          {!tpl.is_active && (
                            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                              {t('emailTemplates.inactive')}
                            </Badge>
                          )}
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {tpl.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedTemplate ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden sticky top-4">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {selectedTemplate.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={CATEGORY_COLORS[selectedTemplate.category]} variant="secondary">
                        {selectedTemplate.type}
                      </Badge>
                      {selectedTemplate.is_system && (
                        <Badge variant="outline" className="text-[10px]">
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          {t('emailTemplates.system')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      'rounded-xl',
                      showPreview && 'bg-slate-100 dark:bg-slate-800',
                    )}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(selectedTemplate)}
                    className="rounded-xl"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedTemplate)}
                    className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t('emailTemplates.active')}
                  </span>
                  <Switch
                    checked={selectedTemplate.is_active}
                    onCheckedChange={(checked) => {
                      toggleActiveMutation.mutate({ id: selectedTemplate.id, is_active: checked });
                      setSelectedTemplate((prev) => (prev ? { ...prev, is_active: checked } : prev));
                    }}
                  />
                </div>

                {selectedTemplate.variables?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                      {t('emailTemplates.variables')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px] font-mono">
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {t('emailTemplates.subject')}
                    </span>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl h-7"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        <span className="text-[10px]">{t('emailTemplates.edit')}</span>
                      </Button>
                    )}
                  </div>
                  {isEditing ? (
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      {selectedTemplate.subject}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                    {t('emailTemplates.htmlBody')}
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editHtmlBody}
                      onChange={(e) => setEditHtmlBody(e.target.value)}
                      className="w-full min-h-[300px] font-mono text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y"
                    />
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 max-h-[200px] overflow-auto">
                      <pre className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-all">
                        {selectedTemplate.html_body.slice(0, 2000)}
                        {selectedTemplate.html_body.length > 2000 && '...'}
                      </pre>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('emailTemplates.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditSubject(selectedTemplate.subject);
                        setEditHtmlBody(selectedTemplate.html_body);
                      }}
                      className="rounded-xl"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('emailTemplates.cancel')}
                    </Button>
                  </div>
                )}

                {showPreview && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                        {t('emailTemplates.preview')}
                      </span>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <iframe
                          srcDoc={selectedTemplate.html_body}
                          title={t('emailTemplates.preview')}
                          className="w-full h-[400px] bg-white"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border rounded-xl border-dashed">
              <Eye className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('emailTemplates.selectTemplate')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
