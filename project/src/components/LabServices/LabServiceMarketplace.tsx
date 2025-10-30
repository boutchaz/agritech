import { useState } from 'react';
import { FlaskConical, MapPin, Clock, DollarSign, FileText, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ServiceCategory } from '@/hooks/useLabServices';
import { OrderLabServiceDialog } from './OrderLabServiceDialog';

interface LabServiceMarketplaceProps {
  providers: any[];
  serviceTypes: any[];
  isLoading: boolean;
  selectedCategory?: ServiceCategory;
  onCategoryChange: (category: ServiceCategory | undefined) => void;
}

const categories: { value: ServiceCategory; label: string; description: string }[] = [
  { value: 'soil', label: 'Analyses de Sol', description: 'Analyses physico-chimiques et microbiologiques' },
  { value: 'leaf', label: 'Analyses Foliaires', description: 'Diagnostic nutritionnel des plantes' },
  { value: 'water', label: 'Analyses d\'Eau', description: 'Qualité de l\'eau d\'irrigation' },
  { value: 'tissue', label: 'Analyses Tissulaires', description: 'Analyses de tissus végétaux' },
  { value: 'other', label: 'Autres', description: 'Autres types d\'analyses' },
];

export function LabServiceMarketplace({
  providers,
  serviceTypes,
  isLoading,
  selectedCategory,
  onCategoryChange,
}: LabServiceMarketplaceProps) {
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const handleOrderService = (service: any) => {
    setSelectedService(service);
    setOrderDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Catégories d'Analyses</CardTitle>
          <CardDescription>Sélectionnez le type d'analyse dont vous avez besoin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              onClick={() => onCategoryChange(undefined)}
              size="sm"
            >
              Tous
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                onClick={() => onCategoryChange(cat.value)}
                size="sm"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Providers */}
      <div className="space-y-6">
        {providers.map((provider) => {
          const providerServices = serviceTypes.filter((st) => st.provider_id === provider.id);

          if (providerServices.length === 0) return null;

          return (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {provider.logo_url && (
                      <img
                        src={provider.logo_url}
                        alt={provider.name}
                        className="h-16 w-16 object-contain rounded"
                      />
                    )}
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        {provider.accreditations && provider.accreditations.length > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            Accrédité
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                      {provider.turnaround_days && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <Clock className="h-4 w-4" />
                          Délai moyen: {provider.turnaround_days} jours
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providerServices.map((service) => (
                    <Card
                      key={service.id}
                      className="hover:border-green-500 dark:hover:border-green-600 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <Badge
                            variant={
                              service.category === 'soil'
                                ? 'default'
                                : service.category === 'leaf'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {categories.find((c) => c.value === service.category)?.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {service.description}
                        </p>

                        {/* Parameters */}
                        {service.parameters_tested && service.parameters_tested.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Paramètres analysés:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {service.parameters_tested.slice(0, 3).map((param: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {param}
                                </Badge>
                              ))}
                              {service.parameters_tested.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{service.parameters_tested.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Price and turnaround */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                            <DollarSign className="h-4 w-4" />
                            {service.price?.toFixed(2)} {service.currency}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {service.turnaround_days || provider.turnaround_days}j
                          </div>
                        </div>

                        {/* Sample requirements */}
                        {service.sample_requirements && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                              Instructions de prélèvement
                            </summary>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                              {service.sample_requirements}
                            </p>
                          </details>
                        )}

                        <Button
                          onClick={() => handleOrderService(service)}
                          className="w-full gap-2"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                          Commander
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {serviceTypes.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun service disponible
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedCategory
                ? 'Aucun service trouvé pour cette catégorie'
                : 'Aucun service de laboratoire disponible pour le moment'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Dialog */}
      <OrderLabServiceDialog
        isOpen={orderDialogOpen}
        onClose={() => {
          setOrderDialogOpen(false);
          setSelectedService(null);
        }}
        service={selectedService}
      />
    </div>
  );
}
