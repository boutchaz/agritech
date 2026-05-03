import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, type ButtonProps } from '@/components/ui/button';
import ShareDialog, { type ShareDialogProps } from './ShareDialog';

type ShareButtonProps = Omit<ShareDialogProps, 'open' | 'onOpenChange'> & {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  label?: string;
};

export function ShareButton({
  variant = 'outline',
  size,
  className,
  label,
  ...dialogProps
}: ShareButtonProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {label ?? t('share.button', 'Share')}
      </Button>
      <ShareDialog open={open} onOpenChange={setOpen} {...dialogProps} />
    </>
  );
}

export default ShareButton;
