'use client';

/**
 * Client Resource Filters Component
 *
 * Provides filtering controls for client resource library:
 * - Category filter
 * - Tag filter
 * - Search
 * - Show/hide completed resources
 *
 * @module components/resources/client-resource-filters
 */

import { Search, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  RESOURCE_CATEGORY_VALUES,
  RESOURCE_CATEGORY_LABELS,
  type ResourceCategory,
} from '@/types/resources';
import type { ResourceListParams } from '@/types/resources';

interface ClientResourceFiltersProps {
  filters: ResourceListParams;
  onFilterChange: (filters: Partial<ResourceListParams>) => void;
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
}

export function ClientResourceFilters({
  filters,
  onFilterChange,
  showCompleted,
  onShowCompletedChange,
}: ClientResourceFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search: searchInput || undefined });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({
      category: value === 'all' ? undefined : (value as ResourceCategory),
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFilterChange({
      category: undefined,
      tags: undefined,
      search: undefined,
    });
  };

  const hasActiveFilters = filters.category || filters.search || (filters.tags?.length ?? 0) > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-1">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search resources..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
          {searchInput && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ search: undefined });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Category Filter */}
      <Select
        value={filters.category || 'all'}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {RESOURCE_CATEGORY_VALUES.map((category) => (
            <SelectItem key={category} value={category}>
              {RESOURCE_CATEGORY_LABELS[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show Completed Toggle */}
      <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
        <Switch
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={onShowCompletedChange}
        />
        <Label htmlFor="show-completed" className="text-sm cursor-pointer">
          Show completed
        </Label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
