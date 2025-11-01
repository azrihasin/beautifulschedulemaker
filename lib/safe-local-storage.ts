import { StateStorage } from 'zustand/middleware';

export const safeLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};