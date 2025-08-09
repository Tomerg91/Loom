'use client';

import React, { useState, useMemo } from 'react';
import { Plus, FileText, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { NoteCard } from '@/components/notes/note-card';
import { NoteEditorModal } from '@/components/notes/note-editor-modal';
import { NotesFilters } from '@/components/notes/notes-filters';
import { NoteExport } from '@/components/notes/note-export';
import { cn } from '@/lib/utils';
import {
  useNotes,
  useNoteTags,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useDuplicateNote,
  useToggleFavorite,
  useToggleArchive,
  NotesFilter,
  Note,
  CreateNoteData,
  UpdateNoteData
} from '@/lib/queries/notes';

export default function ClientNotesPage() {
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>();
  
  // Filters state
  const [filters, setFilters] = useState<NotesFilter>({
    page: 1,
    limit: 20,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    isArchived: false, // Show only active notes by default
  });

  // Queries
  const { 
    data: notesData, 
    isLoading: notesLoading, 
    error: notesError,
    refetch: refetchNotes
  } = useNotes(filters);
  
  const { 
    data: tagsData,
    isLoading: tagsLoading
  } = useNoteTags();

  // Mutations
  const createNoteMutation = useCreateNote({
    onSuccess: () => {
      setIsEditorOpen(false);
      setEditingNote(undefined);
    },
  });

  const updateNoteMutation = useUpdateNote({
    onSuccess: () => {
      setIsEditorOpen(false);
      setEditingNote(undefined);
    },
  });

  const deleteNoteMutation = useDeleteNote();
  const duplicateNoteMutation = useDuplicateNote();
  const toggleFavoriteMutation = useToggleFavorite();
  const toggleArchiveMutation = useToggleArchive();

  // Derived data
  const notes = notesData?.data || [];
  const pagination = notesData?.pagination;
  const availableTags = tagsData?.data || [];
  
  // Get unique categories from notes
  const availableCategories = useMemo(() => {
    const categories = notes
      .map(note => note.category)
      .filter((category): category is string => !!category);
    return [...new Set(categories)].sort();
  }, [notes]);

  // Handlers
  const handleCreateNote = () => {
    setEditingNote(undefined);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (data: CreateNoteData | (UpdateNoteData & { id: string })) => {
    if ('id' in data) {
      // Update existing note
      await updateNoteMutation.mutateAsync(data);
    } else {
      // Create new note
      await createNoteMutation.mutateAsync(data);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteMutation.mutateAsync(id);
  };

  const handleDuplicateNote = async (id: string) => {
    await duplicateNoteMutation.mutateAsync(id);
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    await toggleFavoriteMutation.mutateAsync({ id, isFavorite });
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    await toggleArchiveMutation.mutateAsync({ id, isArchived });
  };

  const handleFiltersChange = (newFilters: NotesFilter) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className={cn(
      viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-4"
    )}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-2/3 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Error state
  if (notesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
            <p className="text-muted-foreground mt-2">
              Your personal notes and reflections
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load notes. {notesError.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchNotes()}
              className="ml-2"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  const showEmptyState = !notesLoading && notes.length === 0 && !filters.search && !filters.tags && !filters.category && !filters.isFavorite;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
          <p className="text-muted-foreground mt-2">
            Your personal notes and reflections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <NoteExport notes={notes} />
          )}
          <Button onClick={handleCreateNote} className="gap-2">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!showEmptyState && (
        <NotesFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableTags={availableTags}
          availableCategories={availableCategories}
          totalNotes={pagination?.total || 0}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {notesLoading || tagsLoading ? (
          renderSkeleton()
        ) : showEmptyState ? (
          // Empty state
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Start capturing your thoughts, ideas, and session insights. Create your first note to get started.
              </p>
              <Button onClick={handleCreateNote} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first note
              </Button>
            </CardContent>
          </Card>
        ) : notes.length === 0 ? (
          // No results state
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notes found</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                No notes match your current filters. Try adjusting your search or filters.
              </p>
              <Button 
                variant="outline" 
                onClick={() => handleFiltersChange({ 
                  page: 1, 
                  limit: filters.limit,
                  sortBy: 'updated_at',
                  sortOrder: 'desc'
                })}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Notes grid/list
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onDuplicate={handleDuplicateNote}
                onToggleFavorite={handleToggleFavorite}
                onToggleArchive={handleToggleArchive}
                isLoading={
                  deleteNoteMutation.isPending ||
                  duplicateNoteMutation.isPending ||
                  toggleFavoriteMutation.isPending ||
                  toggleArchiveMutation.isPending
                }
                className={viewMode === 'list' ? "max-w-none" : ""}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  className={!pagination.hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={pageNum === pagination.page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {pagination.totalPages > 5 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                  className={!pagination.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(undefined);
        }}
        onSave={handleSaveNote}
        note={editingNote}
        availableTags={availableTags}
        availableCategories={availableCategories}
        isLoading={createNoteMutation.isPending || updateNoteMutation.isPending}
      />
    </div>
  );
}
