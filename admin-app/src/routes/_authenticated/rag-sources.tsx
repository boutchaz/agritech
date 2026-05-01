import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Link2, Loader2, Plus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { apiRequest } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────

type IngestionStatus = 'pending' | 'running' | 'ready' | 'failed';

interface AgronomySource {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  doc_type: string | null;
  language: string | null;
  region: string[] | null;
  crop_type: string[] | null;
  season: string[] | null;
  published_at: string | null;
  source_url: string | null;
  storage_path: string | null;
  ingestion_status: IngestionStatus;
  ingestion_error: string | null;
  chunk_count: number;
}

interface RetrievedChunk {
  id: string;
  source_id: string;
  text: string;
  page: number | null;
  rrf_score: number;
  rerank_score: number | null;
  source: {
    id: string;
    title: string;
    publisher: string | null;
    source_url: string | null;
  };
}

interface TestChatResponse {
  chunks: RetrievedChunk[];
}

const DOC_TYPES = [
  'fiche_technique',
  'publication',
  'bulletin',
  'db_calibration',
  'playbook',
] as const;
const LANGUAGES = ['fr', 'ar', 'en'] as const;

// ─── Schema ──────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Required'),
  author: z.string().optional(),
  publisher: z.string().optional(),
  doc_type: z.enum(DOC_TYPES).optional(),
  language: z.enum(LANGUAGES).optional(),
  region: z.string().optional(), // CSV
  crop_type: z.string().optional(), // CSV
  season: z.string().optional(), // CSV
  published_at: z.string().optional(),
  mode: z.enum(['file', 'link']),
  source_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  storage_path: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const chatSchema = z.object({
  query: z.string().min(1, 'Ask something'),
  crop_type: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().int().min(1).max(20),
});

type ChatFormData = z.infer<typeof chatSchema>;

const defaultValues: FormData = {
  title: '',
  author: '',
  publisher: '',
  doc_type: undefined,
  language: 'fr',
  region: '',
  crop_type: '',
  season: '',
  published_at: '',
  mode: 'link',
  source_url: '',
  storage_path: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<IngestionStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-800',
  ready: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

function csvToArray(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

// ─── Component ───────────────────────────────────────────────────────

function RagSourcesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgronomySource | null>(null);

  const { data: sources, isLoading } = useQuery({
    queryKey: ['admin', 'rag-sources'],
    queryFn: () => apiRequest<AgronomySource[]>('/api/v1/admin/agronomy/sources'),
    refetchInterval: (q) => {
      const rows = q.state.data as AgronomySource[] | undefined;
      return rows?.some((s) => s.ingestion_status === 'running' || s.ingestion_status === 'pending')
        ? 3000
        : false;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const chatForm = useForm<ChatFormData>({
    resolver: zodResolver(chatSchema),
    defaultValues: { query: '', crop_type: '', region: '', limit: 8 },
  });
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);

  const testChatMutation = useMutation({
    mutationFn: async (data: ChatFormData) => {
      const payload = {
        query: data.query.trim(),
        crop_type: data.crop_type?.trim() || undefined,
        region: data.region?.trim() || undefined,
        limit: data.limit,
      };
      return apiRequest<TestChatResponse>('/api/v1/admin/agronomy/test-chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (res) => {
      setChunks(res.chunks);
      if (res.chunks.length === 0) {
        toast.info('No chunks retrieved for this query');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        author: data.author || undefined,
        publisher: data.publisher || undefined,
        doc_type: data.doc_type,
        language: data.language,
        region: csvToArray(data.region),
        crop_type: csvToArray(data.crop_type),
        season: csvToArray(data.season),
        published_at: data.published_at || undefined,
        source_url: data.mode === 'link' ? data.source_url || undefined : undefined,
        storage_path: data.mode === 'file' ? data.storage_path || undefined : undefined,
      };
      return apiRequest<AgronomySource>('/api/v1/admin/agronomy/sources', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rag-sources'] });
      toast.success('Source ingested');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/v1/admin/agronomy/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rag-sources'] });
      toast.success('Source deleted');
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset(defaultValues);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File exceeds 50MB');
      return;
    }
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      toast.error('Only PDF or image files allowed');
      return;
    }
    setUploading(true);
    try {
      const uuid = crypto.randomUUID();
      const path = `${uuid}/${file.name}`;
      const { error } = await supabase.storage
        .from('agronomy-corpus')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      form.setValue('storage_path', `agronomy-corpus/${path}`);
      toast.success('File uploaded — fill metadata and submit');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const mode = form.watch('mode');
  const storagePath = form.watch('storage_path');

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agronomy RAG Corpus</h1>
            <p className="text-sm text-slate-500">
              Manage sources ingested into the agronomy knowledge base.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            form.reset(defaultValues);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Add source
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Publisher</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Lang</th>
              <th className="px-4 py-3 text-left">Crop</th>
              <th className="px-4 py-3 text-right">Chunks</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (!sources || sources.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No sources yet. Click "Add source" to ingest the first document.
                </td>
              </tr>
            )}
            {sources?.map((src) => (
              <tr key={src.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{src.title}</div>
                  {src.source_url && (
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-emerald-600"
                    >
                      {src.source_url}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{src.publisher ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{src.doc_type ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{src.language ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{src.crop_type?.join(', ') ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {src.chunk_count}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_COLORS[src.ingestion_status],
                    )}
                  >
                    {src.ingestion_status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {src.ingestion_status}
                  </span>
                  {src.ingestion_status === 'failed' && src.ingestion_error && (
                    <div className="mt-1 max-w-xs truncate text-xs text-red-600" title={src.ingestion_error}>
                      {src.ingestion_error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(src)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Test chat — validate RAG retrieval against the public corpus */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <header className="flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900">Test RAG retrieval</h2>
        </header>
        <p className="mt-1 text-sm text-slate-500">
          Run a query against the ingested corpus and inspect the ranked chunks. Useful to verify
          that an ingestion worked and that filters behave as expected.
        </p>

        <form
          onSubmit={chatForm.handleSubmit((data) => testChatMutation.mutate(data))}
          className="mt-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600">Question</label>
            <textarea
              {...chatForm.register('query')}
              rows={2}
              placeholder="Ex: Quand fertiliser un verger d'oliviers à Meknès ?"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {chatForm.formState.errors.query && (
              <p className="mt-1 text-xs text-red-600">{chatForm.formState.errors.query.message}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Crop type</label>
              <input
                {...chatForm.register('crop_type')}
                placeholder="olivier"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Region (CSV)</label>
              <input
                {...chatForm.register('region')}
                placeholder="Meknes, Fes"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Limit</label>
              <input
                type="number"
                min={1}
                max={20}
                {...chatForm.register('limit', { valueAsNumber: true })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={testChatMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {testChatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Run query
            </button>
          </div>
        </form>

        {chunks.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {chunks.length} chunk{chunks.length > 1 ? 's' : ''} retrieved
            </div>
            <ol className="space-y-3">
              {chunks.map((chunk, idx) => (
                <li
                  key={chunk.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      [{idx + 1}] {chunk.source.title}
                      {chunk.page != null && (
                        <span className="ml-2 text-xs text-slate-500">p. {chunk.page}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>rrf {chunk.rrf_score.toFixed(3)}</span>
                      {chunk.rerank_score != null && (
                        <span>· rerank {chunk.rerank_score.toFixed(3)}</span>
                      )}
                    </div>
                  </div>
                  {(chunk.source.publisher || chunk.source.source_url) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {chunk.source.publisher && <span>{chunk.source.publisher}</span>}
                      {chunk.source.publisher && chunk.source.source_url && <span> · </span>}
                      {chunk.source.source_url && (
                        <a
                          href={chunk.source.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                        >
                          source
                        </a>
                      )}
                    </div>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{chunk.text}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Add dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold text-slate-900">Add RAG source</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">
              Upload a PDF or paste a public URL from an allowlisted domain.
            </Dialog.Description>

            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="mt-5 space-y-4"
            >
              {/* Mode tabs */}
              <div className="flex rounded-lg border border-slate-200 p-1">
                {(['link', 'file'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      form.setValue('mode', m);
                      form.setValue('source_url', '');
                      form.setValue('storage_path', '');
                    }}
                    className={clsx(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium inline-flex items-center justify-center gap-2',
                      mode === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {m === 'link' ? <Link2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    {m === 'link' ? 'Add link' : 'Upload file'}
                  </button>
                ))}
              </div>

              {mode === 'link' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600">Source URL</label>
                  <input
                    {...form.register('source_url')}
                    type="url"
                    placeholder="https://www.inra.org.ma/..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {form.formState.errors.source_url && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.source_url.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600">PDF / image file</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    disabled={uploading}
                    className="mt-1 w-full text-sm"
                  />
                  {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
                  {storagePath && (
                    <p className="mt-1 text-xs text-emerald-600">Uploaded: {storagePath}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600">Title *</label>
                  <input
                    {...form.register('title')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {form.formState.errors.title && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Publisher</label>
                  <input
                    {...form.register('publisher')}
                    placeholder="INRA Maroc"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Author</label>
                  <input
                    {...form.register('author')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Doc type</label>
                  <select
                    {...form.register('doc_type')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Language</label>
                  <select
                    {...form.register('language')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Region (CSV)</label>
                  <input
                    {...form.register('region')}
                    placeholder="Meknes, Fes"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Crop type (CSV)</label>
                  <input
                    {...form.register('crop_type')}
                    placeholder="olivier, agrumes"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Published date</label>
                  <input
                    type="date"
                    {...form.register('published_at')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Season (CSV)</label>
                  <input
                    {...form.register('season')}
                    placeholder="printemps, été"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ingest source
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirm */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold text-slate-900">Delete source?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-600">
              This removes the source and all its chunks and citations. Cannot be undone.
            </Dialog.Description>
            {deleteTarget && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {deleteTarget.title}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/rag-sources')({
  component: RagSourcesPage,
});
