
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { AIAlert } from '@/lib/api/ai-alerts';
import { Button } from '@/components/ui/button';

interface AlertCardProps {
  alert: AIAlert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  isAcknowledging?: boolean;
  isResolving?: boolean;
}

export const AlertCard = ({
  alert,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  isResolving,
}: AlertCardProps) => {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      default: return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (alert.status) {
      case 'active': return <AlertTriangle className="w-5 h-5" />;
      case 'acknowledged': return <Clock className="w-5 h-5" />;
      case 'resolved': return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  return (
    <div className={`rounded-xl border p-5 ${getSeverityColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div>
            <h4 className="font-semibold capitalize">{alert.alert_type.replace(/_/g, ' ')}</h4>
            <p className="text-sm mt-1 opacity-90">{alert.description}</p>
            <div className="flex items-center space-x-4 mt-3 text-xs opacity-75">
              <span>{new Date(alert.created_at).toLocaleDateString()}</span>
              <span className="capitalize px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                {alert.severity}
              </span>
              <span className="capitalize px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                {alert.status}
              </span>
            </div>
          </div>
        </div>

        {alert.status !== 'resolved' && (
          <div className="flex flex-col space-y-2 ml-4">
            {alert.status === 'active' && onAcknowledge && (
              <Button
                type="button"
                onClick={() => onAcknowledge(alert.id)}
                disabled={isAcknowledging}
                className="px-3 py-1.5 text-xs font-medium bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors disabled:opacity-50"
              >
                {isAcknowledging ? '...' : 'Acknowledge'}
              </Button>
            )}
            {onResolve && (
              <Button
                type="button"
                onClick={() => onResolve(alert.id)}
                disabled={isResolving}
                className="px-3 py-1.5 text-xs font-medium bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 rounded-lg transition-colors disabled:opacity-50"
              >
                {isResolving ? '...' : 'Resolve'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
