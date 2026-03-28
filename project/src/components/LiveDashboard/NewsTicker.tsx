import React, { useMemo } from 'react';
import type { ActivityHeatmapPoint, FarmActivity } from '../../services/liveDashboardService';

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

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

interface NewsTickerProps {
  data: ActivityHeatmapPoint[];
  recentActivities?: FarmActivity[];
}

const NewsTicker: React.FC<NewsTickerProps> = ({ data, recentActivities = [] }) => {
  const items = useMemo(() => {
    const messages: string[] = [];

    // 1. Active heatmap points (in_progress or pending)
    const activePoints = data.filter(p => !p.isIdle);
    for (const point of activePoints) {
      const activity = ACTIVITY_LABELS[point.activityType] ?? point.activityType;
      const location = point.parcelName ?? point.farmName ?? '—';
      const farm = point.parcelName && point.farmName ? ` · ${point.farmName}` : '';
      const taskWord = point.count > 1 ? `${point.count} tâches de` : '1 tâche de';
      const statusDot = point.status === 'in_progress' ? '● En cours' : '○ En attente';
      messages.push(`${statusDot} — ${activity} — ${taskWord} ${activity.toLowerCase()} sur ${location}${farm}`);
    }

    // 2. Recently completed activities (within last 30 minutes)
    const now = Date.now();
    const recentDone = recentActivities.filter(a => {
      const age = now - new Date(a.timestamp).getTime();
      return age >= 0 && age <= THIRTY_MINUTES_MS;
    });

    for (const activity of recentDone) {
      const actLabel = ACTIVITY_LABELS[activity.activityType] ?? activity.activityType;
      const who = activity.userName ? ` par ${activity.userName}` : '';
      const elapsed = Math.round((now - new Date(activity.timestamp).getTime()) / 60000);
      const timeStr = elapsed <= 1 ? 'à l\'instant' : `il y a ${elapsed} min`;
      messages.push(`✓ Terminé ${timeStr} — ${actLabel} sur ${activity.farmName}${who} — ${activity.description}`);
    }

    if (messages.length === 0) {
      messages.push('Aucune activité en cours sur les fermes');
    }

    return messages;
  }, [data, recentActivities]);

  const text = items.join('          ◆          ');

  return (
    <div className="h-12 flex items-center overflow-hidden border-t border-gray-700 flex-shrink-0 bg-black/85 backdrop-blur-sm">
      <style>{`
        @keyframes live-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .live-ticker-inner {
          animation: live-ticker-scroll 60s linear infinite;
          white-space: nowrap;
          display: inline-block;
        }
        .live-ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Badge EN DIRECT */}
      <div className="flex items-center gap-2 px-4 h-full bg-red-600 flex-shrink-0 font-bold text-sm text-white uppercase tracking-wider">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        En direct
      </div>

      {/* Scrolling text */}
      <div className="overflow-hidden flex-1 h-full flex items-center">
        <div className="live-ticker-inner text-white text-base font-medium px-6 tracking-wide">
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
