import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Tables, InsertDto, UpdateDto } from '../types/database.types';

type DocumentTemplate = Tables<'document_templates'>;
type DocumentTemplateInsert = InsertDto<'document_templates'>;
type DocumentTemplateUpdate = UpdateDto<'document_templates'>;

export type DocumentType = 'invoice' | 'quote' | 'sales_order' | 'purchase_order' | 'report' | 'general';

/**
 * Hook to fetch all document templates for current organization
 */
export function useDocumentTemplates(documentType?: DocumentType) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-templates', currentOrganization?.id, documentType],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single document template by ID
 */
export function useDocumentTemplate(templateId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-template', templateId],
    queryFn: async () => {
      if (!templateId) {
        throw new Error('No template ID provided');
      }

      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', currentOrganization!.id)
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    enabled: !!templateId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch the default template for a document type
 */
export function useDefaultDocumentTemplate(documentType: DocumentType) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-template', 'default', documentType, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('document_type', documentType)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data as DocumentTemplate | null;
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new document template
 */
export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (template: Omit<DocumentTemplateInsert, 'organization_id' | 'created_by'>) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          ...template,
          organization_id: currentOrganization.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    onSuccess: (data) => {
      // Invalidate all templates queries
      queryClient.invalidateQueries({ queryKey: ['document-templates', currentOrganization?.id] });

      // If this is set as default, invalidate the default query
      if (data.is_default) {
        queryClient.invalidateQueries({
          queryKey: ['document-template', 'default', data.document_type]
        });
      }
    },
  });
}

/**
 * Hook to update a document template
 */
export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DocumentTemplateUpdate }) => {
      const { data, error } = await supabase
        .from('document_templates')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    onSuccess: (data) => {
      // Invalidate all templates queries
      queryClient.invalidateQueries({ queryKey: ['document-templates', currentOrganization?.id] });

      // Invalidate the specific template
      queryClient.invalidateQueries({ queryKey: ['document-template', data.id] });

      // If this is set as default, invalidate the default query
      if (data.is_default) {
        queryClient.invalidateQueries({
          queryKey: ['document-template', 'default', data.document_type]
        });
      }
    },
  });
}

/**
 * Hook to delete a document template
 */
export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all templates queries
      queryClient.invalidateQueries({ queryKey: ['document-templates', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to set a template as default for its document type
 */
export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error} = await supabase
        .from('document_templates')
        .update({ is_default: true })
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    onSuccess: (data) => {
      // Invalidate all templates queries
      queryClient.invalidateQueries({ queryKey: ['document-templates', currentOrganization?.id] });

      // Invalidate the default query for this document type
      queryClient.invalidateQueries({
        queryKey: ['document-template', 'default', data.document_type]
        });
    },
  });
}
