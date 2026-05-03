import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useDeliveries, useCancelDelivery, useCreateDelivery } from '@/hooks/useDeliveries';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useCustomers } from '@/hooks/useCustomers';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { QuickCreateCustomer } from '@/components/Billing/QuickCreateCustomer';
import { searchMoroccanLocation, type SearchResult } from '@/utils/geocoding';
import { Truck, Plus, ChevronsUpDown, Check, Search, MapPin, UserPlus } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

function DeliveriesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const [showForm, setShowForm] = useState(false);

  // Data hooks
  const { data: deliveries = [], isLoading, isError } = useDeliveries();
  const createDelivery = useCreateDelivery();
  const cancelDelivery = useCancelDelivery();
  const { data: farms = [] } = useFarms(organizationId);
  const { data: customers = [] } = useCustomers();

  // Combobox state
  const [farmOpen, setFarmOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);

  // Address search state
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<SearchResult[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');

    return z.object({
      farm_id: z.string().min(1, requiredMessage),
      delivery_date: z.string().min(1, requiredMessage),
      delivery_type: z.enum(['market_sale', 'export', 'processor', 'direct_client', 'wholesale']),
      customer_name: z.string().min(1, requiredMessage),
      customer_contact: z.string().optional(),
      customer_email: z.string().optional(),
      delivery_address: z.string().optional(),
      destination_lat: z.number().optional(),
      destination_lng: z.number().optional(),
      vehicle_info: z.string().optional(),
      notes: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      farm_id: '',
      delivery_date: '',
      delivery_type: 'market_sale',
      customer_name: '',
      customer_contact: '',
      customer_email: '',
      delivery_address: '',
      vehicle_info: '',
      notes: '',
    },
  });

  // Address search with debounce
  const handleAddressSearch = useCallback((query: string) => {
    setAddressQuery(query);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (query.length < 3) {
      setAddressResults([]);
      return;
    }
    addressDebounceRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const results = await searchMoroccanLocation(query);
        setAddressResults(results);
      } finally {
        setAddressSearching(false);
      }
    }, 400);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    };
  }, []);

  const selectAddress = (result: SearchResult) => {
    form.setValue('delivery_address', result.display_name);
    form.setValue('destination_lat', parseFloat(result.lat));
    form.setValue('destination_lng', parseFloat(result.lon));
    setSelectedLocation({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setAddressQuery('');
    setAddressResults([]);
  };

  // When customer selected from dropdown, auto-fill contact info
  const selectCustomer = (customer: typeof customers[number]) => {
    form.setValue('customer_name', customer.name);
    if (customer.phone) form.setValue('customer_contact', customer.phone);
    if (customer.email) form.setValue('customer_email', customer.email);
    if (customer.address) {
      form.setValue('delivery_address', customer.address);
      setSelectedLocation(null);
    }
    setCustomerOpen(false);
  };

  const onSubmit = async (data: SubmitData) => {
    try {
      await createDelivery.mutateAsync({
        farm_id: data.farm_id,
        delivery_date: data.delivery_date,
        delivery_type: data.delivery_type,
        customer_name: data.customer_name,
        customer_contact: data.customer_contact || undefined,
        customer_email: data.customer_email || undefined,
        delivery_address: data.delivery_address || undefined,
        destination_lat: data.destination_lat,
        destination_lng: data.destination_lng,
        vehicle_info: data.vehicle_info || undefined,
        notes: data.notes || undefined,
        items: [],
      });
      toast.success(t('deliveries.createSuccess', 'Delivery created successfully'));
      setShowForm(false);
      setSelectedLocation(null);
      form.reset();
    } catch {
      toast.error(t('deliveries.createError', 'Failed to create delivery'));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_transit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleCancel = async (deliveryId: string) => {
    try {
      await cancelDelivery.mutateAsync({ deliveryId });
      toast.success(t('deliveries.cancelSuccess', 'Delivery cancelled'));
    } catch {
      toast.error(t('deliveries.cancelError', 'Failed to cancel delivery'));
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('deliveries.pageTitle', 'Deliveries')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('deliveries.description', 'Track and manage your product deliveries.')}
                </p>
              </div>
            </div>
            <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('deliveries.addDelivery', 'New Delivery')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-48" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Truck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('deliveries.noDeliveries', 'No deliveries yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('deliveries.noDeliveriesDescription', 'Create your first delivery to start tracking.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('deliveries.addDelivery', 'New Delivery')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveries.map((delivery) => (
              <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {delivery.customer_name || t('deliveries.unnamedDelivery', 'Delivery')}
                    </CardTitle>
                    {delivery.status && (
                      <Badge className={getStatusColor(delivery.status)}>
                        {t(`deliveries.status.${delivery.status}`, delivery.status)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {delivery.delivery_date && (
                      <p><span className="font-medium">{t('deliveries.date', 'Date')}:</span> {format(new Date(delivery.delivery_date), 'dd MMM yyyy')}</p>
                    )}
                    {delivery.delivery_type && (
                      <p><span className="font-medium">{t('deliveries.type', 'Type')}:</span> {t(`deliveries.types.${delivery.delivery_type}`, delivery.delivery_type)}</p>
                    )}
                    {delivery.total_amount !== undefined && delivery.total_amount !== null && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(delivery.total_amount).toLocaleString()} {delivery.currency || t('common.mad', 'MAD')}
                      </p>
                    )}
                  </div>
                  {(delivery.status === 'pending' || delivery.status === 'in_transit') && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleCancel(delivery.id)}>
                        {t('common.cancel', 'Cancel')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('deliveries.addDelivery', 'New Delivery')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Farm Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.farm', 'Farm')}
                </label>
                <Popover open={farmOpen} onOpenChange={setFarmOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={farmOpen}
                      className={cn(
                        'w-full justify-between font-normal',
                        !form.watch('farm_id') && 'text-muted-foreground',
                        form.formState.errors.farm_id && 'border-red-400'
                      )}
                    >
                      {form.watch('farm_id')
                        ? farms.find((f) => f.id === form.watch('farm_id'))?.name ?? t('deliveries.unknownFarm', 'Unknown farm')
                        : t('deliveries.selectFarm', 'Select a farm...')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('deliveries.searchFarm', 'Search farm...')} />
                      <CommandList>
                        <CommandEmpty>{t('deliveries.noFarmsFound', 'No farms found.')}</CommandEmpty>
                        <CommandGroup>
                          {farms.map((farm) => (
                            <CommandItem
                              key={farm.id}
                              value={farm.name}
                              onSelect={() => {
                                form.setValue('farm_id', farm.id, { shouldValidate: true });
                                setFarmOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', form.watch('farm_id') === farm.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex flex-col">
                                <span>{farm.name}</span>
                                {farm.location && (
                                  <span className="text-xs text-muted-foreground">{farm.location}</span>
                                )}
                              </div>
                              {farm.total_area != null && (
                                <span className="ml-auto text-xs text-muted-foreground">{farm.total_area} {t('common.hectares', 'ha')}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.farm_id && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.farm_id.message}</p>
                )}
              </div>

              {/* Date + Type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="delivery-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('deliveries.date', 'Delivery Date')}
                  </label>
                  <Input
                    id="delivery-date"
                    {...form.register('delivery_date')}
                    type="date"
                    className={form.formState.errors.delivery_date ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.delivery_date && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.delivery_date.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="delivery-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('deliveries.type', 'Delivery Type')}
                  </label>
                  <NativeSelect
                    id="delivery-type"
                    {...form.register('delivery_type')}
                    className={form.formState.errors.delivery_type ? 'border-red-400' : ''}
                  >
                    <option value="market_sale">{t('deliveries.types.marketSale', 'Market Sale')}</option>
                    <option value="export">{t('deliveries.types.export', 'Export')}</option>
                    <option value="processor">{t('deliveries.types.processor', 'Processor')}</option>
                    <option value="direct_client">{t('deliveries.types.directClient', 'Direct Client')}</option>
                    <option value="wholesale">{t('deliveries.types.wholesale', 'Wholesale')}</option>
                  </NativeSelect>
                  {form.formState.errors.delivery_type && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.delivery_type.message}</p>
                  )}
                </div>
              </div>

              {/* Customer Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.customer', 'Customer')}
                </label>
                <div className="flex gap-2">
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerOpen}
                        className={cn(
                          'flex-1 justify-between font-normal',
                          !form.watch('customer_name') && 'text-muted-foreground',
                          form.formState.errors.customer_name && 'border-red-400'
                        )}
                      >
                        {form.watch('customer_name') || t('deliveries.selectCustomer', 'Select a customer...')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('deliveries.searchCustomer', 'Search customer...')} />
                        <CommandList>
                          <CommandEmpty>{t('deliveries.noCustomersFound', 'No customers found.')}</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => selectCustomer(customer)}
                              >
                                <Check className={cn('mr-2 h-4 w-4', form.watch('customer_name') === customer.name ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  {customer.city && (
                                    <span className="text-xs text-muted-foreground">{customer.city}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickCustomer(true)}
                    title={t('deliveries.addCustomer', 'Add new customer')}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {form.formState.errors.customer_name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.customer_name.message}</p>
                )}
              </div>

              {/* Delivery Address — geocoding search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.deliveryAddress', 'Delivery Address')}
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={addressQuery}
                        onChange={(e) => handleAddressSearch(e.target.value)}
                        placeholder={t('deliveries.searchAddress', 'Search address in Morocco...')}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  {/* Search results dropdown */}
                  {addressResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {addressResults.map((result) => (
                        <button
                          key={result.place_id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2"
                          onClick={() => selectAddress(result)}
                        >
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="line-clamp-2">{result.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {addressSearching && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
                      {t('common.searching', 'Searching...')}
                    </div>
                  )}
                </div>
                {/* Selected address display */}
                {form.watch('delivery_address') && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{form.watch('delivery_address')}</p>
                      {selectedLocation && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        form.setValue('delivery_address', '');
                        form.setValue('destination_lat', undefined);
                        form.setValue('destination_lng', undefined);
                        setSelectedLocation(null);
                      }}
                    >
                      {t('common.clear', 'Clear')}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="delivery-vehicle-info" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.vehicleInfo', 'Vehicle Info')}
                </label>
                <Input
                  id="delivery-vehicle-info"
                  {...form.register('vehicle_info')}
                  placeholder={t('deliveries.vehicleInfoPlaceholder', 'Enter vehicle details')}
                />
              </div>

              <div>
                <label htmlFor="delivery-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.notes', 'Notes')}
                </label>
                <Textarea
                  id="delivery-notes"
                  {...form.register('notes')}
                  placeholder={t('deliveries.notesPlaceholder', 'Add delivery notes')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedLocation(null);
                    form.reset();
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="green" disabled={createDelivery.isPending}>
                  {createDelivery.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QuickCreateCustomer
        open={showQuickCustomer}
        onOpenChange={setShowQuickCustomer}
        onSuccess={(customerId) => {
          // Find newly created customer and select it
          const newCustomer = customers.find((c) => c.id === customerId);
          if (newCustomer) {
            selectCustomer(newCustomer);
          }
        }}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/customer-deliveries')({
  component: withRouteProtection(DeliveriesPage, 'read', 'Stock'),
});
