import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  Mail,
  Search,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Save,
  X,
  Shield,
  Tag,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────

type EmailTemplateCategory =
  | 'marketplace'
  | 'invoice'
  | 'quote'
  | 'order'
  | 'task'
  | 'reminder'
  | 'general';

interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: string;
  category: EmailTemplateCategory;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORIES: { key: EmailTemplateCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'quote', label: 'Quote' },
  { key: 'order', label: 'Order' },
  { key: 'task', label: 'Task' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  marketplace: 'bg-purple-100 text-purple-700',
  invoice: 'bg-blue-100 text-blue-700',
  quote: 'bg-cyan-100 text-cyan-700',
  order: 'bg-amber-100 text-amber-700',
  task: 'bg-orange-100 text-orange-700',
  reminder: 'bg-red-100 text-red-700',
  general: 'bg-slate-100 text-slate-700',
};

// ─── Page ────────────────────────────────────────────────────────────

function EmailTemplatesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<EmailTemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Fetch global email templates (organization_id IS NULL)
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-email-templates', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('email_templates')
        .select('*')
        .is('organization_id', null)
        .order('category')
        .order('name');

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; subject?: string; html_body?: string; is_active?: boolean }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      toast.success('Template updated');
      setIsEditing(false);
      if (selectedTemplate) {
        setSelectedTemplate((prev) =>
          prev ? { ...prev, subject: editSubject, html_body: editHtmlBody } : prev,
        );
      }
    },
    onError: () => toast.error('Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tpl: EmailTemplate) => {
      if (tpl.is_system) {
        // System templates: deactivate only
        const { error } = await supabase
          .from('email_templates')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', tpl.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .delete()
          .eq('id', tpl.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, tpl) => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      toast.success(tpl.is_system ? 'System template deactivated' : 'Template deleted');
      setSelectedTemplate(null);
      setIsEditing(false);
    },
    onError: () => toast.error('Failed to delete template'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: EmailTemplate) => {
      const { id, created_at, updated_at, ...rest } = tpl;
      const { error } = await supabase
        .from('email_templates')
        .insert({
          ...rest,
          name: `${tpl.name} (copy)`,
          is_system: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      toast.success('Template duplicated');
    },
    onError: () => toast.error('Failed to duplicate template'),
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

  const handleSelect = (tpl: EmailTemplate) => {
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

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage email notification templates across all organizations
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={clsx(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
              activeCategory === cat.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <Mail className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {search ? 'No templates match your search' : 'No email templates found'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Template list */}
          <div className="space-y-5">
            {Object.entries(groupedTemplates).map(([category, tpls]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium', CATEGORY_COLORS[category as EmailTemplateCategory])}>
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">{tpls.length}</span>
                </div>
                <div className="space-y-1.5">
                  {tpls.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelect(tpl)}
                      className={clsx(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                        selectedTemplate?.id === tpl.id
                          ? 'bg-emerald-50 border border-emerald-200 shadow-sm'
                          : 'bg-white border border-gray-200 hover:border-emerald-200 hover:shadow-sm',
                      )}
                    >
                      <div className={clsx(
                        'p-2 rounded-lg shrink-0',
                        selectedTemplate?.id === tpl.id ? 'bg-emerald-100' : 'bg-gray-100',
                      )}>
                        <Mail className={clsx(
                          'h-4 w-4',
                          selectedTemplate?.id === tpl.id ? 'text-emerald-600' : 'text-gray-400',
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{tpl.name}</span>
                          {tpl.is_system && <Shield className="h-3 w-3 text-gray-400 shrink-0" />}
                          {!tpl.is_active && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {tpl.type}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedTemplate ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-4">
              {/* Detail header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Mail className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {selectedTemplate.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', CATEGORY_COLORS[selectedTemplate.category])}>
                        {selectedTemplate.type}
                      </span>
                      {selectedTemplate.is_system && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" /> System
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={clsx('p-2 rounded-lg hover:bg-gray-100', showPreview && 'bg-gray-100')}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateMutation.mutate(selectedTemplate)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(selectedTemplate)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    title={selectedTemplate.is_system ? 'Deactivate' : 'Delete'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newActive = !selectedTemplate.is_active;
                      updateMutation.mutate({ id: selectedTemplate.id, is_active: newActive });
                      setSelectedTemplate((prev) => prev ? { ...prev, is_active: newActive } : prev);
                    }}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      selectedTemplate.is_active ? 'bg-emerald-500' : 'bg-gray-300',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      selectedTemplate.is_active ? 'translate-x-6' : 'translate-x-1',
                    )} />
                  </button>
                </div>

                {/* Variables */}
                {selectedTemplate.variables?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                      Variables
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.variables.map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                          <Tag className="h-2.5 w-2.5" /> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="border-gray-100" />

                {/* Subject */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject</span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {selectedTemplate.subject}
                    </p>
                  )}
                </div>

                {/* HTML body */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    HTML Body
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editHtmlBody}
                      onChange={(e) => setEditHtmlBody(e.target.value)}
                      className="w-full min-h-[300px] font-mono text-xs bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 max-h-[200px] overflow-auto">
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap break-all">
                        {selectedTemplate.html_body.slice(0, 2000)}
                        {selectedTemplate.html_body.length > 2000 && '...'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Save / Cancel */}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditSubject(selectedTemplate.subject);
                        setEditHtmlBody(selectedTemplate.html_body);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                )}

                {/* Preview */}
                {showPreview && (
                  <>
                    <hr className="border-gray-100" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                        Preview
                      </span>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <iframe
                          srcDoc={selectedTemplate.html_body}
                          title="Email preview"
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
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
              <Eye className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Select a template to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/email-templates')({
  component: EmailTemplatesPage,
});
