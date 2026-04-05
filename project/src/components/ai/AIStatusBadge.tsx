
import { BrainCircuit, CheckCircle2, AlertTriangle, Clock, XCircle, Archive } from 'lucide-react';

type AIStatusBadgeStatus =
  | 'awaiting_data'
  | 'ready_calibration'
  | 'calibrating'
  | 'calibrated'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'archived'
  // Calibration record statuses
  | 'in_progress'
  | 'awaiting_validation'
  | 'validated'
  | 'insufficient'
  | 'failed'
  | 'completed'
  // Legacy / fallback
  | 'pending'
  | 'unknown';

interface AIStatusBadgeProps {
  status: AIStatusBadgeStatus;
  className?: string;
}

export const AIStatusBadge = ({ status, className = '' }: AIStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'validated':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
          icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />,
          label: status === 'active' ? 'AI Active' : status === 'validated' ? 'Validated' : 'Completed',
        };
      case 'ready_calibration':
        return {
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
          icon: <BrainCircuit className="w-4 h-4 mr-1.5" />,
          label: 'Ready to Calibrate',
        };
      case 'calibrating':
      case 'in_progress':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          icon: <BrainCircuit className="w-4 h-4 mr-1.5 animate-pulse" />,
          label: 'Calibrating',
        };
      case 'calibrated':
      case 'awaiting_validation':
        return {
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          label: 'Awaiting Validation',
        };
      case 'awaiting_nutrition_option':
        return {
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          label: 'Nutrition Required',
        };
      case 'insufficient':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle className="w-4 h-4 mr-1.5" />,
          label: 'Insufficient Data',
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          label: 'Pending',
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
          icon: <XCircle className="w-4 h-4 mr-1.5" />,
          label: 'Failed',
        };
      case 'archived':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          icon: <Archive className="w-4 h-4 mr-1.5" />,
          label: 'Archived',
        };
      case 'awaiting_data':
      case 'unknown':
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          icon: <BrainCircuit className="w-4 h-4 mr-1.5" />,
          label: 'Awaiting Data',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
