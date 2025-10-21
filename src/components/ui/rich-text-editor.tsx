'use client';

import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Quote,
  Type,
  Strikethrough
} from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  className,
  maxLength = 10000,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<{ [key: string]: boolean }>({});
  const [characterCount, setCharacterCount] = useState(0);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      updateCharacterCount();
    }
  }, [value]);

  // Update character count
  const updateCharacterCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setCharacterCount(text.length);
    }
  };

  // Handle content change
  const handleInput = () => {
    if (editorRef.current && onChange) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      updateCharacterCount();
    }
  };

  // Execute formatting command
  const executeCommand = (command: string, value?: string) => {
    if (disabled) return;
    
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    
    // Update active states
    updateActiveStates();
  };

  // Update active formatting states
  const updateActiveStates = () => {
    setIsActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  // Handle selection change to update active states
  const handleSelectionChange = () => {
    updateActiveStates();
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Insert link
  const insertLink = () => {
    if (disabled) return;
    
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Insert blockquote
  const insertBlockquote = () => {
    if (disabled) return;
    executeCommand('formatBlock', 'blockquote');
  };

  // Format as heading
  const formatHeading = (level: string) => {
    if (disabled) return;
    executeCommand('formatBlock', `h${level}`);
  };

  return (
    <div className={cn('border rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
        {/* Text formatting */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            type="button"
            variant={isActive.bold ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('bold')}
            disabled={disabled}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isActive.italic ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('italic')}
            disabled={disabled}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isActive.underline ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('underline')}
            disabled={disabled}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isActive.strikeThrough ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('strikeThrough')}
            disabled={disabled}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            type="button"
            variant={isActive.insertUnorderedList ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('insertUnorderedList')}
            disabled={disabled}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isActive.insertOrderedList ? "secondary" : "ghost"}
            size="sm"
            onClick={() => executeCommand('insertOrderedList')}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Formatting */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatHeading('2')}
            disabled={disabled}
            title="Heading"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertBlockquote}
            disabled={disabled}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertLink}
            disabled={disabled}
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onBlur={handleInput}
        className={cn(
          "min-h-[150px] p-3 focus:outline-none",
          "prose prose-sm max-w-none",
          "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          disabled && "bg-muted cursor-not-allowed"
        )}
        style={{ maxHeight: '400px', overflowY: 'auto' }}
        data-placeholder={placeholder}
      />

      {/* Character count */}
      <div className="flex justify-between items-center px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
        <span>{characterCount} / {maxLength} characters</span>
        {characterCount > maxLength * 0.9 && (
          <span className={characterCount > maxLength ? "text-red-500" : "text-yellow-500"}>
            {characterCount > maxLength ? 'Character limit exceeded' : 'Approaching limit'}
          </span>
        )}
      </div>

      {/* Add styles for placeholder and basic formatting */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}