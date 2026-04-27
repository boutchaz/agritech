import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BookOpen, Edit3, Check, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { referentialsApi } from '@/lib/api/referentials';
import type { ReferentialSummary } from '@/lib/api/referentials';

export const Route = createFileRoute('/_authenticated/referentiels')({
  component: ReferentielsPage,
});

// ---------------------------------------------------------------------------
// Condition renderer — turns JSON-Logic-like objects into readable strings
// ---------------------------------------------------------------------------

function renderCondition(cond: Record<string, unknown>): string {
  if ('and' in cond)
    return (cond.and as Record<string, unknown>[]).map(renderCondition).join(' ET ');
  if ('or' in cond)
    return (cond.or as Record<string, unknown>[]).map(renderCondition).join(' OU ');
  if ('not' in cond) return `NON(${renderCondition(cond.not as Record<string, unknown>)})`;
  const v = cond.var as string | undefined;
  if (!v) return JSON.stringify(cond);
  if ('gte' in cond) return `${v} \u2265 ${cond.gte}`;
  if ('gt' in cond) return `${v} > ${cond.gt}`;
  if ('lte' in cond) return `${v} \u2264 ${cond.lte}`;
  if ('lt' in cond) return `${v} < ${cond.lt}`;
  if ('eq' in cond) return `${v} = ${cond.eq}`;
  if ('between' in cond)
    return `${v} \u2208 [${(cond.between as unknown[]).join(', ')}]`;
  if ('in' in cond) return `${v} \u2208 {${(cond.in as unknown[]).join(', ')}}`;
  if ('gt_var' in cond)
    return `${v} > ${cond.gt_var}${cond.factor ? ` \u00d7 ${cond.factor}` : ''}`;
  if ('lt_var' in cond)
    return `${v} < ${cond.lt_var}${cond.factor ? ` \u00d7 ${cond.factor}` : ''}`;
  if ('gte_var' in cond)
    return `${v} \u2265 ${cond.gte_var}${cond.factor ? ` \u00d7 ${cond.factor}` : ''}`;
  if ('lte_var' in cond)
    return `${v} \u2264 ${cond.lte_var}${cond.factor ? ` \u00d7 ${cond.factor}` : ''}`;
  return JSON.stringify(cond);
}

// ---------------------------------------------------------------------------
// Crop tabs configuration
// ---------------------------------------------------------------------------

const CROP_TABS = [
  { value: 'olivier', label: 'Olivier' },
  { value: 'agrumes', label: 'Agrumes' },
  { value: 'avocatier', label: 'Avocatier' },
  { value: 'palmier_dattier', label: 'Palmier Dattier' },
  { value: 'amandier', label: 'Amandier' },
];

const SECTION_TABS = [
  { value: 'phases', label: 'Phases Ph\u00e9nologiques' },
  { value: 'signaux', label: 'Signaux' },
  { value: 'maturite', label: 'Maturit\u00e9' },
  { value: 'stades_bbch', label: 'Stades BBCH' },
  { value: 'varietes', label: 'Vari\u00e9t\u00e9s' },
];

// ---------------------------------------------------------------------------
// JSON Edit Dialog
// ---------------------------------------------------------------------------

function JsonEditDialog({
  open,
  onOpenChange,
  title,
  crop,
  section,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  crop: string;
  section: string;
  initialData: unknown;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reset text when dialog opens
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setJsonText(JSON.stringify(initialData, null, 2));
        setValidationErrors([]);
      }
      onOpenChange(next);
    },
    [initialData, onOpenChange],
  );

  const validateMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(jsonText);
      return referentialsApi.validate(crop, { [section]: parsed });
    },
    onSuccess: (result) => {
      if (result.valid) {
        setValidationErrors([]);
        toast.success(t('common.validation_passed', 'Validation passed'));
      } else {
        setValidationErrors(result.errors || ['Validation failed']);
      }
    },
    onError: (err: Error) => {
      setValidationErrors([err.message]);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(jsonText);
      return referentialsApi.updateSection(crop, section, parsed);
    },
    onSuccess: () => {
      toast.success(t('common.saved', 'Saved successfully'));
      queryClient.invalidateQueries({ queryKey: ['referential', crop] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleValidate = useCallback(() => {
    try {
      JSON.parse(jsonText);
      validateMutation.mutate();
    } catch {
      setValidationErrors(['Invalid JSON syntax']);
    }
  }, [jsonText, validateMutation]);

  const handleSave = useCallback(() => {
    try {
      JSON.parse(jsonText);
      saveMutation.mutate();
    } catch {
      setValidationErrors(['Invalid JSON syntax']);
    }
  }, [jsonText, saveMutation]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className={cn(
              'w-full h-[50vh] font-mono text-sm p-4 rounded-md border resize-none',
              'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100',
              'border-slate-200 dark:border-slate-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
            )}
            spellCheck={false}
          />

          {validationErrors.length > 0 && (
            <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium mb-1">
                <AlertTriangle className="h-4 w-4" />
                {t('common.validation_errors', 'Validation Errors')}
              </div>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {t('common.validate', 'Validate')}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Section: Phases Phenologiques
// ---------------------------------------------------------------------------

const KNOWN_PHASES = [
  'DORMANCE',
  'DEBOURREMENT',
  'FLORAISON',
  'NOUAISON',
  'STRESS_ESTIVAL',
  'REPRISE_AUTOMNALE',
];

function confidenceBadgeVariant(c: string) {
  switch (c) {
    case 'ELEVEE':
      return 'default';
    case 'MODEREE':
      return 'secondary';
    case 'FAIBLE':
      return 'outline';
    default:
      return 'outline';
  }
}

function PhasesSection({ data, crop }: { data: Record<string, unknown>; crop: string }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const proto = data.protocole_phenologique as Record<string, unknown> | undefined;
  const phases = proto?.phases as Record<string, unknown> | undefined;

  if (!phases) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('common.no_data', 'No data available')}
      </div>
    );
  }

  const phaseKeys = KNOWN_PHASES.filter((k) => k in phases);
  // Also include any phases not in our known list
  const extraKeys = Object.keys(phases).filter(
    (k) => !k.startsWith('_') && !KNOWN_PHASES.includes(k) && k !== 'calculs_preliminaires',
  );
  const allPhaseKeys = [...phaseKeys, ...extraKeys];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('common.phenological_phases', 'Phases Ph\u00e9nologiques')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {t('common.edit_json', 'Edit JSON')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {allPhaseKeys.map((key) => {
          const phase = phases[key] as Record<string, unknown>;
          if (!phase || typeof phase !== 'object') return null;
          const nom = (phase.nom as string) || key;
          const skipWhen = phase.skip_when as Record<string, unknown> | undefined;
          const exitRules = (phase.exit as Record<string, unknown>[]) || [];

          return (
            <Card key={key} className="border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {key}
                  </Badge>
                  <span>{nom}</span>
                </CardTitle>
                {skipWhen && (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs">
                      skip_when: {renderCondition(skipWhen)}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {exitRules.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    {t('common.no_exit_rules', 'No exit rules')}
                  </p>
                )}
                {exitRules.map((rule, idx) => {
                  const target = rule.target as string;
                  const when = rule.when as Record<string, unknown> | undefined;
                  const confidence = rule.confidence as string | undefined;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-md p-2 text-sm',
                        'bg-slate-50 dark:bg-slate-800/50',
                      )}
                    >
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {target}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 break-all">
                        {when ? renderCondition(when) : '-'}
                      </span>
                      {confidence && (
                        <Badge
                          variant={confidenceBadgeVariant(confidence)}
                          className="ml-auto text-xs shrink-0"
                        >
                          {confidence}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <JsonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Phases Ph\u00e9nologiques"
        crop={crop}
        section="protocole_phenologique"
        initialData={proto}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Signaux (streaks)
// ---------------------------------------------------------------------------

function SignauxSection({ data, crop }: { data: Record<string, unknown>; crop: string }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const signaux = data.signaux as Record<string, unknown> | undefined;
  const streaks = signaux?.streaks as Record<string, unknown> | undefined;

  if (!streaks) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('common.no_data', 'No data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('common.signals', 'Signaux (Streaks)')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {t('common.edit_json', 'Edit JSON')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Streak
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Condition
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(streaks).map(([name, condition]) => (
              <tr
                key={name}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-2 px-3 font-mono text-xs">
                  <Badge variant="outline">{name}</Badge>
                </td>
                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                  {renderCondition(condition as Record<string, unknown>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JsonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Signaux"
        crop={crop}
        section="signaux"
        initialData={signaux}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Maturite
// ---------------------------------------------------------------------------

function MaturiteSection({ data, crop }: { data: Record<string, unknown>; crop: string }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const proto = data.protocole_phenologique as Record<string, unknown> | undefined;
  const phasesMat = proto?.phases_par_maturite as Record<string, unknown> | undefined;

  if (!phasesMat) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('common.no_data', 'No data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('common.maturity_phases', 'Phases par Maturit\u00e9')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {t('common.edit_json', 'Edit JSON')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                {t('common.maturity_phase', 'Phase de maturit\u00e9')}
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                {t('common.active_phases', 'Phases actives')}
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(phasesMat).map(([phase, value]) => (
              <tr
                key={phase}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-2 px-3 font-mono text-xs">
                  <Badge variant="outline">{phase}</Badge>
                </td>
                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1">
                      {value.map((v: string) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  ) : value === null ? (
                    <span className="text-muted-foreground italic">
                      {t('common.all_phases', 'Toutes les phases (default)')}
                    </span>
                  ) : (
                    String(value)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JsonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Phases par Maturit\u00e9"
        crop={crop}
        section="protocole_phenologique"
        initialData={proto}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Stades BBCH
// ---------------------------------------------------------------------------

function StadesBbchSection({ data, crop }: { data: Record<string, unknown>; crop: string }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const stades = data.stades_bbch as Record<string, unknown>[] | undefined;

  if (!stades || !Array.isArray(stades)) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('common.no_data', 'No data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('common.bbch_stages', 'Stades BBCH')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {t('common.edit_json', 'Edit JSON')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Code
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Nom
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Mois
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                GDD
              </th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                Phase Kc
              </th>
            </tr>
          </thead>
          <tbody>
            {stades.map((stade, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-2 px-3 font-mono">
                  <Badge variant="outline">{stade.code as string}</Badge>
                </td>
                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                  {stade.nom as string}
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                  {Array.isArray(stade.mois) ? (stade.mois as string[]).join(', ') : '-'}
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                  {Array.isArray(stade.gdd_cumul)
                    ? `${(stade.gdd_cumul as number[])[0]}\u2013${(stade.gdd_cumul as number[])[1]}`
                    : '-'}
                </td>
                <td className="py-2 px-3">
                  <Badge variant="secondary" className="text-xs">
                    {stade.phase_kc as string}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JsonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Stades BBCH"
        crop={crop}
        section="stades_bbch"
        initialData={stades}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Varietes
// ---------------------------------------------------------------------------

function VarietesSection({ data, crop }: { data: Record<string, unknown>; crop: string }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const varietes = data.varietes as Record<string, unknown>[] | undefined;

  if (!varietes || !Array.isArray(varietes)) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('common.no_data', 'No data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('common.varieties', 'Vari\u00e9t\u00e9s')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {t('common.edit_json', 'Edit JSON')}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {varietes.map((v, idx) => (
          <Card key={idx} className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {v.code as string}
                </Badge>
                <span>{v.nom as string}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {v.origine && <p>Origine: {String(v.origine)}</p>}
              {v.usage && <p>Usage: {String(v.usage)}</p>}
              {Array.isArray(v.huile_pct) && (
                <p>
                  Huile: {(v.huile_pct as number[])[0]}\u2013{(v.huile_pct as number[])[1]}%
                </p>
              )}
              {Array.isArray(v.systemes_compatibles) && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(v.systemes_compatibles as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <JsonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Vari\u00e9t\u00e9s"
        crop={crop}
        section="varietes"
        initialData={varietes}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function ReferentielsPage() {
  const { t } = useTranslation();
  const [selectedCrop, setSelectedCrop] = useState('olivier');
  const [selectedSection, setSelectedSection] = useState('phases');

  // Fetch crop list
  const { data: cropList } = useQuery({
    queryKey: ['referentials-list'],
    queryFn: () => referentialsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch selected crop data
  const {
    data: cropData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['referential', selectedCrop],
    queryFn: () => referentialsApi.get(selectedCrop),
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedCrop,
  });

  // Merge available crops from API list with our defaults
  const availableCrops = useMemo(() => {
    if (!cropList) return CROP_TABS;
    const apiCrops = cropList.map((c: ReferentialSummary) => c.crop);
    const merged = [...CROP_TABS];
    for (const crop of apiCrops) {
      if (!merged.find((m) => m.value === crop)) {
        merged.push({ value: crop, label: crop.charAt(0).toUpperCase() + crop.slice(1) });
      }
    }
    return merged;
  }, [cropList]);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <BookOpen className="w-6 h-6" />
          {t('common.referentials', 'R\u00e9f\u00e9rentiels Cultures')}
        </h2>
        <p className="text-muted-foreground">
          {t(
            'common.referentials_description',
            'View and edit crop referential data for the condition engine.',
          )}
        </p>
      </div>

      {/* Crop Tabs */}
      <Tabs value={selectedCrop} onValueChange={setSelectedCrop}>
        <TabsList>
          {availableCrops.map((crop) => (
            <TabsTrigger key={crop.value} value={crop.value}>
              {crop.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400">
            {(error as Error)?.message || t('common.error', 'An error occurred')}
          </p>
        </div>
      )}

      {/* Data */}
      {cropData && !isLoading && (
        <Tabs value={selectedSection} onValueChange={setSelectedSection}>
          <TabsList>
            {SECTION_TABS.map((section) => (
              <TabsTrigger key={section.value} value={section.value}>
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="phases">
            <PhasesSection data={cropData} crop={selectedCrop} />
          </TabsContent>

          <TabsContent value="signaux">
            <SignauxSection data={cropData} crop={selectedCrop} />
          </TabsContent>

          <TabsContent value="maturite">
            <MaturiteSection data={cropData} crop={selectedCrop} />
          </TabsContent>

          <TabsContent value="stades_bbch">
            <StadesBbchSection data={cropData} crop={selectedCrop} />
          </TabsContent>

          <TabsContent value="varietes">
            <VarietesSection data={cropData} crop={selectedCrop} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
