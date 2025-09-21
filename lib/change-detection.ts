/**
 * Utility functions for detecting unsaved changes in editors
 */

import type { JSONContent } from '@/stores/types';
import type { ExcalidrawScene } from '@/lib/types/three-view-notes';

/**
 * Deep comparison function for objects
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  // Handle arrays
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }

  // Handle objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize string for comparison (trim whitespace, handle empty strings)
 */
export function normalizeString(str: string | null | undefined): string {
  return (str || '').trim();
}

/**
 * Check if JSONContent has meaningful content
 */
export function hasContentData(content: JSONContent | null): boolean {
  if (!content || !content.content) {
    return false;
  }

  // Check if there's any actual text content
  const hasText = (node: any): boolean => {
    if (node.text && node.text.trim()) {
      return true;
    }
    if (node.content && Array.isArray(node.content)) {
      return node.content.some(hasText);
    }
    return false;
  };

  return content.content.some(hasText);
}

/**
 * Check if Excalidraw scene has meaningful content
 */
export function hasSceneData(scene: ExcalidrawScene | null): boolean {
  if (!scene || !scene.elements) {
    return false;
  }

  // Check if there are any elements (drawings)
  return scene.elements.length > 0;
}

/**
 * Compare two JSONContent objects for changes
 */
export function hasContentChanged(
  original: JSONContent | null,
  current: JSONContent | null
): boolean {
  // If both are empty/null, no change
  if (!hasContentData(original) && !hasContentData(current)) {
    return false;
  }

  // If one has content and the other doesn't, there's a change
  if (hasContentData(original) !== hasContentData(current)) {
    return true;
  }

  // Deep compare the content
  return !deepEqual(original, current);
}

/**
 * Compare two Excalidraw scenes for changes
 */
export function hasSceneChanged(
  original: ExcalidrawScene | null,
  current: ExcalidrawScene | null
): boolean {
  // If both are empty/null, no change
  if (!hasSceneData(original) && !hasSceneData(current)) {
    return false;
  }

  // If one has content and the other doesn't, there's a change
  if (hasSceneData(original) !== hasSceneData(current)) {
    return true;
  }

  // Deep compare the scene data
  return !deepEqual(original, current);
}

/**
 * Compare two titles for changes
 */
export function hasTitleChanged(
  original: string | null | undefined,
  current: string | null | undefined
): boolean {
  const normalizedOriginal = normalizeString(original);
  const normalizedCurrent = normalizeString(current);
  
  return normalizedOriginal !== normalizedCurrent;
}

/**
 * Comprehensive change detection for note editors
 */
export interface ChangeDetectionState {
  originalTitle: string;
  originalContent: JSONContent | null;
  originalScene: ExcalidrawScene | null;
}

export function detectChanges(
  state: ChangeDetectionState,
  currentTitle: string,
  currentContent?: JSONContent | null,
  currentScene?: ExcalidrawScene | null
): boolean {
  // Check title changes
  if (hasTitleChanged(state.originalTitle, currentTitle)) {
    return true;
  }

  // Check content changes (for text editor)
  if (currentContent !== undefined && hasContentChanged(state.originalContent, currentContent)) {
    return true;
  }

  // Check scene changes (for Excalidraw editor)
  if (currentScene !== undefined && hasSceneChanged(state.originalScene, currentScene)) {
    return true;
  }

  return false;
}

/**
 * Create initial state for change detection
 */
export function createChangeDetectionState(
  title: string,
  content?: JSONContent | null,
  scene?: ExcalidrawScene | null
): ChangeDetectionState {
  return {
    originalTitle: normalizeString(title),
    originalContent: content ? JSON.parse(JSON.stringify(content)) : null,
    originalScene: scene ? JSON.parse(JSON.stringify(scene)) : null,
  };
}

/**
 * Update the original state after successful save
 */
export function updateChangeDetectionState(
  state: ChangeDetectionState,
  title: string,
  content?: JSONContent | null,
  scene?: ExcalidrawScene | null
): ChangeDetectionState {
  return {
    originalTitle: normalizeString(title),
    originalContent: content ? JSON.parse(JSON.stringify(content)) : state.originalContent,
    originalScene: scene ? JSON.parse(JSON.stringify(scene)) : state.originalScene,
  };
}