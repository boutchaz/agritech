# Forms with React Hook Form + Zod

The AgriTech Platform uses React Hook Form v7+ with Zod validation for type-safe, performant forms with minimal re-renders.

## Overview

**React Hook Form** provides excellent form performance with uncontrolled components and minimal re-renders.

**Zod** provides runtime type validation and TypeScript type inference.

Together, they create a powerful, type-safe form solution.

## Installation

```bash
npm install react-hook-form zod @hookform/resolvers
```

## Basic Form Pattern

### 1. Define Zod Schema

```typescript
// src/schemas/analysisSchemas.ts
import { z } from 'zod'

export const soilAnalysisSchema = z.object({
  analysisDate: z.string().min(1, 'Date is required'),
  laboratory: z.string().optional(),
  ph_level: z.number().min(0).max(14).optional(),
  texture: z.string().optional(),
  organic_matter_percentage: z.number().min(0).max(100).optional(),
  nitrogen_ppm: z.number().min(0).optional(),
  phosphorus_ppm: z.number().min(0).optional(),
  potassium_ppm: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export type SoilAnalysisFormValues = z.infer<typeof soilAnalysisSchema>
```

### 2. Create Form with zodResolver

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { soilAnalysisSchema, type SoilAnalysisFormValues } from '@/schemas/analysisSchemas'

function SoilAnalysisForm() {
  const form = useForm<SoilAnalysisFormValues>({
    resolver: zodResolver(soilAnalysisSchema),
    mode: 'onSubmit', // Validation mode
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      laboratory: '',
      notes: '',
      ph_level: undefined,
      texture: undefined,
      organic_matter_percentage: undefined,
      nitrogen_ppm: undefined,
      phosphorus_ppm: undefined,
      potassium_ppm: undefined,
    },
  })

  const { handleSubmit, formState: { isSubmitting, errors } } = form

  const onSubmit = async (values: SoilAnalysisFormValues) => {
    try {
      await saveSoilAnalysis(values)
      form.reset()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### 3. Use FormField Components

The platform provides a custom `FormField` component wrapper:

```typescript
// src/components/ui/FormField.tsx
type FormFieldProps = {
  label?: React.ReactNode
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  htmlFor,
  helper,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
      ) : null}
    </div>
  )
}
```

**Usage:**

```typescript
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'

function MyForm() {
  const { register, formState: { errors } } = useForm()

  return (
    <FormField
      label="Email"
      htmlFor="email"
      error={errors.email?.message as string}
      required
    >
      <Input
        id="email"
        type="email"
        {...register('email')}
      />
    </FormField>
  )
}
```

## Complete Example: Soil Analysis Form

```typescript
// src/components/Analysis/SoilAnalysisFormRHF.tsx
import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { soilAnalysisSchema, type SoilAnalysisFormValues } from '@/schemas/analysisSchemas';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

// TextField component using useFormContext
const TextField: React.FC<{
  name: keyof SoilAnalysisFormValues;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ name, label, type = 'text', step, min, max, required, placeholder }) => {
  const { register, formState: { errors } } = useFormContext<SoilAnalysisFormValues>();

  return (
    <FormField label={label} htmlFor={name} required={required}>
      <Input
        id={name}
        type={type}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        {...register(name, { valueAsNumber: type === 'number' })}
        aria-invalid={errors[name] ? 'true' : 'false'}
      />
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">
          {errors[name]?.message as string}
        </p>
      )}
    </FormField>
  );
};

const SoilAnalysisForm: React.FC = () => {
  const methods = useForm<SoilAnalysisFormValues>({
    resolver: zodResolver(soilAnalysisSchema),
    mode: 'onSubmit',
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      laboratory: '',
      notes: '',
    },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = async (values: SoilAnalysisFormValues) => {
    try {
      await saveSoilAnalysis(values);
      methods.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              name="analysisDate"
              label="Date d'analyse"
              type="date"
              required
            />
            <TextField
              name="laboratory"
              label="Laboratoire (optionnel)"
              type="text"
              placeholder="Nom du laboratoire"
            />
          </div>

          {/* Physical Properties */}
          <div>
            <h4 className="font-medium mb-4">Propriétés Physiques</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="ph_level"
                label="pH"
                type="number"
                step="0.1"
                min="0"
                max="14"
              />
              <TextField
                name="organic_matter_percentage"
                label="Matière organique (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Macronutrients */}
          <div>
            <h4 className="font-medium mb-4">Macronutriments (ppm)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                name="nitrogen_ppm"
                label="Azote (N)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="phosphorus_ppm"
                label="Phosphore (P)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="potassium_ppm"
                label="Potassium (K)"
                type="number"
                step="0.1"
                min="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border rounded-md"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center space-x-2"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SoilAnalysisForm;
```

## Validation Modes

React Hook Form supports different validation strategies:

```typescript
const form = useForm({
  mode: 'onSubmit',    // Validate on submit (default)
  // mode: 'onChange',  // Validate on every change
  // mode: 'onBlur',    // Validate on blur
  // mode: 'onTouched', // Validate after first blur, then onChange
  // mode: 'all',       // Validate on both blur and change
})
```

**Recommendation:** Use `onSubmit` for most forms to minimize re-renders.

## Nested Forms with FormProvider

For complex forms with deeply nested components, use `FormProvider` and `useFormContext`:

```typescript
import { FormProvider, useFormContext } from 'react-hook-form'

function ParentForm() {
  const methods = useForm()

  return (
    <FormProvider {...methods}>
      <form>
        <NestedComponent />
      </form>
    </FormProvider>
  )
}

function NestedComponent() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <input {...register('fieldName')} />
  )
}
```

## Dynamic Lists with useFieldArray

Manage dynamic form fields (add/remove items):

```typescript
import { useForm, useFieldArray } from 'react-hook-form'

interface FormValues {
  workers: {
    name: string
    role: string
    salary: number
  }[]
}

function WorkersForm() {
  const { control, register } = useForm<FormValues>({
    defaultValues: {
      workers: [{ name: '', role: '', salary: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'workers'
  })

  return (
    <form>
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2">
          <input
            {...register(`workers.${index}.name`)}
            placeholder="Name"
          />
          <input
            {...register(`workers.${index}.role`)}
            placeholder="Role"
          />
          <input
            type="number"
            {...register(`workers.${index}.salary`, { valueAsNumber: true })}
            placeholder="Salary"
          />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ name: '', role: '', salary: 0 })}
      >
        Add Worker
      </button>
    </form>
  )
}
```

## Integration with TanStack Query

Combine forms with mutations for optimistic updates:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

function CreateParcelForm() {
  const queryClient = useQueryClient()
  const form = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: ParcelFormValues) => {
      return supabase.from('parcels').insert(data).select().single()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      form.reset()
    },
  })

  const onSubmit = (values: ParcelFormValues) => {
    mutation.mutate(values)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Parcel'}
      </button>
      {mutation.isError && (
        <p className="text-red-600">Error: {mutation.error.message}</p>
      )}
    </form>
  )
}
```

## Common Zod Validation Patterns

### String Validations

```typescript
z.string()
  .min(1, 'Required')
  .max(100, 'Too long')
  .email('Invalid email')
  .url('Invalid URL')
  .regex(/^[A-Z]/, 'Must start with uppercase')
  .trim()
  .toLowerCase()
```

### Number Validations

```typescript
z.number()
  .min(0, 'Must be positive')
  .max(100, 'Max is 100')
  .int('Must be integer')
  .positive('Must be positive')
  .nonnegative('Cannot be negative')
```

### Optional Fields

```typescript
z.string().optional()
z.number().nullable()
z.string().default('default value')
```

### Enum Validations

```typescript
z.enum(['sand', 'loam', 'clay'])
```

### Date Validations

```typescript
z.string().refine((date) => !isNaN(Date.parse(date)), {
  message: 'Invalid date',
})

// Or use date type
z.date().min(new Date('2020-01-01'))
```

### Custom Validations

```typescript
z.string().refine(
  (val) => val.length >= 8,
  { message: 'Password must be at least 8 characters' }
)

// Or with superRefine for multiple errors
z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 8,
      type: 'string',
      inclusive: true,
      message: 'Too short',
    })
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must contain uppercase letter',
    })
  }
})
```

### Dependent Field Validation

```typescript
const formSchema = z.object({
  hasIrrigation: z.boolean(),
  irrigationType: z.string().optional(),
}).refine(
  (data) => !data.hasIrrigation || data.irrigationType,
  {
    message: 'Irrigation type is required when irrigation is enabled',
    path: ['irrigationType'],
  }
)
```

## Error Handling

### Field-level Errors

```typescript
const { formState: { errors } } = useForm()

{errors.email && <p>{errors.email.message}</p>}
```

### Form-level Errors

```typescript
const { setError } = useForm()

const onSubmit = async (values) => {
  try {
    await saveData(values)
  } catch (error) {
    setError('root', {
      type: 'manual',
      message: 'Something went wrong. Please try again.',
    })
  }
}

{errors.root && <p>{errors.root.message}</p>}
```

### Server-side Validation Errors

```typescript
const onSubmit = async (values) => {
  try {
    const response = await api.createParcel(values)
  } catch (error) {
    if (error.response?.data?.errors) {
      // Map server errors to form fields
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        setError(field as any, { message: message as string })
      })
    }
  }
}
```

## Form State

Access various form states:

```typescript
const {
  formState: {
    errors,        // Field errors
    isSubmitting,  // Form is submitting
    isSubmitted,   // Form has been submitted
    isDirty,       // Form has been modified
    isValid,       // Form is valid (all fields pass validation)
    touchedFields, // Fields that have been touched
    dirtyFields,   // Fields that have been modified
  }
} = useForm()
```

## Reset Form

```typescript
const { reset } = useForm()

// Reset to default values
reset()

// Reset with new values
reset({
  name: 'New Name',
  email: 'new@email.com',
})

// Reset specific fields
reset({ name: 'New Name' }, { keepValues: true })
```

## Watch Field Values

```typescript
const { watch } = useForm()

// Watch single field
const email = watch('email')

// Watch multiple fields
const { name, email } = watch(['name', 'email'])

// Watch all fields
const formValues = watch()

// Watch with callback
useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    console.log('Field changed:', name, value)
  })
  return () => subscription.unsubscribe()
}, [watch])
```

## Controlled Components

For components that need controlled state (e.g., custom selects):

```typescript
import { Controller } from 'react-hook-form'

function MyForm() {
  const { control } = useForm()

  return (
    <Controller
      name="cropType"
      control={control}
      render={({ field }) => (
        <CustomSelect
          value={field.value}
          onChange={field.onChange}
          options={cropOptions}
        />
      )}
    />
  )
}
```

## Best Practices

1. **Always use Zod schemas**: Ensure runtime and compile-time type safety
2. **Use `valueAsNumber`**: For number inputs to avoid string conversion issues
3. **Disable submit button**: During submission to prevent double-submits
4. **Reset on success**: Clear form after successful submission
5. **Use `FormProvider`**: For deeply nested forms
6. **Validation mode**: Use `onSubmit` for performance, `onChange` for real-time feedback
7. **Custom error messages**: Provide clear, actionable error messages
8. **Accessible forms**: Use proper labels, ARIA attributes, and error associations

## Performance Tips

1. **Minimize re-renders**: Use `mode: 'onSubmit'`
2. **Uncontrolled components**: Let React Hook Form manage state
3. **Use `useFormContext`**: Avoid prop drilling
4. **Debounce async validation**: For expensive validations
5. **Lazy validation**: Only validate fields that have been touched

## Troubleshooting

### Form not submitting
- Check for validation errors
- Ensure `handleSubmit` is called correctly
- Verify Zod schema is correct

### Type errors
- Ensure Zod schema matches TypeScript types
- Use `z.infer<typeof schema>` for type inference
- Check that form values match schema

### Re-render issues
- Use `mode: 'onSubmit'` to reduce re-renders
- Avoid unnecessary `watch()` calls
- Use `useFormContext` instead of passing props

## Summary

React Hook Form + Zod provides a powerful, type-safe form solution for the AgriTech Platform. By following these patterns and best practices, you can build performant, accessible forms with excellent developer experience and user experience.
