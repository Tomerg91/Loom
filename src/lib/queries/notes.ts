'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client-api-request';

// Types
export interface Note {
  id: string;
  clientId?: string; // Only for coach notes
  sessionId?: string;
  title: string;
  content: string;
  privacyLevel: 'private' | 'shared_with_coach';
  tags: string[];
  category?: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  content: string;
  privacyLevel?: 'private' | 'shared_with_coach';
  tags?: string[];
  category?: string;
  sessionId?: string;
  isFavorite?: boolean;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  privacyLevel?: 'private' | 'shared_with_coach';
  tags?: string[];
  category?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface NotesFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string;
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
}

export interface NotesResponse {
  data: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query Keys
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: NotesFilter) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  tags: () => [...noteKeys.all, 'tags'] as const,
  categories: () => [...noteKeys.all, 'categories'] as const,
};

// API Functions
const fetchNotes = async (filters: NotesFilter = {}): Promise<NotesResponse> => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  return apiGet<NotesResponse>(`/api/notes?${params.toString()}`);
};

const fetchNote = async (id: string): Promise<{ data: Note }> => {
  return apiGet<{ data: Note }>(`/api/notes/${id}`);
};

const createNote = async (data: CreateNoteData): Promise<{ data: Note }> => {
  return apiPost<{ data: Note }>('/api/notes', data);
};

const updateNote = async ({ id, ...data }: UpdateNoteData & { id: string }): Promise<{ data: Note }> => {
  return apiPut<{ data: Note }>(`/api/notes/${id}`, data);
};

const deleteNote = async (id: string): Promise<{ message: string }> => {
  return apiDelete<{ message: string }>(`/api/notes/${id}`);
};

const duplicateNote = async (id: string): Promise<{ data: Note }> => {
  // First fetch the original note
  const { data: originalNote } = await fetchNote(id);
  
  // Create a duplicate with modified title
  const duplicateData: CreateNoteData = {
    title: `Copy of ${originalNote.title}`,
    content: originalNote.content,
    privacyLevel: originalNote.privacyLevel,
    tags: [...originalNote.tags],
    category: originalNote.category,
    sessionId: originalNote.sessionId,
    isFavorite: false, // New copy should not be favorited by default
  };
  
  return createNote(duplicateData);
};

const fetchTags = async (): Promise<{ data: string[]; count: number }> => {
  return apiGet<{ data: string[]; count: number }>('/api/notes/tags');
};

// Query Hooks
export const useNotes = (
  filters: NotesFilter = {},
  options?: Omit<UseQueryOptions<NotesResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: noteKeys.list(filters),
    queryFn: () => fetchNotes(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

export const useNote = (
  id: string,
  options?: Omit<UseQueryOptions<{ data: Note }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => fetchNote(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

export const useNoteTags = (
  options?: Omit<UseQueryOptions<{ data: string[]; count: number }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: noteKeys.tags(),
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

// Mutation Hooks
export const useCreateNote = (
  options?: UseMutationOptions<{ data: Note }, Error, CreateNoteData>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNote,
    onSuccess: (data) => {
      // Invalidate and refetch notes list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() });
      
      // Add the new note to the cache
      queryClient.setQueryData(noteKeys.detail(data.data.id), data);
    },
    ...options,
  });
};

export const useUpdateNote = (
  options?: UseMutationOptions<{ data: Note }, Error, UpdateNoteData & { id: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data, variables) => {
      // Invalidate and refetch notes list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() });
      
      // Update the specific note in cache
      queryClient.setQueryData(noteKeys.detail(variables.id), data);
    },
    ...options,
  });
};

export const useDeleteNote = (
  options?: UseMutationOptions<{ message: string }, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, noteId) => {
      // Invalidate and refetch notes list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() });
      
      // Remove the note from cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(noteId) });
    },
    ...options,
  });
};

export const useDuplicateNote = (
  options?: UseMutationOptions<{ data: Note }, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: duplicateNote,
    onSuccess: (data) => {
      // Invalidate and refetch notes list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      
      // Add the duplicated note to the cache
      queryClient.setQueryData(noteKeys.detail(data.data.id), data);
    },
    ...options,
  });
};

// Optimistic update hooks
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const updateNote = useUpdateNote();
  
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      // Optimistic update
      queryClient.setQueryData(
        noteKeys.detail(id),
        (old: { data: Note } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, isFavorite }
          };
        }
      );
      
      return updateNote.mutateAsync({ id, isFavorite });
    },
    onError: (_, { id }) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
    },
  });
};

export const useToggleArchive = () => {
  const queryClient = useQueryClient();
  const updateNote = useUpdateNote();
  
  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      // Optimistic update
      queryClient.setQueryData(
        noteKeys.detail(id),
        (old: { data: Note } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: { ...old.data, isArchived }
          };
        }
      );
      
      return updateNote.mutateAsync({ id, isArchived });
    },
    onError: (_, { id }) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
    },
  });
};

// Autosave hook for note editing
export const useAutosaveNote = (id: string, _debounceMs: number = 1000) => {
  const queryClient = useQueryClient();
  const updateNote = useUpdateNote({
    onSuccess: (data) => {
      // Silent update - don't show success message for autosave
      queryClient.setQueryData(noteKeys.detail(id), data);
    },
    onError: (error) => {
      console.error('Autosave failed:', error);
      // Could show a subtle error indicator here
    },
  });
  
  const autosave = useMutation({
    mutationFn: (data: Partial<UpdateNoteData>) => {
      const savePromise = updateNote.mutateAsync({ id, ...data });
      return savePromise;
    },
  });
  
  return {
    autosave: autosave.mutate,
    isAutosaving: autosave.isPending,
    autosaveError: autosave.error,
  };
};