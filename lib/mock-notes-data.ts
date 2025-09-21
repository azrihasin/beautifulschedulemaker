/**
 * Mock data for testing the Three-View Notes System
 * 
 * This file provides sample note data for development and testing purposes.
 * In production, this data will come from the Supabase database.
 */

import { NoteCard, NOTE_COLOR_PALETTE } from '@/lib/types/three-view-notes';

/**
 * Sample note cards for testing the note list view
 */
const mockNotes: NoteCard[] = [
  {
    id: '1',
    title: 'Physics Lecture Notes',
    preview: 'Quantum mechanics fundamentals - wave-particle duality, uncertainty principle, and Schrödinger equation basics.',
    colorAccent: NOTE_COLOR_PALETTE[0], // Blue
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T14:45:00'),
  },
  {
    id: '2',
    title: 'Math Problem Set',
    preview: 'Calculus derivatives and integrals practice problems. Focus on chain rule and integration by parts.',
    colorAccent: NOTE_COLOR_PALETTE[1], // Red
    createdAt: new Date('2024-01-14T09:15:00'),
    updatedAt: new Date('2024-01-14T16:20:00'),
  },
  {
    id: '3',
    title: 'Chemistry Lab Report',
    preview: 'Organic synthesis experiment results. Yield calculations and spectroscopy analysis.',
    colorAccent: NOTE_COLOR_PALETTE[2], // Green
    createdAt: new Date('2024-01-13T13:00:00'),
    updatedAt: new Date('2024-01-13T17:30:00'),
  },
  {
    id: '4',
    title: 'Project Ideas',
    preview: 'Brainstorming session for final project. Machine learning applications in healthcare.',
    colorAccent: NOTE_COLOR_PALETTE[4], // Purple
    createdAt: new Date('2024-01-12T11:45:00'),
    updatedAt: new Date('2024-01-12T15:10:00'),
  },
  {
    id: '5',
    title: 'Study Schedule',
    preview: 'Weekly study plan with time blocks for each subject. Exam preparation timeline.',
    colorAccent: NOTE_COLOR_PALETTE[3], // Yellow
    createdAt: new Date('2024-01-11T08:30:00'),
    updatedAt: new Date('2024-01-11T12:00:00'),
  },
];

/**
 * Simulates loading notes from the database
 * Includes artificial delay to test loading states
 */
export async function loadMockNotes(): Promise<NoteCard[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simulate occasional errors for testing error states
  if (Math.random() < 0.1) { // 10% chance of error
    throw new Error('Failed to load notes from server');
  }
  
  // Return sorted notes (most recently updated first)
  return [...mockNotes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Simulates creating a new note
 */
export async function createMockNote(title: string = 'Untitled Note'): Promise<NoteCard> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const now = new Date();
  const randomColor = NOTE_COLOR_PALETTE[Math.floor(Math.random() * NOTE_COLOR_PALETTE.length)];
  
  const newNote: NoteCard = {
    id: `mock-${Date.now()}`,
    title,
    preview: 'New visual note created with Excalidraw',
    colorAccent: randomColor,
    createdAt: now,
    updatedAt: now,
  };
  
  return newNote;
}

/**
 * Simulates updating an existing note
 */
export async function updateMockNote(noteId: string, updates: Partial<NoteCard>): Promise<NoteCard> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const existingNote = mockNotes.find(note => note.id === noteId);
  if (!existingNote) {
    throw new Error(`Note with id ${noteId} not found`);
  }
  
  const updatedNote: NoteCard = {
    ...existingNote,
    ...updates,
    updatedAt: new Date(),
  };
  
  return updatedNote;
}

/**
 * Simulates deleting a note
 */
export async function deleteMockNote(noteId: string): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const noteIndex = mockNotes.findIndex(note => note.id === noteId);
  if (noteIndex === -1) {
    throw new Error(`Note with id ${noteId} not found`);
  }
  
  // In a real implementation, this would remove from database
  // For mock data, we just simulate the operation
}

/**
 * Gets a single mock note by ID
 */
export function getMockNoteById(noteId: string): NoteCard | null {
  return mockNotes.find(note => note.id === noteId) || null;
}

/**
 * Generates random mock notes for testing large lists
 */
export function generateMockNotes(count: number): NoteCard[] {
  const titles = [
    'Lecture Notes',
    'Lab Report',
    'Study Guide',
    'Project Ideas',
    'Meeting Notes',
    'Research Notes',
    'Assignment Draft',
    'Exam Prep',
    'Reading Summary',
    'Brainstorming',
  ];
  
  const previews = [
    'Important concepts and key takeaways from today\'s session.',
    'Detailed analysis and experimental results with conclusions.',
    'Comprehensive review material for upcoming assessments.',
    'Creative solutions and innovative approaches to consider.',
    'Action items and decisions from team collaboration.',
    'Literature review and theoretical framework development.',
    'Initial draft with outline and supporting arguments.',
    'Practice problems and review of challenging topics.',
    'Summary of key points and critical analysis.',
    'Mind map of ideas and potential connections.',
  ];
  
  const notes: NoteCard[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomPreview = previews[Math.floor(Math.random() * previews.length)];
    const randomColor = NOTE_COLOR_PALETTE[Math.floor(Math.random() * NOTE_COLOR_PALETTE.length)];
    
    // Generate random dates within the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    const updatedAt = new Date(createdAt);
    updatedAt.setHours(updatedAt.getHours() + Math.floor(Math.random() * 24));
    
    notes.push({
      id: `generated-${i}`,
      title: `${randomTitle} ${i + 1}`,
      preview: randomPreview,
      colorAccent: randomColor,
      createdAt,
      updatedAt,
    });
  }
  
  return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}