'use client';

import { Download, FileText, File } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Note } from '@/lib/queries/notes';

interface NoteExportProps {
  notes: Note[];
  selectedNotes?: Note[];
  className?: string;
}

export function NoteExport({ notes, selectedNotes, className }: NoteExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const notesToExport = selectedNotes && selectedNotes.length > 0 ? selectedNotes : notes;
  
  // Convert HTML to plain text
  const htmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const exportAsText = async () => {
    setIsExporting(true);
    try {
      let content = `My Notes - Export\n${'='.repeat(30)}\n\n`;
      
      notesToExport.forEach((note, index) => {
        content += `${index + 1}. ${note.title}\n`;
        content += `Created: ${new Date(note.createdAt).toLocaleDateString()}\n`;
        content += `Updated: ${new Date(note.updatedAt).toLocaleDateString()}\n`;
        
        if (note.category) {
          content += `Category: ${note.category}\n`;
        }
        
        if (note.tags.length > 0) {
          content += `Tags: ${note.tags.join(', ')}\n`;
        }
        
        content += `Privacy: ${note.privacyLevel.replace('_', ' ')}\n`;
        content += '-'.repeat(50) + '\n';
        content += htmlToText(note.content) + '\n\n';
        content += '='.repeat(50) + '\n\n';
      });
      
      // Create and download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-notes-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsMarkdown = async () => {
    setIsExporting(true);
    try {
      let content = `# My Notes - Export\n\n`;
      content += `Exported on: ${new Date().toLocaleDateString()}\n`;
      content += `Total notes: ${notesToExport.length}\n\n`;
      content += '---\n\n';
      
      notesToExport.forEach((note, _index) => {
        content += `## ${note.title}\n\n`;
        
        // Metadata table
        content += '| Field | Value |\n';
        content += '|-------|-------|\n';
        content += `| Created | ${new Date(note.createdAt).toLocaleDateString()} |\n`;
        content += `| Updated | ${new Date(note.updatedAt).toLocaleDateString()} |\n`;
        
        if (note.category) {
          content += `| Category | ${note.category} |\n`;
        }
        
        if (note.tags.length > 0) {
          content += `| Tags | ${note.tags.map(tag => `\`${tag}\``).join(', ')} |\n`;
        }
        
        content += `| Privacy | ${note.privacyLevel.replace('_', ' ')} |\n`;
        content += '\n';
        
        // Content (convert HTML to markdown-ish text)
        const textContent = htmlToText(note.content);
        content += textContent + '\n\n';
        content += '---\n\n';
      });
      
      // Create and download file
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-notes-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalNotes: notesToExport.length,
        notes: notesToExport.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          textContent: htmlToText(note.content),
          category: note.category,
          tags: note.tags,
          privacyLevel: note.privacyLevel,
          isFavorite: note.isFavorite,
          isArchived: note.isArchived,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-notes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (notesToExport.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={className}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
          {selectedNotes && selectedNotes.length > 0 && (
            <span className="ml-1">({selectedNotes.length})</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsText}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsMarkdown}>
          <File className="h-4 w-4 mr-2" />
          Export as Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsJSON}>
          <File className="h-4 w-4 mr-2" />
          Export as JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}