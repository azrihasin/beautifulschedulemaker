export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      timetables: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "timetables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      timetable_chats: {
        Row: {
          id: string
          timetable_id: string
          name: string
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          timetable_id: string
          name: string
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          timetable_id?: string
          name?: string
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_chats_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          user_id: string
          timetable_id: string
          code: string
          name: string
          color: string
          sessions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timetable_id: string
          code: string
          name: string
          color?: string
          sessions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timetable_id?: string
          code?: string
          name?: string
          color?: string
          sessions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          timetable_id: string
          course_id: string | null
          session_id: string | null
          content: Json
          is_pinned: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timetable_id: string
          course_id?: string | null
          session_id?: string | null
          content?: Json
          is_pinned?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timetable_id?: string
          course_id?: string | null
          session_id?: string | null
          content?: Json
          is_pinned?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      excalidraw_notes: {
        Row: {
          id: string
          user_id: string
          title: string
          excalidraw_data: Json
          preview_text: string
          color_accent: string
          created_at: string
          updated_at: string
          context_type: string
          context_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          excalidraw_data?: Json
          preview_text?: string
          color_accent?: string
          created_at?: string
          updated_at?: string
          context_type?: string
          context_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          excalidraw_data?: Json
          preview_text?: string
          color_accent?: string
          created_at?: string
          updated_at?: string
          context_type?: string
          context_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excalidraw_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for working with the database
export type Timetable = Database['public']['Tables']['timetables']['Row']
export type TimetableInsert = Database['public']['Tables']['timetables']['Insert']
export type TimetableUpdate = Database['public']['Tables']['timetables']['Update']

export type TimetableChat = Database['public']['Tables']['timetable_chats']['Row']
export type TimetableChatInsert = Database['public']['Tables']['timetable_chats']['Insert']
export type TimetableChatUpdate = Database['public']['Tables']['timetable_chats']['Update']

export type Course = Database['public']['Tables']['courses']['Row']
export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']

export type ExcalidrawNote = Database['public']['Tables']['excalidraw_notes']['Row']
export type ExcalidrawNoteInsert = Database['public']['Tables']['excalidraw_notes']['Insert']
export type ExcalidrawNoteUpdate = Database['public']['Tables']['excalidraw_notes']['Update']

// Chat message type for the JSONB messages field
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Course session interface for type safety
export interface CourseSession {
  session_id: string
  days: string[]
  startTime: string
  endTime: string
  location: string
}

// Course session input interface for creating courses (session_id is optional)
export interface CourseSessionInput {
  session_id?: string
  days: string[]
  startTime: string
  endTime: string
  location: string
}

// Extended course interface with parsed sessions
export interface CourseWithSessions extends Omit<Course, 'sessions'> {
  sessions: CourseSession[]
}

// Extended course input interface for creating courses
export interface CourseWithSessionsInput extends Omit<Course, 'sessions' | 'id' | 'created_at' | 'updated_at' | 'user_id' | 'timetable_id'> {
  sessions: CourseSessionInput[]
}

// Excalidraw scene data interface for type safety
export interface ExcalidrawSceneData {
  elements: any[]
  appState: any
  files?: { [key: string]: any }
}

// Note card interface for the three-view notes system list view
export interface NoteCard {
  id: string
  title: string
  preview: string // Truncated text preview
  colorAccent: string // Left border color
  createdAt: Date
  updatedAt: Date
}

// Context type for excalidraw notes
export type ExcalidrawNoteContextType = 'timetable' | 'course' | 'session'

// Enhanced ExcalidrawNote interface with parsed data
export interface ExcalidrawNoteWithParsedData extends Omit<ExcalidrawNote, 'excalidraw_data' | 'created_at' | 'updated_at'> {
  excalidraw_data: ExcalidrawSceneData
  created_at: Date
  updated_at: Date
}