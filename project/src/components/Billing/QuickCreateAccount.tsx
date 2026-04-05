
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateAccount } from '@/hooks/useAccounts';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateAccountProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (accountId: string) => void;
  accountType?: 'Revenue' | 'Expense';
}

const accountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  account_code: z.string().optional(),
  account_type: z.enum(['Revenue', 'Expense']),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

export const QuickCreateAccount = ({
  open,
  onOpenChange,
  onSuccess,
  accountType = 'Revenue',
}: QuickCreateAccountProps) => {
  const createAccount = useCreateAccount();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_type: accountType,
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    try {
      const result = await createAccount.mutateAsync({
        account_name: data.account_name,
        account_code: data.account_code,
        account_type: data.account_type,
        description: data.description,
        is_group: false,
        is_active: true,
      });

      toast.success('Account created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('Failed to create account');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Account</DialogTitle>
          <DialogDescription>
            Add a new {accountType.toLowerCase()} account. You can edit details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              {...register('account_name')}
              placeholder={`Enter ${accountType.toLowerCase()} account name`}
              autoFocus
            />
            {errors.account_name && (
              <p className="text-sm text-red-600 mt-1">{errors.account_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="account_code">Account Code</Label>
            <Input
              id="account_code"
              {...register('account_code')}
              placeholder="e.g., 4000"
            />
          </div>

          <div>
            <Label htmlFor="account_type">Account Type *</Label>
            <NativeSelect id="account_type" {...register('account_type')}>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
