'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Star, 
  Archive, 
  Trash2, 
  Copy, 
  Edit3, 
  Eye,
  Share2,
  MoreHorizontal,
  FileText,
  Calendar,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Note } from '@/lib/queries/notes';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onShare?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onToggleArchive,
  onShare,
  isLoading = false,
  className,
}: NoteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Strip HTML tags for preview
  const getTextPreview = (htmlContent: string, maxLength: number = 150) => {
    const textContent = htmlContent.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const handleDeleteConfirm = () => {
    onDelete(note.id);
    setShowDeleteDialog(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(note.id, !note.isFavorite);
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleArchive(note.id, !note.isArchived);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(note.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(note.id);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <Card 
        className={cn(
          "group relative cursor-pointer transition-all duration-200 hover:shadow-md",
          note.isArchived && "opacity-75",
          isLoading && "opacity-50 pointer-events-none",
          className
        )}
        onClick={handleCardClick}
      >
        {/* Favorite indicator */}
        {note.isFavorite && (
          <div className="absolute top-2 right-2 z-10">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary">
                {note.title}
              </h3>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                </div>
                
                {note.category && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{note.category}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span className="capitalize">{note.privacyLevel.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleFavorite}
                title={note.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className={cn(
                  "h-4 w-4",
                  note.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
                )} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    {onShare && (
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share with coach
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleToggleArchive}>
                      <Archive className="mr-2 h-4 w-4" />
                      {note.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Content preview */}
          <div 
            className={cn(
              "text-sm text-muted-foreground transition-all duration-200",
              isExpanded ? "line-clamp-none" : "line-clamp-3"
            )}
          >
            {isExpanded ? (
              <div 
                dangerouslySetInnerHTML={{ __html: note.content }}
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              />
            ) : (
              getTextPreview(note.content)
            )}
          </div>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {note.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Archived indicator */}
          {note.isArchived && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Archive className="h-3 w-3" />
              <span>Archived</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}