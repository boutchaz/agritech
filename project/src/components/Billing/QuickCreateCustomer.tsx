
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateCustomerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customerId: string) => void;
}

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  contact_person: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const QuickCreateCustomer = ({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateCustomerProps) => {
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const result = await createCustomer.mutateAsync({
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        contact_person: data.contact_person || undefined,
        customer_type: 'individual',
      });

      toast.success('Customer created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error('Failed to create customer');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Quick Create Customer"
      description="Add a new customer with basic information. You can edit details later."
      size="md"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="quick-create-customer-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Customer
          </Button>
        </>
      )}
    >
      <form id="quick-create-customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter customer name"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              {...register('contact_person')}
              placeholder="Enter contact person"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="customer@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+1 234 567 8900"
            />
          </div>

      </form>
    </ResponsiveDialog>
  );
};
