'use client';

import { X, Save, Tag, Folder, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Note, CreateNoteData, UpdateNoteData, useAutosaveNote } from '@/lib/queries/notes';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateNoteData | (UpdateNoteData & { id: string })) => Promise<void>;
  note?: Note; // If provided, we're editing; if not, we're creating
  availableTags?: string[];
  availableCategories?: string[];
  isLoading?: boolean;
}

export function NoteEditorModal({
  isOpen,
  onClose,
  onSave,
  note,
  availableTags = [],
  availableCategories = [],
  isLoading = false,
}: NoteEditorModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'private' | 'shared_with_coach'>('private');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  
  // UI state
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  // Autosave for existing notes
  const { autosave, isAutosaving } = useAutosaveNote(
    note?.id || '',
    2000 // 2 seconds debounce
  );

  // Initialize form when note prop changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setPrivacyLevel(note.privacyLevel);
      setSelectedTags(note.tags);
      setCategory(note.category || '');
      setIsFavorite(note.isFavorite);
    } else {
      // Reset form for new note
      setTitle('');
      setContent('');
      setPrivacyLevel('private');
      setSelectedTags([]);
      setCategory('');
      setIsFavorite(false);
    }
    setHasUnsavedChanges(false);
    setNewTagInput('');
    setNewCategoryInput('');
  }, [note, isOpen]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Track changes for unsaved changes indicator
  useEffect(() => {
    if (note) {
      const hasChanges = 
        title !== note.title ||
        content !== note.content ||
        privacyLevel !== note.privacyLevel ||
        JSON.stringify(selectedTags.sort()) !== JSON.stringify(note.tags.sort()) ||
        category !== (note.category || '') ||
        isFavorite !== note.isFavorite;
      
      setHasUnsavedChanges(hasChanges);
      
      // Autosave for existing notes
      if (hasChanges && title.trim() && content.trim()) {
        autosave({
          title: title.trim(),
          content,
          privacyLevel,
          tags: selectedTags,
          category: category || undefined,
          isFavorite,
        });
      }
    } else {
      // For new notes, track if there's any content
      setHasUnsavedChanges(!!(title.trim() || content.trim()));
    }
  }, [title, content, privacyLevel, selectedTags, category, isFavorite, note, autosave]);

  const handleAddTag = () => {
    const trimmedTag = newTagInput.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
    }
    setNewTagInput('');
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryInput.trim();
    if (trimmedCategory) {
      setCategory(trimmedCategory);
      setNewCategoryInput('');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    const data = {
      title: title.trim(),
      content,
      privacyLevel,
      tags: selectedTags,
      category: category || undefined,
      isFavorite,
    };

    try {
      if (note) {
        await onSave({ ...data, id: note.id });
      } else {
        await onSave(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const canSave = title.trim() && content.trim() && !isLoading;
  const isEditing = !!note;

  const handleClose = () => {
    if (hasUnsavedChanges && !isEditing) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            {isEditing ? 'Edit Note' : 'Create New Note'}
            {isAutosaving && isEditing && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {hasUnsavedChanges && !isEditing && (
              <span className="text-xs text-orange-500">Unsaved changes</span>
            )}
          </DialogTitle>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!canSave}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Save' : 'Create'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              aria-label="Close note editor"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              ref={titleInputRef}
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="text-lg font-medium"
            />
          </div>

          {/* Metadata row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Privacy Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Privacy Level
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                >
                  {showPrivacyInfo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </Label>
              <Select
                value={privacyLevel}
                onValueChange={(value: 'private' | 'shared_with_coach') => setPrivacyLevel(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared_with_coach">Shared with Coach</SelectItem>
                </SelectContent>
              </Select>
              {showPrivacyInfo && (
                <p className="text-xs text-muted-foreground">
                  {privacyLevel === 'private' 
                    ? 'Only you can see this note' 
                    : 'Your coach can see this note'
                  }
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Category
              </Label>
              {availableCategories.length > 0 ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {availableCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Enter category..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCategory}
                    disabled={!newCategoryInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Favorite toggle */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Favorite
              </Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="favorite"
                  checked={isFavorite}
                  onCheckedChange={setIsFavorite}
                />
                <Label htmlFor="favorite" className="text-sm">
                  Mark as favorite
                </Label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            
            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag input */}
            <div className="flex gap-2">
              <Input
                ref={tagInputRef}
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTagInput.trim() || selectedTags.includes(newTagInput.trim())}
              >
                Add Tag
              </Button>
            </div>

            {/* Suggested tags */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-2">Suggestions:</span>
                {availableTags
                  .filter(tag => !selectedTags.includes(tag))
                  .slice(0, 5)
                  .map(tag => (
                    <Button
                      key={tag}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedTags([...selectedTags, tag])}
                    >
                      {tag}
                    </Button>
                  ))}
              </div>
            )}
          </div>

          {/* Content Editor */}
          <div className="flex-1 flex flex-col space-y-2 min-h-0">
            <Label htmlFor="note-content">Content</Label>
            <div className="flex-1 min-h-0">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Start writing your note..."
                className="h-full"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}