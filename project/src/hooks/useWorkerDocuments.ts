import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  workerDocumentsApi,
  type CreateWorkerDocumentInput,
  type WorkerDocumentFilters,
} from '../lib/api/worker-documents';
import { useTranslation } from 'react-i18next';

export const useWorkerDocuments = (
  orgId: string | null,
  filters: WorkerDocumentFilters = {},
) => {
  return useQuery({
    queryKey: ['worker-documents', orgId, filters],
    queryFn: () => workerDocumentsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
};

export const useWorkerDocument = (orgId: string | null, docId: string | null) => {
  return useQuery({
    queryKey: ['worker-document', orgId, docId],
    queryFn: () => workerDocumentsApi.getOne(orgId!, docId!),
    enabled: !!orgId && !!docId,
  });
};

export const useCreateWorkerDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      orgId,
      data,
    }: {
      orgId: string;
      data: CreateWorkerDocumentInput;
    }) => workerDocumentsApi.create(orgId, data),
    onSuccess: (_, { orgId, data }) => {
      queryClient.invalidateQueries({
        queryKey: ['worker-documents', orgId, { worker_id: data.worker_id }],
      });
      toast.success(
        t('workerDocuments.created', 'Document uploaded successfully'),
      );
    },
    onError: () => {
      toast.error(
        t('workerDocuments.createError', 'Failed to upload document'),
      );
    },
  });
};

export const useUpdateWorkerDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: Partial<CreateWorkerDocumentInput>;
    }) => workerDocumentsApi.update(orgId, id, data),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', orgId] });
      toast.success(
        t('workerDocuments.updated', 'Document updated successfully'),
      );
    },
    onError: () => {
      toast.error(
        t('workerDocuments.updateError', 'Failed to update document'),
      );
    },
  });
};

export const useVerifyWorkerDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      orgId,
      id,
    }: {
      orgId: string;
      id: string;
    }) => workerDocumentsApi.verify(orgId, id),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', orgId] });
      toast.success(
        t('workerDocuments.verified', 'Document verified'),
      );
    },
    onError: () => {
      toast.error(
        t('workerDocuments.verifyError', 'Failed to verify document'),
      );
    },
  });
};

export const useDeleteWorkerDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      orgId,
      id,
    }: {
      orgId: string;
      id: string;
    }) => workerDocumentsApi.delete(orgId, id),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', orgId] });
      toast.success(
        t('workerDocuments.deleted', 'Document deleted'),
      );
    },
    onError: () => {
      toast.error(
        t('workerDocuments.deleteError', 'Failed to delete document'),
      );
    },
  });
};
