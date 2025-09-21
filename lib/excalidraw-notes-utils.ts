/**
 * Utility functions for Excalidraw Notes System
 * 
 * This file contains helper functions for working with Excalidraw scenes,
 * generating previews, managing colors, and handling data transformations.
 */

import { 
  ExcalidrawNote, 
  NoteCard, 
  ExcalidrawScene,
  NOTE_COLOR_PALETTE,
  DEFAULT_PREVIEW_LENGTH,
  DEFAULT_COLOR_ACCENT,
  NoteColorAccent
} from '@/lib/types/three-view-notes';

/**
 * Generates a text preview from Excalidraw scene data
 * Extracts text elements and creates a readable preview
 */
export function generatePreviewFromScene(sceneData: any): string {
  try {
    if (!sceneData || !sceneData.elements) {
      return '';
    }

    // Extract text elements from Excalidraw scene
    const textElements = sceneData.elements.filter(
      (element: any) => element.type === 'text' && element.text && !element.isDeleted
    );

    if (textElements.length === 0) {
      // Check if there are other visual elements
      const visualElements = sceneData.elements.filter(
        (element: any) => !element.isDeleted && element.type !== 'text'
      );
      
      if (visualElements.length > 0) {
        return 'Visual note with drawings';
      }
      
      return 'Empty note';
    }

    // Sort text elements by position (top to bottom, left to right)
    const sortedTextElements = textElements.sort((a: any, b: any) => {
      if (Math.abs(a.y - b.y) < 10) {
        // Same line, sort by x position
        return a.x - b.x;
      }
      // Different lines, sort by y position
      return a.y - b.y;
    });

    // Combine all text content with proper spacing
    const allText = sortedTextElements
      .map((element: any) => element.text.trim())
      .filter((text: string) => text.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!allText) {
      return 'Visual note with drawings';
    }

    // Truncate to preview length
    if (allText.length <= DEFAULT_PREVIEW_LENGTH) {
      return allText;
    }

    // Find a good breaking point near the limit
    const truncated = allText.substring(0, DEFAULT_PREVIEW_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > DEFAULT_PREVIEW_LENGTH * 0.8) {
      return truncated.substring(0, lastSpace).trim() + '...';
    }
    
    return truncated.trim() + '...';
  } catch (error) {
    console.error('Error generating preview from scene:', error);
    return 'Visual note';
  }
}

/**
 * Gets a random color accent from the predefined palette
 */
export function getRandomColorAccent(): NoteColorAccent {
  const randomIndex = Math.floor(Math.random() * NOTE_COLOR_PALETTE.length);
  return NOTE_COLOR_PALETTE[randomIndex];
}

/**
 * Validates Excalidraw scene data structure
 */
export function validateSceneData(data: any): boolean {
  try {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required Excalidraw structure
    if (!Array.isArray(data.elements)) {
      return false;
    }

    // Validate each element has required properties
    for (const element of data.elements) {
      if (!element.id || !element.type) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating scene data:', error);
    return false;
  }
}

/**
 * Creates an empty Excalidraw scene for new notes
 */
export function createEmptyScene(): ExcalidrawScene {
  return {
    elements: [],
    appState: {
      gridSize: null,
      viewBackgroundColor: '#ffffff',
      collaborators: new Map(),
    },
  };
}

/**
 * Converts database row to NoteCard for list view
 */
export function convertToNoteCard(note: ExcalidrawNote): NoteCard {
  return {
    id: note.id,
    title: note.title,
    preview: note.preview_text || generatePreviewFromScene(note.excalidraw_data),
    colorAccent: note.color_accent || DEFAULT_COLOR_ACCENT,
    createdAt: new Date(note.created_at),
    updatedAt: new Date(note.updated_at),
  };
}

/**
 * Converts array of database rows to NoteCard array
 */
export function convertToNoteCards(notes: ExcalidrawNote[]): NoteCard[] {
  return notes.map(convertToNoteCard);
}

/**
 * Extracts dominant color from Excalidraw scene for accent color
 * Falls back to random color if no colors found
 */
export function extractDominantColor(sceneData: any): NoteColorAccent {
  try {
    if (!sceneData || !sceneData.elements) {
      return getRandomColorAccent();
    }

    // Collect all colors used in the scene (excluding deleted elements)
    const colors: string[] = [];
    
    sceneData.elements.forEach((element: any) => {
      if (element.isDeleted) return;
      
      // Weight stroke colors more heavily as they're more visible
      if (element.strokeColor && element.strokeColor !== 'transparent' && element.strokeColor !== '#000000') {
        colors.push(element.strokeColor);
        colors.push(element.strokeColor); // Add twice for more weight
      }
      
      if (element.backgroundColor && element.backgroundColor !== 'transparent' && element.backgroundColor !== '#ffffff') {
        colors.push(element.backgroundColor);
      }
    });

    if (colors.length === 0) {
      return getRandomColorAccent();
    }

    // Find the most common color
    const colorCounts: { [key: string]: number } = {};
    colors.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    const mostCommonColor = Object.keys(colorCounts).reduce((a, b) =>
      colorCounts[a] > colorCounts[b] ? a : b
    );

    // Check if the most common color is in our palette
    if (NOTE_COLOR_PALETTE.includes(mostCommonColor as NoteColorAccent)) {
      return mostCommonColor as NoteColorAccent;
    }

    // Find closest color in palette using simple color distance
    const targetColor = hexToRgb(mostCommonColor);
    if (!targetColor) {
      return getRandomColorAccent();
    }

    let closestColor = NOTE_COLOR_PALETTE[0];
    let minDistance = Infinity;

    NOTE_COLOR_PALETTE.forEach(paletteColor => {
      const paletteRgb = hexToRgb(paletteColor);
      if (paletteRgb) {
        const distance = colorDistance(targetColor, paletteRgb);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = paletteColor;
        }
      }
    });

    return closestColor;
  } catch (error) {
    console.error('Error extracting dominant color:', error);
    return getRandomColorAccent();
  }
}

/**
 * Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculates color distance between two RGB colors
 */
function colorDistance(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
}

/**
 * Sanitizes and prepares scene data for database storage
 */
export function sanitizeSceneData(sceneData: any): any {
  try {
    if (!validateSceneData(sceneData)) {
      return createEmptyScene();
    }

    // Remove any potentially problematic properties
    const sanitized = {
      elements: sceneData.elements.map((element: any) => ({
        ...element,
        // Remove any functions or non-serializable data
        // Keep only essential Excalidraw properties
      })),
      appState: {
        ...sceneData.appState,
        // Remove UI-specific state that shouldn't be persisted
        selectedElementIds: {},
        selectedGroupIds: {},
        editingGroupId: null,
        editingElement: null,
      },
    };

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing scene data:', error);
    return createEmptyScene();
  }
}

/**
 * Generates a unique title for a new note based on content or timestamp
 */
export function generateNoteTitle(sceneData: any): string {
  try {
    // Try to extract first meaningful text element as title
    if (sceneData && sceneData.elements) {
      // Sort text elements by position (top-left first)
      const textElements = sceneData.elements
        .filter((element: any) => element.type === 'text' && element.text && !element.isDeleted)
        .sort((a: any, b: any) => {
          if (Math.abs(a.y - b.y) < 10) {
            return a.x - b.x; // Same line, sort by x
          }
          return a.y - b.y; // Different lines, sort by y
        });

      for (const element of textElements) {
        const text = element.text.trim();
        if (text.length > 0) {
          // Use first line or first 30 characters as title
          const firstLine = text.split('\n')[0].trim();
          if (firstLine.length > 0) {
            if (firstLine.length <= 30) {
              return firstLine;
            }
            // Find a good breaking point
            const truncated = firstLine.substring(0, 27);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 15) {
              return truncated.substring(0, lastSpace) + '...';
            }
            return truncated + '...';
          }
        }
      }
    }

    // Fallback to timestamp-based title
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `Note ${dateStr} ${timeStr}`;
  } catch (error) {
    console.error('Error generating note title:', error);
    return 'Untitled Note';
  }
}

/**
 * Calculates the size of scene data in bytes for storage optimization
 */
export function calculateSceneSize(sceneData: any): number {
  try {
    const jsonString = JSON.stringify(sceneData);
    return new Blob([jsonString]).size;
  } catch (error) {
    console.error('Error calculating scene size:', error);
    return 0;
  }
}

/**
 * Compresses scene data by removing unnecessary precision from coordinates
 */
export function compressSceneData(sceneData: any): any {
  try {
    if (!sceneData || !sceneData.elements) {
      return sceneData;
    }

    const compressed = {
      ...sceneData,
      elements: sceneData.elements.map((element: any) => ({
        ...element,
        // Round coordinates to reduce precision and file size
        x: Math.round(element.x * 100) / 100,
        y: Math.round(element.y * 100) / 100,
        width: Math.round(element.width * 100) / 100,
        height: Math.round(element.height * 100) / 100,
      })),
    };

    return compressed;
  } catch (error) {
    console.error('Error compressing scene data:', error);
    return sceneData;
  }
}

/**
 * Checks if a scene has any meaningful content
 */
export function hasContent(sceneData: any): boolean {
  try {
    if (!sceneData || !sceneData.elements) {
      return false;
    }

    // Check if there are any visible elements
    const visibleElements = sceneData.elements.filter(
      (element: any) => !element.isDeleted && element.opacity > 0
    );

    return visibleElements.length > 0;
  } catch (error) {
    console.error('Error checking scene content:', error);
    return false;
  }
}

/**
 * Creates a backup of scene data for recovery purposes
 */
export function createSceneBackup(sceneData: any): string {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      data: sanitizeSceneData(sceneData),
    };
    return JSON.stringify(backup);
  } catch (error) {
    console.error('Error creating scene backup:', error);
    return '{}';
  }
}

/**
 * Restores scene data from backup
 */
export function restoreFromBackup(backupString: string): any {
  try {
    const backup = JSON.parse(backupString);
    if (backup.data && validateSceneData(backup.data)) {
      return backup.data;
    }
    return createEmptyScene();
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return createEmptyScene();
  }
}