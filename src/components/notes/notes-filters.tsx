'use client';

import { 
  Search, 
  Filter, 
  Star, 
  Archive, 
  Eye, 
  Calendar, 
  Tag, 
  Folder,
  LayoutGrid,
  List,
  ArrowUpDown,
  X
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NotesFilter } from '@/lib/queries/notes';
import { cn } from '@/lib/utils';

interface NotesFiltersProps {
  filters: NotesFilter;
  onFiltersChange: (filters: NotesFilter) => void;
  availableTags: string[];
  availableCategories: string[];
  totalNotes: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  className?: string;
}

export function NotesFilters({
  filters,
  onFiltersChange,
  availableTags,
  availableCategories,
  totalNotes,
  viewMode,
  onViewModeChange,
  className,
}: NotesFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Parse selected tags from filters
  const selectedTags = useMemo(() => {
    return filters.tags ? filters.tags.split(',').filter(tag => tag.trim()) : [];
  }, [filters.tags]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.tags) count++;
    if (filters.category) count++;
    if (filters.isFavorite) count++;
    if (filters.isArchived !== undefined) count++;
    return count;
  }, [filters]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({ ...filters, search: value || undefined, page: 1 });
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    onFiltersChange({ ...filters, sortBy, sortOrder, page: 1 });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = selectedTags;
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    onFiltersChange({ 
      ...filters, 
      tags: newTags.length > 0 ? newTags.join(',') : undefined,
      page: 1
    });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ 
      ...filters, 
      category: category || undefined,
      page: 1
    });
  };

  const handleToggleFavorites = (checked: boolean) => {
    onFiltersChange({ 
      ...filters, 
      isFavorite: checked ? true : undefined,
      page: 1
    });
  };

  const handleArchiveFilter = (value: string) => {
    let isArchived: boolean | undefined;
    if (value === 'archived') isArchived = true;
    else if (value === 'active') isArchived = false;
    else isArchived = undefined;
    
    onFiltersChange({ 
      ...filters, 
      isArchived,
      page: 1
    });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    onFiltersChange({ 
      page: 1,
      limit: filters.limit,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
  };

  const getSortLabel = () => {
    const sortBy = filters.sortBy || 'updated_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    const sortLabels: Record<string, string> = {
      'created_at': 'Date Created',
      'updated_at': 'Last Modified',
      'title': 'Title',
    };
    
    return `${sortLabels[sortBy] || 'Last Modified'} (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main search and actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSortChange('updated_at', 'desc')}>
                Last Modified (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('updated_at', 'asc')}>
                Last Modified (Oldest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('created_at', 'desc')}>
                Date Created (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('created_at', 'asc')}>
                Date Created (Oldest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('title', 'asc')}>
                Title (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('title', 'desc')}>
                Title (Z-A)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filters */}
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-muted-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Category filter */}
                {availableCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Folder className="h-4 w-4" />
                      Category
                    </Label>
                    <Select value={filters.category || ''} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {availableCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Archive filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Archive className="h-4 w-4" />
                    Status
                  </Label>
                  <Select 
                    value={
                      filters.isArchived === true ? 'archived' : 
                      filters.isArchived === false ? 'active' : 'all'
                    } 
                    onValueChange={handleArchiveFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All notes</SelectItem>
                      <SelectItem value="active">Active notes</SelectItem>
                      <SelectItem value="archived">Archived notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Favorites filter */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4" />
                    Show only favorites
                  </Label>
                  <Switch
                    checked={!!filters.isFavorite}
                    onCheckedChange={handleToggleFavorites}
                  />
                </div>

                {/* Tags filter */}
                {availableTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Tag className="h-4 w-4" />
                      Tags
                    </Label>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {availableTags.map(tag => (
                        <label
                          key={tag}
                          className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted rounded-sm p-1"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            onChange={() => handleTagToggle(tag)}
                            className="rounded border-input"
                          />
                          <span className="truncate">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* View mode toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filters:</span>
          
          {filters.search && (
            <Badge variant="outline" className="gap-1">
              Search: {filters.search}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleSearchChange('')}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          
          {filters.category && (
            <Badge variant="outline" className="gap-1">
              Category: {filters.category}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleCategoryChange('')}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          
          {filters.isFavorite && (
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              Favorites
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleToggleFavorites(false)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          
          {filters.isArchived === true && (
            <Badge variant="outline" className="gap-1">
              <Archive className="h-3 w-3" />
              Archived
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleArchiveFilter('all')}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          
          {selectedTags.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleTagToggle(tag)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalNotes} {totalNotes === 1 ? 'note' : 'notes'} 
          {filters.search && ` matching "${filters.search}"`}
        </span>
        <span>Sorted by {getSortLabel()}</span>
      </div>
    </div>
  );
}