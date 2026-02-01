import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  documentTemplatesApi,
  DocumentTemplate,
  DocumentType,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
} from '@/lib/api/document-templates';

export type { DocumentTemplate, DocumentType };

export function useDocumentTemplates(documentType?: DocumentType) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-templates', currentOrganization?.id, documentType],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      try {
        return await documentTemplatesApi.getAll(documentType, currentOrganization.id);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) {
          console.warn('Document templates endpoint not accessible - returning empty data');
          return [];
        }
        throw error; // Re-throw for other errors
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useDocumentTemplate(templateId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-template', templateId],
    queryFn: async () => {
      if (!templateId) {
        throw new Error('No template ID provided');
      }
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.getOne(templateId, currentOrganization.id);
    },
    enabled: !!templateId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefaultDocumentTemplate(documentType: DocumentType) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['document-template', 'default', documentType, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      try {
        return await documentTemplatesApi.getDefault(documentType, currentOrganization.id);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) {
          console.warn('Default document template not accessible - returning null');
          return null;
        }
        throw error; // Re-throw for other errors
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (template: CreateDocumentTemplateDto) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.create(template, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });

      if (data.is_default) {
        queryClient.invalidateQueries({
          queryKey: ['document-template', 'default', data.document_type],
        });
      }
    },
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateDocumentTemplateDto }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.update(id, updates, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      queryClient.invalidateQueries({ queryKey: ['document-template', data.id] });

      if (data.is_default) {
        queryClient.invalidateQueries({
          queryKey: ['document-template', 'default', data.document_type],
        });
      }
    },
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.setDefault(id, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['document-template', 'default', data.document_type],
      });
    },
  });
}

export function useDuplicateDocumentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return documentTemplatesApi.duplicate(id, newName, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
    },
  });
}
