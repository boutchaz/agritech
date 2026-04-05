import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle } from 'lucide-react';

interface RecommendationData {
  // V2 6-bloc structure
  bloc_1_constat?: string | { valeurs_indices?: Record<string, number>; coherence_inter_indices?: string } | null;
  bloc_2_diagnostic?: { hypothese_principale?: string; confiance?: string } | null;
  bloc_3_action?: { description?: string; produit?: string; dose?: { valeur?: number; unite?: string } } | null;
  bloc_4_fenetre?: { priorite?: string; periode_optimale?: string; date_limite?: string } | null;
  bloc_6_suivi?: { delai_evaluation_j?: string; reponse_attendue?: string } | null;
  mention_responsabilite?: string;
  // Legacy flat fields (backward compatible)
  constat?: string;
  diagnostic?: string;
  action?: string;
  priority?: string;
  valid_from?: string;
  valid_until?: string;
  alert_code?: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  '🔴': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  priority: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  '🟠': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  vigilance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  '🟡': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  info: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  '🟢': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function RecommendationCard({ data }: { data: RecommendationData }) {
  const isV2 = !!data.bloc_3_action;
  const priority = data.bloc_4_fenetre?.priorite ?? data.priority ?? 'info';
  const constat = typeof data.bloc_1_constat === 'string'
    ? data.bloc_1_constat
    : data.bloc_1_constat?.coherence_inter_indices ?? data.constat ?? '';
  const diagnostic = data.bloc_2_diagnostic?.hypothese_principale ?? data.diagnostic;
  const action = data.bloc_3_action?.description ?? data.action ?? '';

  return (
    <Card className="my-2 border-l-4 border-l-amber-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {data.alert_code ? `${data.alert_code} — ` : ''}Recommendation
          </div>
          <Badge className={priorityColors[priority] || 'bg-muted'}>
            {priority}
          </Badge>
        </div>

        {constat && <p className="text-sm text-muted-foreground">{constat}</p>}

        {diagnostic && (
          <p className="text-xs text-muted-foreground italic">
            {diagnostic}
            {isV2 && data.bloc_2_diagnostic?.confiance && (
              <span className="ml-2">{data.bloc_2_diagnostic.confiance}</span>
            )}
          </p>
        )}

        <p className="text-sm font-medium">{action}</p>

        {isV2 && data.bloc_3_action?.produit && data.bloc_3_action?.dose && (
          <p className="text-xs text-muted-foreground">
            {data.bloc_3_action.produit} — {data.bloc_3_action.dose.valeur} {data.bloc_3_action.dose.unite}
          </p>
        )}

        {data.bloc_4_fenetre?.date_limite && (
          <p className="text-xs text-muted-foreground">
            Deadline: {data.bloc_4_fenetre.date_limite}
          </p>
        )}

        {data.bloc_6_suivi?.reponse_attendue && (
          <p className="text-xs text-muted-foreground">
            Follow-up: {data.bloc_6_suivi.reponse_attendue} ({data.bloc_6_suivi.delai_evaluation_j}j)
          </p>
        )}

        {!isV2 && (data.valid_from || data.valid_until) && (
          <p className="text-xs text-muted-foreground">
            {data.valid_from && `From: ${data.valid_from}`}
            {data.valid_from && data.valid_until && ' — '}
            {data.valid_until && `Until: ${data.valid_until}`}
          </p>
        )}

        {data.mention_responsabilite && (
          <p className="text-[10px] text-muted-foreground/60 italic border-t pt-1 mt-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {data.mention_responsabilite}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
