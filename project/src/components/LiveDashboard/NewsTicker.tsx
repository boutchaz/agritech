import React, { useMemo } from 'react';
import type { ActivityHeatmapPoint } from '../../services/liveDashboardService';

const ACTIVITY_LABELS: Record<string, string> = {
  irrigation:       'Irrigation',
  harvesting:       'Récolte',
  harvest:          'Récolte',
  planting:         'Plantation',
  fertilization:    'Fertilisation',
  maintenance:      'Maintenance',
  pruning:          'Taille',
  pest_control:     'Traitement phyto',
  inspection:       'Inspection',
  cultivation:      'Culture',
  soil_preparation: 'Préparation sol',
  general:          'Tâche générale',
  farming:          'Agriculture',
  idle:             'Inactif',
};

interface NewsTickerProps {
  data: ActivityHeatmapPoint[];
}

const NewsTicker: React.FC<NewsTickerProps> = ({ data }) => {
  const items = useMemo(() => {
    const activePoints = data.filter(p => !p.isIdle);

    if (activePoints.length === 0) {
      return ['Aucune activité en cours sur les fermes'];
    }

    return activePoints.map(point => {
      const activity = ACTIVITY_LABELS[point.activityType] ?? point.activityType;
      const location = point.parcelName ?? point.farmName ?? '—';
      const farm = point.parcelName && point.farmName ? ` (${point.farmName})` : '';
      const tasks = point.count > 1 ? `${point.count} tâches` : '1 tâche';
      const status = point.status === 'in_progress' ? '● En cours' : '○ En attente';
      return `${activity} — ${location}${farm} — ${tasks} ${status}`;
    });
  }, [data]);

  const text = items.join('     ◆     ');

  return (
    <div className="h-10 flex items-center overflow-hidden border-t border-gray-700 flex-shrink-0 bg-black/85 backdrop-blur-sm">
      <style>{`
        @keyframes live-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .live-ticker-inner {
          animation: live-ticker-scroll 50s linear infinite;
          white-space: nowrap;
          display: inline-block;
        }
        .live-ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Badge EN DIRECT */}
      <div className="flex items-center gap-1.5 px-3 h-full bg-red-600 flex-shrink-0 font-bold text-xs text-white uppercase tracking-wide">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        En direct
      </div>

      {/* Scrolling text */}
      <div className="overflow-hidden flex-1 h-full flex items-center">
        <div className="live-ticker-inner text-white text-sm px-6">
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
