---
description: Guide for adding a new feature to the AgriTech platform
---

# Add Feature Workflow

Follow this checklist when adding a new feature to the platform.

## Planning Phase

1. **Identify Requirements**
   - What problem does this solve?
   - Which users/roles need access?
   - What data is needed (new tables, columns)?
   - Integration points (satellite, accounting, etc.)

2. **Check Subscription Limits**
   - Does this feature require specific subscription tier?
   - Update `src/lib/casl/defineAbilityFor.ts` if needed
   - Add feature flag to subscription plans

## Database Changes

1. **Create Migration**
   ```bash
   # Create new migration file
   # Location: project/supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql
   ```

2. **Add Tables/Columns**
   - Include RLS policies
   - Add indexes for performance
   - Create any necessary functions/triggers

3. **Test Locally**
   ```bash
   npm run db:reset
   npm run db:generate-types
   ```

4. **Deploy to Remote**
   ```bash
   npm run schema:diff    # Review changes
   npm run schema:backup  # Backup current
   npm run schema:push    # Push changes
   ```

## Backend Implementation

1. **Create Custom Hooks**
   - Location: `src/hooks/useFeatureName.ts`
   - Use TanStack Query pattern
   - Set appropriate `staleTime`

2. **Example Hook**
   ```typescript
   export const useFeatureName = (orgId: string) => {
     return useQuery({
       queryKey: ['feature-name', orgId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('table_name')
           .select('*')
           .eq('organization_id', orgId);

         if (error) throw error;
         return data;
       },
       staleTime: 5 * 60 * 1000, // 5 minutes
       enabled: !!orgId,
     });
   };
   ```

3. **Add Mutations**
   ```typescript
   export const useCreateFeature = () => {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: async (data) => {
         const { data: result, error } = await supabase
           .from('table_name')
           .insert(data)
           .select()
           .single();

         if (error) throw error;
         return result;
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['feature-name'] });
       },
     });
   };
   ```

## Frontend Implementation

1. **Create Route**
   - Location: `src/routes/_authenticated.feature-name.tsx`
   - Use `createFileRoute('/feature-name')`
   - Add route protection if needed

2. **Create Components**
   - Location: `src/components/FeatureName/`
   - Follow existing patterns (forms, lists, details)
   - Use UI components from `src/components/ui/`

3. **Add Forms (if needed)**
   - Zod schema in `src/schemas/featureSchema.ts`
   - Use React Hook Form with `zodResolver`
   - FormField components for inputs

4. **Example Form**
   ```typescript
   const formSchema = z.object({
     name: z.string().min(1, 'Required'),
     // ... other fields
   });

   const form = useForm<z.infer<typeof formSchema>>({
     resolver: zodResolver(formSchema),
     defaultValues: { name: '' }
   });

   const mutation = useCreateFeature();

   const onSubmit = (data) => {
     mutation.mutate(data);
   };
   ```

## Navigation & Permissions

1. **Add to Sidebar**
   - Location: `src/components/Sidebar.tsx`
   - Wrap in `<Can>` if permission-gated

2. **Update CASL Permissions**
   - Location: `src/lib/casl/defineAbilityFor.ts`
   - Define which roles can access feature
   - Add subscription checks if needed

3. **Example Permission**
   ```typescript
   if (hasRole(['organization_admin', 'farm_manager'])) {
     can('read', 'FeatureName');

     if (subscription?.plan === 'pro') {
       can(['create', 'update', 'delete'], 'FeatureName');
     }
   }
   ```

## Internationalization

1. **Add Translations**
   - Location: `src/locales/{en,fr,ar}/translation.json`
   - Add keys for feature UI text

2. **Example**
   ```json
   {
     "featureName": {
       "title": "Feature Name",
       "create": "Create New",
       "edit": "Edit",
       "delete": "Delete",
       "fields": {
         "name": "Name",
         "description": "Description"
       }
     }
   }
   ```

## Testing

1. **Manual Testing**
   - Test with different roles
   - Test subscription limits
   - Test error cases
   - Test on different screen sizes

2. **Unit Tests (if complex logic)**
   - Location: `src/components/FeatureName/__tests__/`
   - Use Vitest
   - Test calculations, transformations

3. **E2E Tests (if critical flow)**
   - Location: `e2e/feature-name.spec.ts`
   - Use Playwright
   - Test happy path + error cases

## Documentation

1. **Update CLAUDE.md** (if major feature)
   - Add to Key Features section
   - Document any new patterns

2. **Add to .claude/** (if complex)
   - Create `.claude/feature-name.md` with detailed guide

## Checklist

- [ ] Database migration created and tested
- [ ] Types generated (`npm run db:generate-types-remote`)
- [ ] Custom hooks created with proper caching
- [ ] Route created and protected
- [ ] Components created with proper styling
- [ ] Forms validated with Zod
- [ ] Added to sidebar navigation
- [ ] CASL permissions updated
- [ ] Translations added (en, fr, ar)
- [ ] Tested with different roles
- [ ] Tested subscription limits
- [ ] Code linted (`npm run lint:fix`)
- [ ] Types checked (`npm run type-check`)
- [ ] Committed to git

## Common Pitfalls

- Forgetting to set `staleTime` on queries
- Not invalidating queries after mutations
- Missing RLS policies on new tables
- Not testing with different subscription tiers
- Forgetting translations for all languages
- Not checking types after DB changes
