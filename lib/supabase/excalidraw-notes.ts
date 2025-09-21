/**
 * Supabase database operations for Excalidraw Notes
 * 
 * This file contains all database operations for the Three-View Notes System,
 * including CRUD operations, user authentication handling, and data transformations.
 */

import { createClient } from '@/lib/supabase/client';
import { 
  ExcalidrawNote, 
  ExcalidrawNoteInsert, 
  ExcalidrawNoteUpdate,
  NoteCard 
} from '@/lib/supabase/database.types';
import { 
  generatePreviewFromScene, 
  getRandomColorAccent, 
  extractDominantColor,
  sanitizeSceneData,
  validateSceneData,
  convertToNoteCard,
  convertToNoteCards
} from '@/lib/excalidraw-notes-utils';

/**
 * Result type for database operations
 */
export interface DatabaseResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Gets the current authenticated user
 */
async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}

/**
 * Loads all notes for the current user
 */
export async function loadUserNotes(): Promise<DatabaseResult<NoteCard[]>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading notes:', error);
      return { data: null, error: error.message };
    }

    const noteCards = convertToNoteCards(data || []);
    return { data: noteCards, error: null };
  } catch (error) {
    console.error('Error in loadUserNotes:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Loads a specific note by ID
 */
export async function loadNoteById(noteId: string): Promise<DatabaseResult<ExcalidrawNote>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading note:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in loadNoteById:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Creates a new note
 */
export async function createNote(
  title: string, 
  sceneData: any,
  contextType: 'timetable' | 'course' | 'session' = 'timetable',
  contextId: string | null = null
): Promise<DatabaseResult<ExcalidrawNote>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    // Validate and sanitize scene data
    const sanitizedSceneData = validateSceneData(sceneData) 
      ? sanitizeSceneData(sceneData) 
      : { elements: [], appState: { collaborators: new Map() } };

    // Generate preview text and color accent
    const previewText = generatePreviewFromScene(sanitizedSceneData);
    const colorAccent = extractDominantColor(sanitizedSceneData);

    const noteInsert: ExcalidrawNoteInsert = {
      user_id: user.id,
      title: title.trim() || 'Untitled Note',
      excalidraw_data: sanitizedSceneData,
      preview_text: previewText,
      color_accent: colorAccent,
      context_type: contextType,
      context_id: contextId,
    };

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .insert(noteInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createNote:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Updates an existing note
 */
export async function updateNote(
  noteId: string,
  title: string,
  sceneData: any
): Promise<DatabaseResult<ExcalidrawNote>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    // Validate and sanitize scene data
    const sanitizedSceneData = validateSceneData(sceneData) 
      ? sanitizeSceneData(sceneData) 
      : { elements: [], appState: { collaborators: new Map() } };

    // Generate updated preview text and color accent
    const previewText = generatePreviewFromScene(sanitizedSceneData);
    const colorAccent = extractDominantColor(sanitizedSceneData);

    const noteUpdate: ExcalidrawNoteUpdate = {
      title: title.trim() || 'Untitled Note',
      excalidraw_data: sanitizedSceneData,
      preview_text: previewText,
      color_accent: colorAccent,
    };

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .update(noteUpdate)
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in updateNote:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Saves a note (creates new or updates existing)
 */
export async function saveNote(
  noteId: string | null,
  title: string,
  sceneData: any,
  contextType: 'timetable' | 'course' | 'session' = 'timetable',
  contextId: string | null = null
): Promise<DatabaseResult<ExcalidrawNote>> {
  if (noteId) {
    return updateNote(noteId, title, sceneData);
  } else {
    return createNote(title, sceneData, contextType, contextId);
  }
}

/**
 * Deletes a note
 */
export async function deleteNote(noteId: string): Promise<DatabaseResult<boolean>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { error } = await supabase
      .from('excalidraw_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting note:', error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in deleteNote:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Checks if the current user owns a specific note
 */
export async function checkNoteOwnership(noteId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking note ownership:', error);
    return false;
  }
}

/**
 * Gets notes count for the current user
 */
export async function getUserNotesCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { count, error } = await supabase
      .from('excalidraw_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting notes count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUserNotesCount:', error);
    return 0;
  }
}

/**
 * Searches notes by title or preview text
 */
export async function searchNotes(query: string): Promise<DatabaseResult<NoteCard[]>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .select('*')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,preview_text.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error searching notes:', error);
      return { data: null, error: error.message };
    }

    const noteCards = convertToNoteCards(data || []);
    return { data: noteCards, error: null };
  } catch (error) {
    console.error('Error in searchNotes:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Gets notes by context (timetable, course, or session)
 */
export async function getNotesByContext(
  contextType: 'timetable' | 'course' | 'session',
  contextId: string
): Promise<DatabaseResult<NoteCard[]>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('excalidraw_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting notes by context:', error);
      return { data: null, error: error.message };
    }

    const noteCards = convertToNoteCards(data || []);
    return { data: noteCards, error: null };
  } catch (error) {
    console.error('Error in getNotesByContext:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Bulk delete notes
 */
export async function bulkDeleteNotes(noteIds: string[]): Promise<DatabaseResult<boolean>> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { error } = await supabase
      .from('excalidraw_notes')
      .delete()
      .in('id', noteIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error bulk deleting notes:', error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in bulkDeleteNotes:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// All functions are already exported individually above