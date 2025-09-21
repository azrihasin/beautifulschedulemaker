'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, EditorRoot } from 'novel';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import type { JSONContent } from '@/stores/types';
import { useNoteStore } from '@/stores/noteStore';
import { cn } from '@/lib/utils';
import { Mention, Hashtag, extractTagsFromContent } from '@/lib/editor-extensions';

// Re-export EditorContent for external use
export { EditorContent };

interface NoteEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function NoteEditor({
  content,
  onChange,
  placeholder = "Start writing your note...",
  autoFocus = false,
  className
}: NoteEditorProps) {


  // Ensure we always have a valid document structure
  const getValidContent = (content: JSONContent | null): JSONContent => {
    if (!content || !content.type) {
      return { type: 'doc', content: [] };
    }
    return content;
  };

  const [editorContent, setEditorContent] = useState<JSONContent>(getValidContent(content));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { saveNote, currentNote, isLoading } = useNoteStore();

  // Debounced auto-save function
  const debouncedSave = (newContent: JSONContent, tags: string[] = []) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (currentNote) {
        try {
          await saveNote({
            ...currentNote,
            content: newContent,
            tags,
            updatedAt: new Date()
          });
        } catch (error) {
          console.error('Failed to auto-save note:', error);
        }
      }
    }, 2000); // 2-second delay as specified in requirements
  };

  // Handle content changes
  const handleContentChange = (newContent: JSONContent) => {
    setEditorContent(newContent);
    onChange(newContent);
    
    // Extract tags from content for storage
    const tags = newContent ? extractTagsFromContent(newContent) : [];
    
    // Trigger debounced auto-save
    if (newContent && Object.keys(newContent).length > 0) {
      debouncedSave(newContent, tags);
    }
  };

  // Update editor content when prop changes
  useEffect(() => {
    setEditorContent(getValidContent(content));
  }, [content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn(
      "relative w-full min-h-[200px]",
      className
    )}>
      <EditorRoot>
        <EditorContent
          initialContent={editorContent}
          onUpdate={({ editor }: { editor: any }) => {
            const json = editor.getJSON();
            handleContentChange(json);
          }}
          className="w-full min-h-[200px]"
          editorProps={{
            attributes: {
              class: cn(
                "prose mx-auto focus:outline-none",
                "prose-headings:font-title font-default",
                "prose-code:rounded-md prose-code:px-1 prose-code:py-0.5 prose-code:bg-muted",
                "prose-pre:bg-muted prose-pre:border",
                "prose-sm sm:prose-base lg:prose-lg xl:prose-2xl",
                "max-w-none"
              ),
              spellcheck: "false"
            },
            handleDOMEvents: {
              keydown: (_view: any, _event: any) => {
                // Handle special key combinations if needed
                return false;
              }
            }
          }}
          extensions={[
            StarterKit,
            Placeholder.configure({
              placeholder,
            }),
            Mention,
            Hashtag,
          ]}
          autofocus={autoFocus ? "end" : false}
        />
      </EditorRoot>
      
      {/* Loading indicator for auto-save */}
      {isLoading && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Saving...
        </div>
      )}
    </div>
  );
}