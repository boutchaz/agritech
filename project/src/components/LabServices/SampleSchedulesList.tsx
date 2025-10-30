import { Calendar, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SampleSchedulesListProps {
  schedules: any[];
  isLoading: boolean;
}

export function SampleSchedulesList({ schedules, isLoading }: SampleSchedulesListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Prélèvements Programmés
        </h3>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Programme
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun prélèvement programmé</p>
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Créer un programme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const nextDate = new Date(schedule.next_collection_date);
            const today = new Date();
            const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysUntil >= 0 && daysUntil <= 3;

            return (
              <Card key={schedule.id} className={isUrgent ? 'border-orange-500 dark:border-orange-600' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {schedule.service_type?.name}
                        </h4>
                        {isUrgent && (
                          <Badge variant="default" className="bg-orange-500">
                            Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <p>Ferme: {schedule.farm?.name}</p>
                        <p>Parcelle: {schedule.parcel?.name}</p>
                        <p>Fréquence: {schedule.frequency}</p>
                        <p>Prochain prélèvement: {nextDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
