import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  Leaf,
  Droplets,
  Target,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { AIReportSections } from '../../lib/api/ai-reports';

interface AIReportPreviewProps {
  sections: AIReportSections;
  generatedAt: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-800">{children}</div>}
    </div>
  );
};

const severityStyles = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    text: 'text-red-800 dark:text-red-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    text: 'text-blue-800 dark:text-blue-300',
  },
};

const priorityStyles = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export const AIReportPreview: React.FC<AIReportPreviewProps> = ({
  sections,
  generatedAt,
}) => {
  const healthScore = sections.healthAssessment?.overallScore ?? 0;
  const healthColor =
    healthScore >= 70
      ? 'text-green-600 dark:text-green-400'
      : healthScore >= 40
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-4">
      {/* Header with timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Généré le{' '}
          {new Date(generatedAt).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Executive Summary */}
      <CollapsibleSection
        title="Résumé Exécutif"
        icon={<Target className="w-5 h-5 text-green-600" />}
        defaultOpen={true}
      >
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {sections.executiveSummary}
        </p>
      </CollapsibleSection>

      {/* Health Assessment */}
      <CollapsibleSection
        title="Évaluation de Santé"
        icon={<Leaf className="w-5 h-5 text-green-600" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div
                className={`text-4xl font-bold ${healthColor}`}
              >
                {healthScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                /100
              </div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    healthScore >= 70
                      ? 'bg-green-500'
                      : healthScore >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Individual Assessments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Leaf className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Sol
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {sections.healthAssessment?.soilHealth || 'Non évalué'}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Végétation
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {sections.healthAssessment?.vegetationHealth || 'Non évalué'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Eau
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {sections.healthAssessment?.waterStatus || 'Non évalué'}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Risk Alerts */}
      {sections.riskAlerts && sections.riskAlerts.length > 0 && (
        <CollapsibleSection
          title={`Alertes (${sections.riskAlerts.length})`}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {sections.riskAlerts.map((alert, index) => {
              const style = severityStyles[alert.severity] || severityStyles.info;
              return (
                <div
                  key={index}
                  className={`p-4 ${style.bg} ${style.border} border rounded-lg`}
                >
                  <div className="flex items-start space-x-3">
                    {style.icon}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${style.text}`}>
                          {alert.type}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {alert.description}
                      </p>
                      {alert.mitigationSteps && alert.mitigationSteps.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {alert.mitigationSteps.map((step, stepIndex) => (
                            <li
                              key={stepIndex}
                              className="text-sm text-gray-600 dark:text-gray-400 flex items-start"
                            >
                              <span className="mr-2">•</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Recommendations */}
      {sections.recommendations && sections.recommendations.length > 0 && (
        <CollapsibleSection
          title={`Recommandations (${sections.recommendations.length})`}
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {sections.recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          priorityStyles[rec.priority]
                        }`}
                      >
                        {rec.priority === 'high'
                          ? 'Priorité haute'
                          : rec.priority === 'medium'
                          ? 'Priorité moyenne'
                          : 'Priorité basse'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {rec.category}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {rec.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {rec.description}
                    </p>
                    {rec.timing && (
                      <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {rec.timing}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Action Items */}
      {sections.actionItems && sections.actionItems.length > 0 && (
        <CollapsibleSection
          title={`Actions à Entreprendre (${sections.actionItems.length})`}
          icon={<Target className="w-5 h-5 text-purple-600" />}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {sections.actionItems
              .sort((a, b) => a.priority - b.priority)
              .map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center text-sm font-medium">
                    {item.priority}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {item.action}
                    </p>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      {item.deadline && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.deadline}
                        </span>
                      )}
                      <span>Impact: {item.estimatedImpact}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default AIReportPreview;
