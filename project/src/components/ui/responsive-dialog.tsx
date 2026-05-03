import { ReactNode, ComponentPropsWithoutRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from './drawer';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type ResponsiveDialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

// Sizes ramp by breakpoint so tablets (sm/md) get a sensible width before
// jumping to the full requested size on lg+. Caps at calc(100vw-2rem) to
// guarantee gutters even at the widest breakpoint.
const sizeClasses: Record<ResponsiveDialogSize, string> = {
  sm: 'w-[calc(100vw-2rem)] sm:max-w-[425px]',
  md: 'w-[calc(100vw-2rem)] sm:max-w-[500px]',
  lg: 'w-[calc(100vw-2rem)] sm:max-w-[600px]',
  xl: 'w-[calc(100vw-2rem)] sm:max-w-[640px] lg:max-w-[700px]',
  '2xl': 'w-[calc(100vw-2rem)] sm:max-w-[640px] lg:max-w-2xl',
  '3xl': 'w-[calc(100vw-2rem)] sm:max-w-[640px] md:max-w-2xl lg:max-w-3xl',
  '4xl': 'w-[calc(100vw-2rem)] sm:max-w-[640px] md:max-w-2xl lg:max-w-4xl',
  full: 'w-[calc(100vw-2rem)] sm:max-w-[95vw]',
};

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  size?: ResponsiveDialogSize;
}

type ResponsiveDialogContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

type ResponsiveDrawerContentProps = ComponentPropsWithoutRef<typeof DrawerContent>;

export { type ResponsiveDialogProps, type ResponsiveDialogContentProps, type ResponsiveDrawerContentProps };

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  size = 'lg',
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="bottom" className={cn('max-h-[85vh]', contentClassName)}>
          <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
          {(title || description) && (
            <DrawerHeader className="shrink-0">
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4">{children}</div>
          {footer && <DrawerFooter className="shrink-0">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], contentClassName, className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
