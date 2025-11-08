/**
 * Resource Filters Component
 *
 * Filtering UI for resources with:
 * - Search input
 * - Category filter
 * - Tag filter (multi-select)
 * - Sort options
 * - Clear filters button
 *
 * @module components/resources/resource-filters
 */

'use client';

import { Search, X, Filter, Tag } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { ResourceCategory, ResourceListParams } from '@/types/resources';

const CATEGORY_OPTIONS: { value: ResourceCategory; label: string }[] = [
  { value: 'worksheet', label: 'Worksheets' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'article', label: 'Articles' },
  { value: 'template', label: 'Templates' },
  { value: 'guide', label: 'Guides' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'filename:asc', label: 'Name (A-Z)' },
  { value: 'filename:desc', label: 'Name (Z-A)' },
  { value: 'view_count:desc', label: 'Most Viewed' },
  { value: 'completion_count:desc', label: 'Most Completed' },
];

export interface ResourceFiltersProps {
  availableTags?: string[];
  initialFilters?: Partial<ResourceListParams>;
  onFiltersChange: (filters: Partial<ResourceListParams>) => void;
  className?: string;
}

/**
 * ResourceFilters Component
 */
export function ResourceFilters({
  availableTags = [],
  initialFilters = {},
  onFiltersChange,
  className,
}: ResourceFiltersProps) {
  // Local state
  const [searchValue, setSearchValue] = useState(initialFilters.search || '');
  const [category, setCategory] = useState<ResourceCategory | 'all'>(
    initialFilters.category || 'all'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags || []);
  const [sortValue, setSortValue] = useState(
    `${initialFilters.sortBy || 'created_at'}:${initialFilters.sortOrder || 'desc'}`
  );

  // Debounce search input
  const debouncedSearch = useDebounce(searchValue, 300);

  // Emit filter changes
  useEffect(() => {
    const [sortBy, sortOrder] = sortValue.split(':') as [string, 'asc' | 'desc'];

    const filters: Partial<ResourceListParams> = {
      search: debouncedSearch || undefined,
      category: category === 'all' ? undefined : category,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      sortBy: sortBy as unknown,
      sortOrder,
    };

    onFiltersChange(filters);
  }, [debouncedSearch, category, selectedTags, sortValue, onFiltersChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setCategory('all');
    setSelectedTags([]);
    setSortValue('created_at:desc');
  }, []);

  // Toggle tag selection
  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Remove single tag
  const handleRemoveTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const hasActiveFilters =
    searchValue || category !== 'all' || selectedTags.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search resources..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchValue('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Category */}
        <Select value={category} onValueChange={(v) => setCategory(v as unknown)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tags */}
        {availableTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Tag className="w-4 h-4 mr-2" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4" align="start">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filter by tags</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={() => handleToggleTag(tag)}
                      />
                      <Label
                        htmlFor={`tag-${tag}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {tag}
                      </Label>
                    </div>
                  ))}
                </div>

                {selectedTags.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="w-full"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Sort */}
        <Select value={sortValue} onValueChange={setSortValue}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters / Clear Button */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {CATEGORY_OPTIONS.find((c) => c.value === category)?.label}
              <button
                onClick={() => setCategory('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
