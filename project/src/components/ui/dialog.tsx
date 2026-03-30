import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * DialogContent — structure:
 *   outer container  : fixed, flex-col, max-h-[92vh], overflow-hidden
 *   ├─ close button  : absolute top-right, always visible (outside scroll)
 *   └─ scroll body   : flex-1, overflow-y-auto, padding, flex-col gap-4
 *       ├─ DialogHeader  : sticky top-0 (title always visible when scrolling)
 *       ├─ [content]     : scrolls
 *       └─ DialogFooter  : sticky bottom-0 (buttons always visible)
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // outer shell — clips overflow, flex column
        "fixed z-50 flex flex-col w-full overflow-hidden",
        "bg-white dark:bg-gray-800 shadow-lg duration-200",
        // mobile: drawer from bottom
        "left-0 right-0 bottom-0 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 max-h-[92vh]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // desktop: centered modal
        "sm:bottom-auto sm:right-auto sm:left-[50%] sm:top-[50%]",
        "sm:translate-x-[-50%] sm:translate-y-[-50%]",
        "sm:max-w-lg sm:rounded-lg sm:border sm:border-gray-200 sm:dark:border-gray-700",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
        "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
        className,
      )}
      {...props}
    >
      {/* Close button — outside scroll area so it's always accessible */}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>

      {/* Scrollable body — all dialog children go here */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-4 p-6 pr-10">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // sticky so the title stays visible when content is long
      "sticky top-0 z-10 flex flex-col space-y-1.5 text-center sm:text-left",
      "-mx-6 px-6 -mt-6 pt-6 pb-4",
      "bg-white dark:bg-gray-800",
      // subtle separator when content scrolls behind
      "border-b border-transparent [.scrolled_&]:border-gray-100 dark:[.scrolled_&]:border-gray-700",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // sticky so Cancel/Save buttons stay visible when content is long
      "sticky bottom-0 z-10",
      "-mx-6 px-6 -mb-6 pb-6 pt-4",
      "bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700",
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
