'use client';

import { 
  FolderIcon, 
  FolderPlusIcon,
  TagIcon, 
  PlusIcon,
  SearchIcon,

  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  XIcon,
  HashIcon,

  UserIcon,
  FileIcon,
  StarIcon,
  ClockIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export interface VirtualFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  rules: {
    tags?: string[];
    categories?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
    sizeRange?: {
      min?: number;
      max?: number;
    };
    searchTerms?: string[];
  };
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

export interface TagInfo {
  name: string;
  count: number;
  color?: string;
  description?: string;
}

export interface FileOrganizationPanelProps {
  availableTags: TagInfo[];
  virtualFolders: VirtualFolder[];
  selectedTags: string[];
  selectedFolder: string | null;
  onTagSelect: (tags: string[]) => void;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: (folder: Omit<VirtualFolder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFolder: (folderId: string, updates: Partial<VirtualFolder>) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateTag: (tag: { name: string; color?: string; description?: string }) => void;
  onDeleteTag: (tagName: string) => void;
  className?: string;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Green', value: 'green', class: 'bg-green-100 text-green-800 border-green-200' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: 'Red', value: 'red', class: 'bg-red-100 text-red-800 border-red-200' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-100 text-pink-800 border-pink-200' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { name: 'Gray', value: 'gray', class: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const FOLDER_ICONS = [
  { name: 'Folder', value: 'folder', component: FolderIcon },
  { name: 'Star', value: 'star', component: StarIcon },
  { name: 'File', value: 'file', component: FileIcon },
  { name: 'Tag', value: 'tag', component: TagIcon },
  { name: 'Clock', value: 'clock', component: ClockIcon },
  { name: 'User', value: 'user', component: UserIcon },
];

export function FileOrganizationPanel({
  availableTags,
  virtualFolders,
  selectedTags,
  selectedFolder,
  onTagSelect,
  onFolderSelect,
  onCreateFolder,
  _onUpdateFolder,
  onDeleteFolder,
  onCreateTag,
  onDeleteTag,
  className = '',
}: FileOrganizationPanelProps) {
  const t = useTranslations('files');
  
  // State
  const [tagSearch, setTagSearch] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VirtualFolder | null>(null);
  const [newFolderForm, setNewFolderForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: 'folder',
    rules: {
      tags: [] as string[],
      categories: [] as string[],
      searchTerms: [] as string[],
    },
  });
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    description: '',
    color: 'blue',
  });
  const [newSearchTerm, setNewSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!tagSearch) return availableTags;
    return availableTags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      tag.description?.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [availableTags, tagSearch]);

  // Filter folders based on search
  const filteredFolders = useMemo(() => {
    if (!folderSearch) return virtualFolders;
    return virtualFolders.filter(folder =>
      folder.name.toLowerCase().includes(folderSearch.toLowerCase()) ||
      folder.description?.toLowerCase().includes(folderSearch.toLowerCase())
    );
  }, [virtualFolders, folderSearch]);

  // Handle tag selection
  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    onTagSelect(newTags);
  };

  // Handle folder creation
  const handleCreateFolder = () => {
    if (!newFolderForm.name.trim()) return;

    onCreateFolder({
      name: newFolderForm.name,
      description: newFolderForm.description,
      color: newFolderForm.color,
      icon: newFolderForm.icon,
      rules: newFolderForm.rules,
    });

    // Reset form
    setNewFolderForm({
      name: '',
      description: '',
      color: 'blue',
      icon: 'folder',
      rules: {
        tags: [],
        categories: [],
        searchTerms: [],
      },
    });
    setCreateFolderOpen(false);
  };

  // Handle tag creation
  const handleCreateTag = () => {
    if (!newTagForm.name.trim()) return;

    onCreateTag({
      name: newTagForm.name,
      description: newTagForm.description,
      color: newTagForm.color,
    });

    // Reset form
    setNewTagForm({
      name: '',
      description: '',
      color: 'blue',
    });
    setCreateTagOpen(false);
  };

  // Add search term to folder rules
  const addSearchTerm = () => {
    if (!newSearchTerm.trim()) return;
    
    setNewFolderForm(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        searchTerms: [...(prev.rules.searchTerms || []), newSearchTerm.trim()],
      },
    }));
    setNewSearchTerm('');
  };

  // Remove search term from folder rules
  const removeSearchTerm = (index: number) => {
    setNewFolderForm(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        searchTerms: prev.rules.searchTerms?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  // Get folder color class
  const getFolderColorClass = (color: string) => {
    const colorConfig = FOLDER_COLORS.find(c => c.value === color);
    return colorConfig?.class || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get folder icon component
  const getFolderIcon = (iconName: string) => {
    const iconConfig = FOLDER_ICONS.find(i => i.value === iconName);
    const IconComponent = iconConfig?.component || FolderIcon;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Virtual Folders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              {t('organization.folders', { defaultValue: 'Smart Folders' })}
            </CardTitle>
            <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlusIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Smart Folder</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Folder Name</Label>
                      <Input
                        value={newFolderForm.name}
                        onChange={(e) => setNewFolderForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter folder name"
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Select
                        value={newFolderForm.color}
                        onValueChange={(value) => setNewFolderForm(prev => ({ ...prev, color: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOLDER_COLORS.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded ${color.class.split(' ')[0]}`} />
                                {color.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={newFolderForm.icon}
                        onValueChange={(value) => setNewFolderForm(prev => ({ ...prev, icon: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOLDER_ICONS.map(icon => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <icon.component className="h-4 w-4" />
                                {icon.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newFolderForm.description}
                      onChange={(e) => setNewFolderForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                    />
                  </div>

                  {/* Folder Rules */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Folder Rules</h4>
                    
                    {/* Tags */}
                    <div>
                      <Label>Include files with tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableTags.map(tag => (
                          <Badge
                            key={tag.name}
                            variant={newFolderForm.rules.tags?.includes(tag.name) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const currentTags = newFolderForm.rules.tags || [];
                              const newTags = currentTags.includes(tag.name)
                                ? currentTags.filter(t => t !== tag.name)
                                : [...currentTags, tag.name];
                              setNewFolderForm(prev => ({
                                ...prev,
                                rules: { ...prev.rules, tags: newTags }
                              }));
                            }}
                          >
                            {tag.name} ({tag.count})
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <Label>Include file categories</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['preparation', 'notes', 'recording', 'resource', 'personal', 'document'].map(category => (
                          <Badge
                            key={category}
                            variant={newFolderForm.rules.categories?.includes(category) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const currentCategories = newFolderForm.rules.categories || [];
                              const newCategories = currentCategories.includes(category)
                                ? currentCategories.filter(c => c !== category)
                                : [...currentCategories, category];
                              setNewFolderForm(prev => ({
                                ...prev,
                                rules: { ...prev.rules, categories: newCategories }
                              }));
                            }}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Search Terms */}
                    <div>
                      <Label>Include files matching search terms</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newSearchTerm}
                          onChange={(e) => setNewSearchTerm(e.target.value)}
                          placeholder="Add search term"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSearchTerm();
                            }
                          }}
                        />
                        <Button type="button" onClick={addSearchTerm} variant="outline">
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      {newFolderForm.rules.searchTerms && newFolderForm.rules.searchTerms.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newFolderForm.rules.searchTerms.map((term, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {term}
                              <button
                                type="button"
                                onClick={() => removeSearchTerm(index)}
                                className="hover:text-red-600"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder} disabled={!newFolderForm.name.trim()}>
                      Create Folder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Folder Search */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search folders..."
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* All Files Option */}
          <div
            className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
              !selectedFolder 
                ? 'bg-blue-50 border-2 border-blue-200 text-blue-900' 
                : 'hover:bg-gray-50 border border-gray-200'
            }`}
            onClick={() => onFolderSelect(null)}
          >
            <div className="flex items-center gap-3">
              <FolderIcon className="h-4 w-4" />
              <span className="font-medium">All Files</span>
            </div>
          </div>

          {/* Virtual Folders */}
          <div className="space-y-2">
            {filteredFolders.map(folder => (
              <div
                key={folder.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFolder === folder.id
                    ? `${getFolderColorClass(folder.color)} border-2`
                    : 'hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => onFolderSelect(folder.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFolderIcon(folder.icon)}
                    <div>
                      <span className="font-medium">{folder.name}</span>
                      {folder.fileCount !== undefined && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({folder.fileCount})
                        </span>
                      )}
                      {folder.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {folder.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingFolder(folder)}>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteFolder(folder.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {filteredFolders.length === 0 && folderSearch && (
            <p className="text-sm text-gray-500 text-center py-4">
              No folders match your search
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              {t('organization.tags', { defaultValue: 'Tags' })}
            </CardTitle>
            <Dialog open={createTagOpen} onOpenChange={setCreateTagOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Tag</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Tag Name</Label>
                    <Input
                      value={newTagForm.name}
                      onChange={(e) => setNewTagForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter tag name"
                    />
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newTagForm.description}
                      onChange={(e) => setNewTagForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div>
                    <Label>Color</Label>
                    <Select
                      value={newTagForm.color}
                      onValueChange={(value) => setNewTagForm(prev => ({ ...prev, color: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLDER_COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${color.class.split(' ')[0]}`} />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setCreateTagOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTag} disabled={!newTagForm.name.trim()}>
                      Create Tag
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tag Search */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag List */}
          <div className="space-y-2">
            {filteredTags.map(tag => (
              <div
                key={tag.name}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  selectedTags.includes(tag.name)
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTagToggle(tag.name)}
              >
                <div className="flex items-center gap-2">
                  <HashIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-sm font-medium">{tag.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {tag.count}
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreVerticalIcon className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onDeleteTag(tag.name)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete Tag
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              {tagSearch ? 'No tags match your search' : 'No tags available'}
            </p>
          )}

          {/* Selected Tags Summary */}
          {selectedTags.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Selected Tags:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTagSelect([])}
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    <XIcon className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}