import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileCheck, AlertCircle, Info, Shield, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { ExpertAudit } from '@/types/calibration-review';

interface ExpertLectureProps {
  audit: ExpertAudit;
}

export function ExpertLecture({ audit }: ExpertLectureProps) {
  const { t } = useTranslation('ai');
  const [isOpen, setIsOpen] = useState(false);

  const getRuleStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300';
      case 'skipped': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'not_implemented': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getComplianceLabel = (level: string) => {
    const key = `calibrationReview.expertLecture.compliance${level.charAt(0).toUpperCase()}${level.slice(1)}` as const;
    return t(key, level);
  };

  const getComplianceColor = (level: string) => {
    switch (level) {
      case 'full': return 'text-green-600 dark:text-green-400';
      case 'partial': return 'text-yellow-600 dark:text-yellow-400';
      case 'minimal': return 'text-orange-600 dark:text-orange-400';
      case 'none': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getNoteIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t('calibrationReview.expertLecture.title')}</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{t('calibrationReview.expertLecture.toggleSrOnly')}</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="px-6 pb-6 pt-2 space-y-6 border-t border-l-4 border-l-amber-500">
          {/* Protocol Compliance */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('calibrationReview.expertLecture.protocolCompliance')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.expertLecture.overall')}</div>
                <div className={cn("font-semibold", getComplianceColor(audit.protocol_compliance.overall))}>
                  {getComplianceLabel(audit.protocol_compliance.overall)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.expertLecture.filtering')}</div>
                <div className={cn("font-medium", getComplianceColor(audit.protocol_compliance.section_1_filtering))}>
                  {getComplianceLabel(audit.protocol_compliance.section_1_filtering)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.expertLecture.classification')}</div>
                <div className={cn("font-medium", getComplianceColor(audit.protocol_compliance.section_2_classification))}>
                  {getComplianceLabel(audit.protocol_compliance.section_2_classification)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.expertLecture.diagnostic')}</div>
                <div className={cn("font-medium", getComplianceColor(audit.protocol_compliance.section_3_diagnostic))}>
                  {getComplianceLabel(audit.protocol_compliance.section_3_diagnostic)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.expertLecture.alerts')}</div>
                <div className={cn("font-medium", getComplianceColor(audit.protocol_compliance.section_4_alerts))}>
                  {getComplianceLabel(audit.protocol_compliance.section_4_alerts)}
                </div>
              </div>
            </div>
          </div>

          {/* Rules Applied */}
          {audit.rules_applied && audit.rules_applied.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.expertLecture.rulesApplied')}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t('calibrationReview.expertLecture.ruleId')}</TableHead>
                      <TableHead>{t('calibrationReview.expertLecture.name')}</TableHead>
                      <TableHead>{t('calibrationReview.level4.status')}</TableHead>
                      <TableHead>{t('calibrationReview.expertLecture.detail')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.rules_applied.map((rule) => (
                      <TableRow key={rule.rule_id}>
                        <TableCell className="font-mono text-xs">{rule.rule_id}</TableCell>
                        <TableCell className="text-sm">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] uppercase", getRuleStatusColor(rule.status))}>
                            {t(`calibrationReview.expertLecture.status.${rule.status.replace(/_/g, '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{rule.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Missing Data */}
          {audit.missing_data && audit.missing_data.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.expertLecture.missingData')}</h3>
              <div className="space-y-2">
                {audit.missing_data.map((item, fieldIdx) => (
                  <div key={`missing-${item.field}-${fieldIdx}`} className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-300 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      {item.field}
                    </div>
                    <div className="text-orange-700 dark:text-orange-400 text-xs mb-1">
                      <span className="font-medium">{t('calibrationReview.expertLecture.impact')}:</span> {item.impact}
                    </div>
                    {item.workaround && (
                      <div className="text-orange-700/80 dark:text-orange-400/80 text-xs italic">
                        <span className="font-medium not-italic">{t('calibrationReview.expertLecture.workaround')}:</span> {item.workaround}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert Notes */}
          {audit.expert_notes && audit.expert_notes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.expertLecture.expertNotes')}</h3>
              <div className="space-y-2">
                {audit.expert_notes.map((note) => (
                  <div key={`note-${note.note.substring(0, 20)}`} className="flex items-start gap-3 p-3 bg-muted/30 border rounded-lg text-sm">
                    <div className="mt-0.5">{getNoteIcon(note.severity)}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {note.category.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground uppercase">{t(`calibrationReview.expertLecture.severity.${note.severity}`)}</span>
                      </div>
                      <p className="text-muted-foreground">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
