import { useEffect } from 'react';
import { useForm, Path } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox';

export interface FieldDefinition {
    name: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
}

interface ReferenceDataModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: T) => Promise<void>;
    initialData?: T | null;
    title: string;
    schema: z.ZodType<any>;
    fields: FieldDefinition[];
    isLoading?: boolean;
}

export function ReferenceDataModal<T extends Record<string, any>>({
    isOpen,
    onClose,
    onSave,
    initialData,
    title,
    schema,
    fields,
    isLoading,
}: ReferenceDataModalProps<T>) {
    const form = useForm({
        resolver: zodResolver(schema as any) as any,

        defaultValues: (initialData || {}) as any,
    });


    // Reset form when initialData changes
    useEffect(() => {
        if (isOpen) {
            form.reset((initialData || {}) as any);

        }
    }, [initialData, isOpen, form]);

    const onSubmit = async (data: any) => {
        try {
            await onSave(data);
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
            // Form errors should be handled by the parent or global toast
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
                            {initialData ? 'Edit' : 'Add'} {title}
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-gray-500">
                            {initialData
                                ? `Make changes to the ${title.toLowerCase()} here.`
                                : `Add a new ${title.toLowerCase()} to the system.`}
                        </Dialog.Description>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        {fields.map((field) => (
                            <div key={field.name} className="grid grid-cols-4 items-center gap-4">
                                <label
                                    htmlFor={field.name}
                                    className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <div className="col-span-3">
                                    {field.type === 'select' ? (
                                        <select
                                            id={field.name}
                                            {...form.register(field.name as Path<T>)}

                                            className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
                                        >
                                            <option value="">Select {field.label}</option>
                                            {field.options?.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : field.type === 'textarea' ? (
                                        <textarea
                                            id={field.name}
                                            {...form.register(field.name as Path<T>)}

                                            placeholder={field.placeholder}
                                            className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    ) : field.type === 'checkbox' ? (
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={field.name}
                                                {...form.register(field.name as Path<T>)}

                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <label htmlFor={field.name} className="text-sm text-gray-500">{field.placeholder || 'Yes'}</label>
                                        </div>
                                    ) : (
                                        <input
                                            id={field.name}
                                            type={field.type}
                                            {...form.register(field.name as Path<T>, {

                                                valueAsNumber: field.type === 'number',
                                            })}
                                            placeholder={field.placeholder}
                                            className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm placeholder:text-gray-500 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    )}
                                    {form.formState.errors[field.name]?.message && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {String(form.formState.errors[field.name]?.message)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white hover:bg-gray-100 h-10 px-4 py-2 text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
