import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useDelete, useGet, usePost, usePut } from '../lib/api';
import { postForm, put } from '../lib/http';
import type {
  ClientNote,
  ClientRelation,
  ClientTask,
  KycDocument,
  TimelineEvent,
} from '../types';

export interface CreateClientNoteInput {
  date: string;
  noteType: string;
  auteur: string;
  contenu: string;
  files?: File[];
}

export function useClientNotes(clientId: string | undefined) {
  return useGet<{ notes: ClientNote[] }, ClientNote[]>({
    path: api.clientNotes(clientId ?? ''),
    queryKey: queryKeys.clients.notes(clientId ?? ''),
    select: (data) => data.notes,
    enabled: Boolean(clientId),
  });
}

export function useCreateClientNote(clientId: string) {
  const queryClient = useQueryClient();
  return usePost<{ note: ClientNote }, CreateClientNoteInput>({
    path: api.clientNotes(clientId),
    mutationFn: (input) => {
      const formData = new FormData();
      formData.append('date', input.date);
      formData.append('noteType', input.noteType);
      formData.append('auteur', input.auteur);
      formData.append('contenu', input.contenu);
      for (const file of input.files ?? []) {
        formData.append('files', file);
      }
      return postForm<{ note: ClientNote }>(api.clientNotes(clientId), formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.notes(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.timeline(clientId) });
    },
  });
}

export function useDeleteClientNote(clientId: string) {
  const queryClient = useQueryClient();
  return useDelete<void, string>({
    path: (noteId) => api.clientNoteById(clientId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.notes(clientId) });
    },
  });
}

export function useClientRelations(clientId: string | undefined) {
  return useGet<{ relations: ClientRelation[] }, ClientRelation[]>({
    path: api.clientRelations(clientId ?? ''),
    queryKey: queryKeys.clients.relations(clientId ?? ''),
    select: (data) => data.relations,
    enabled: Boolean(clientId),
  });
}

export function useCreateClientRelation(clientId: string) {
  const queryClient = useQueryClient();
  return usePost<
    { relation: ClientRelation },
    { clientBId: string; typeRelation: string; pctDetention?: number; note?: string }
  >({
    path: api.clientRelations(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.relations(clientId) });
    },
  });
}

export function useDeleteClientRelation(clientId: string) {
  const queryClient = useQueryClient();
  return useDelete<void, string>({
    path: (relationId) => api.clientRelationById(clientId, relationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.relations(clientId) });
    },
  });
}

export function useClientTasks(clientId: string | undefined) {
  return useGet<{ tasks: ClientTask[] }, ClientTask[]>({
    path: api.clientTasks(clientId ?? ''),
    queryKey: queryKeys.clients.tasks(clientId ?? ''),
    select: (data) => data.tasks,
    enabled: Boolean(clientId),
  });
}

export function useCreateClientTask(clientId: string) {
  const queryClient = useQueryClient();
  return usePost<
    { task: ClientTask },
    { title: string; description?: string; status?: string; priorite?: string; assigneA: string; dueDate?: string }
  >({
    path: api.clientTasks(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.tasks(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.timeline(clientId) });
    },
  });
}

export function useUpdateClientTask(clientId: string) {
  const queryClient = useQueryClient();
  return usePut<{ task: ClientTask }, Partial<ClientTask> & { id: string }>({
    path: ({ id }) => api.clientTaskById(clientId, id),
    mutationFn: ({ id, ...input }) => put(api.clientTaskById(clientId, id), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.tasks(clientId) });
    },
  });
}

export function useDeleteClientTask(clientId: string) {
  const queryClient = useQueryClient();
  return useDelete<void, string>({
    path: (taskId) => api.clientTaskById(clientId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.tasks(clientId) });
    },
  });
}

export function useClientKycDocuments(clientId: string | undefined) {
  return useGet<{ documents: KycDocument[] }, KycDocument[]>({
    path: api.clientKycDocuments(clientId ?? ''),
    queryKey: queryKeys.clients.kycDocuments(clientId ?? ''),
    select: (data) => data.documents,
    enabled: Boolean(clientId),
  });
}

export interface UpdateKycDocumentInput {
  id: string;
  recu?: boolean;
  dateReception?: string | null;
  dateValidite?: string | null;
  urlDocument?: string | null;
}

export function useCreateKycDocument(clientId: string) {
  const queryClient = useQueryClient();
  return usePost<
    { document: KycDocument },
    {
      docType: string;
      recu?: boolean;
      dateReception?: string | null;
      dateValidite?: string | null;
      urlDocument?: string | null;
    }
  >({
    path: api.clientKycDocuments(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.kycDocuments(clientId) });
    },
  });
}

export function useUpdateKycDocument(clientId: string) {
  const queryClient = useQueryClient();
  return usePut<{ document: KycDocument }, UpdateKycDocumentInput>({
    path: ({ id }) => api.clientKycDocumentById(clientId, id),
    mutationFn: ({ id, ...input }) => put(api.clientKycDocumentById(clientId, id), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.kycDocuments(clientId) });
    },
  });
}

export function useClientTimeline(clientId: string | undefined) {
  return useGet<{ events: TimelineEvent[] }, TimelineEvent[]>({
    path: api.clientTimeline(clientId ?? ''),
    queryKey: queryKeys.clients.timeline(clientId ?? ''),
    select: (data) => data.events,
    enabled: Boolean(clientId),
  });
}
