'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { ExcalidrawNoteEditorProps, ExcalidrawScene } from '@/lib/types/three-view-notes';
import { createEmptyScene, validateSceneData } from '@/lib/excalidraw-notes-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { EditorHeader } from '@/components/editor-header';
import { useExcalidrawNoteStore } from '@/stores';
import { 
  createChangeDetectionState, 
  updateChangeDetectionState, 
  detectChanges,
  type ChangeDetectionState 
} from '@/lib/change-detection';
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

// Import Excalidraw CSS for proper rendering in Next.js
import '@excalidraw/excalidraw/index.css';

// Custom styles for Excalidraw
const customExcalidrawStyles = `
  .excalidraw .SVGLayer {
    pointer-events: none !important;
    width: 100% !important;
    height: 100% !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: var(--zIndex-svgLayer) !important;
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customExcalidrawStyles;
  document.head.appendChild(styleElement);
}

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => {
    return import('@excalidraw/excalidraw').then((mod) => {
      return { default: mod.Excalidraw };
    }).catch((error) => {
      console.error('Failed to load Excalidraw module:', error);
      // Return a fallback component
      return {
        default: () => (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load drawing canvas</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      };
    });
  },
  {
    ssr: false,
    loading: () => <ExcalidrawSkeleton />,
  }
);

// Loading skeleton component for Excalidraw
function ExcalidrawSkeleton() {
  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex-1 relative">
        <Skeleton className="w-full h-full rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading Excalidraw...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary component for Excalidraw
function ExcalidrawError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Alert className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>Failed to load the drawing canvas.</p>
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function ExcalidrawNoteEditor({
  isVisible,
  noteId,
  onBack,
  onSave,
  className,
}: ExcalidrawNoteEditorProps) {
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sceneData, setSceneData] = useState<ExcalidrawScene>(createEmptyScene());
  const [noteTitle, setNoteTitle] = useState('Untitled Note');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [changeDetectionState, setChangeDetectionState] = useState<ChangeDetectionState>(
    createChangeDetectionState('Untitled Note', null, createEmptyScene())
  );
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isSystemUpdate, setIsSystemUpdate] = useState(false);

  // Memoized Excalidraw configuration
  const excalidrawConfig = useMemo(() => ({
    UIOptions: {
      canvasActions: {
        loadScene: true,
        saveToActiveFile: true,
        export: {
          saveFileToDisk: true,
        },
        saveAsImage: true,
      },
      tools: {
        image: true,
      },
    },
    theme: 'light' as const,
    langCode: 'en' as const,
    viewModeEnabled: false,
    zenModeEnabled: false,
    gridModeEnabled: false,
  }), []);

  // Access the store
  const { loadNote, currentNote, deleteNote } : any = useExcalidrawNoteStore();

  // Load note data when component mounts or noteId changes
  useEffect(() => {
    if (!isVisible) return;
    
    const loadNoteData = async () => {
      if (noteId) {
        // Load existing note
        setIsLoading(true);
        try {
          await loadNote(noteId);
        } catch (error) {
          console.error('Failed to load note:', error);
          setHasError(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Initialize with empty scene for new note
        setSceneData(createEmptyScene());
        setNoteTitle('Untitled Note');
        setIsLoading(false);
        setHasUnsavedChanges(false);
      }
    };
    
    loadNoteData();
  }, [isVisible, noteId, loadNote]);

  // Update local state when currentNote changes
  useEffect(() => {
    setIsSystemUpdate(true);
    
    if (currentNote && noteId) {
      const title = currentNote.title;
      const scene = currentNote.scene_data || createEmptyScene();
      
      setNoteTitle(title);
      setSceneData(scene);
      
      // Reset change detection state with the loaded data
      const newChangeState = createChangeDetectionState(title, null, scene);
      setChangeDetectionState(newChangeState);
      setHasUnsavedChanges(false);
    } else if (!noteId) {
      // For new notes, initialize with empty state
      const emptyScene = createEmptyScene();
      const title = 'Untitled Note';
      
      setNoteTitle(title);
      setSceneData(emptyScene);
      
      const newChangeState = createChangeDetectionState(title, null, emptyScene);
      setChangeDetectionState(newChangeState);
      setHasUnsavedChanges(false);
    }
    
    // Reset system update flag after a short delay to allow Excalidraw to settle
    setTimeout(() => {
      setIsSystemUpdate(false);
    }, 100);
  }, [currentNote, noteId]);

  // Handle Excalidraw scene changes
  const handleSceneChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    const newSceneData = { elements: [...elements], appState };
    
    // Validate the scene data
    if (validateSceneData(newSceneData)) {
      setSceneData(newSceneData);
      
      // Only check for changes if this is not a system update and user is interacting
      if (!isSystemUpdate && isUserInteracting) {
        // Debounce the change detection to avoid rapid updates
        setTimeout(() => {
          // Check if there are actual changes compared to the original state
          const hasChanges = detectChanges(
            changeDetectionState,
            noteTitle,
            undefined, // no content for Excalidraw editor
            newSceneData
          );
          setHasUnsavedChanges(hasChanges);
        }, 300);
      }
    }
  }, [changeDetectionState, noteTitle, isSystemUpdate, isUserInteracting]);

  // Handle save operation
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave(noteTitle, sceneData);
      
      // Update change detection state after successful save
      const newChangeState = updateChangeDetectionState(
        changeDetectionState,
        noteTitle,
        undefined, // no content for Excalidraw editor
        sceneData
      );
      setChangeDetectionState(newChangeState);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [noteTitle, sceneData, onSave, isSaving, changeDetectionState]);

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setNoteTitle(newTitle);
    
    // Check if there are actual changes compared to the original state
    const hasChanges = detectChanges(
      changeDetectionState,
      newTitle,
      undefined, // no content for Excalidraw editor
      sceneData
    );
    setHasUnsavedChanges(hasChanges);
  }, [changeDetectionState, sceneData]);

  // Handle back navigation with unsaved changes warning
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      return;
    }
    onBack();
  }, [hasUnsavedChanges, onBack]);

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    onBack();
  }, [onBack]);
  
  // Handle cancel discard
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // Handle delete note
  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  // Handle confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!noteId) return;
    
    try {
      setIsDeleting(true);
      await deleteNote(noteId);
      setShowDeleteDialog(false);
      onBack();
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [noteId, deleteNote, onBack]);

  // Handle cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSave();
        }
      }
      
      // Escape to go back
      if (event.key === 'Escape') {
        handleBack();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, hasUnsavedChanges, isSaving, handleSave, handleBack]);

  // Retry loading on error
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    // Trigger re-load by updating a dependency
    setSceneData(createEmptyScene());
    setIsLoading(false);
  }, []);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Render the main component
  const mainComponent = (
    <div 
      className={cn(
        "w-full flex flex-col bg-background overflow-hidden h-[calc(100vh-5rem)]", // Account for top navigation (5rem) and add padding (20 = 5rem)
        className
      )}
      role="region"
      aria-label="Drawing canvas"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between flex-shrink-0 h-16">
        <EditorHeader
          title={noteTitle}
          onTitleChange={handleTitleChange}
          onBack={handleBack}
          onSave={handleSave}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          canDelete={!!noteId}
          className="flex-1"
        />
      </div>

      {/* Excalidraw Canvas */}
      <div 
        className="flex-1 w-full overflow-hidden bg-white p-4"
        onPointerDown={() => setIsUserInteracting(true)}
        onPointerUp={() => setTimeout(() => setIsUserInteracting(false), 100)}
        onKeyDown={() => setIsUserInteracting(true)}
        onKeyUp={() => setTimeout(() => setIsUserInteracting(false), 100)}
      >
        {isLoading ? (
          <ExcalidrawSkeleton />
        ) : hasError ? (
          <ExcalidrawError onRetry={handleRetry} />
        ) : (
          <Excalidraw
            initialData={{
              elements: sceneData.elements,
              appState: {
                ...sceneData.appState,
                viewBackgroundColor: '#ffffff',
                collaborators:
                  sceneData?.appState?.collaborators instanceof Map
                    ? sceneData.appState.collaborators
                    : new Map(),
              },
            }}
            onChange={handleSceneChange}
            UIOptions={excalidrawConfig.UIOptions}
            theme={excalidrawConfig.theme}
            langCode={excalidrawConfig.langCode}
            viewModeEnabled={excalidrawConfig.viewModeEnabled}
            zenModeEnabled={excalidrawConfig.zenModeEnabled}
            gridModeEnabled={excalidrawConfig.gridModeEnabled}
          />
        )}
      </div>

      {/* Status indicator for unsaved changes */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-center p-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Unsaved changes</span>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to go back? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscard}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return mainComponent;
}

export default ExcalidrawNoteEditor;