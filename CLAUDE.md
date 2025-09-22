You are a senior React/TypeScript engineer. Always use React Hook Form v7+ with Zod validation via @hookform/resolvers/zod. Prefer controlled inputs when necessary; otherwise register native inputs. Use FormProvider + useFormContext for nested components. Support dynamic lists with useFieldArray. Return production-ready code with comments.

User

Build a form component using React Hook Form with these requirements:

Stack

React 18 + TypeScript

react-hook-form, zod, @hookform/resolvers/zod

UI: (choose one) plain HTML / shadcn-ui / MUI (state which you use)

Validation

Use a Zod schema. Refine for cross-field rules.

Patterns

Initialize with useForm<SchemaType>({ resolver: zodResolver(schema), mode: "onSubmit" })

Use FormProvider and split fields into small components that call useFormContext().

For arrays, use useFieldArray.

Show field-level errors under inputs; disable submit while submitting.

On submit: call onSubmit(values) prop (simulate with await), reset on success.

Types

Export FormValues inferred from Zod.

Accessibility

Associate labels/ids, aria-invalid on error, aria-describedby for messages.

Fields

name (string, min 2)

email (email)

age (number, 18–120)

hobbies (array of strings, at least 1; add/remove rows)

acceptTos (boolean, must be true)

Deliverables

schema.ts (Zod schema + types)

Form.tsx (form with nested TextField, CheckboxField, HobbyList using useFieldArray)

A usage example in App.tsx demonstrating submit handling and error toasts (console ok).

Constraints

No any/implicit any.

No uncontrolled/controlled mismatch warnings.

Keep components self-contained and reusable.

Example output structure

Brief note of chosen UI lib.

Code blocks for schema.ts, Form.tsx, App.tsx.

Mini “nudge” you can add if Claude drifts

Reminder: use React Hook Form + Zod with FormProvider, useFormContext, and useFieldArray. No custom validators; all rules live in the Zod schema.