import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "../lib/supabase/client";
import { generateChatName, shouldAutoRename } from "../utils/chat-naming";
import { default_courses } from "../utils/example_courses";
import type { 
  TimetableStore, 
  Timetable, 
  Chat, 
  ChatMessage, 
  DatabaseTimetable, 
  DatabaseChat 
} from "./types";
import { UIMessage } from "ai";

// Background sync configuration
const BACKGROUND_SYNC_DELAY = 1000; // 1 second delay for background sync

// Utility functions for data transformation
const transformDatabaseTimetable = (dbTimetable: DatabaseTimetable): Timetable => ({
  id: dbTimetable.id,
  name: dbTimetable.name,
  userId: dbTimetable.user_id,
  createdAt: new Date(dbTimetable.created_at),
  updatedAt: new Date(dbTimetable.updated_at),
  isActive: dbTimetable.is_active,
});

const transformDatabaseChat = (dbChat: DatabaseChat): Chat => ({
  id: dbChat.id,
  timetableId: dbChat.timetable_id,
  name: dbChat.name,
  messages: Array.isArray(dbChat.messages) ? dbChat.messages : [],
  createdAt: new Date(dbChat.created_at),
  updatedAt: new Date(dbChat.updated_at),
});

// Utility functions removed - no longer using IndexedDB cache

// Set to track ongoing chat creations to prevent duplicates
const ongoingChatCreations = new Set<string>();

// Retry mechanism for Supabase operations
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Serialization helpers for Date objects
const serializeState = (state: TimetableStore) => {
  return {
    ...state,
    timetables: (state.timetables || []).map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    })),
    chats: (state.chats || []).map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: (c.messages || []).map(m => ({
        ...m,
      }))
    }))
  };
};

const deserializeState = (state: any): TimetableStore => {
  return {
    ...state,
    timetables: (state.timetables || []).map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    })),
    chats: (state.chats || []).map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: (c.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }))
  };
};

export const useTimetableStore = create<TimetableStore>()(
  isBrowser ? persist(
    (set, get) => ({
  timetables: [],
  chats: [],
  activeTimetableId: null,
  activeChatId: null,
  isLoading: false,
  error: null,
  renamingChats: new Set<string>(),

  // Error handling
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  // Renaming animation helpers
  startRenamingAnimation: (chatId: string) => {
    set((state) => ({
      renamingChats: new Set([...state.renamingChats, chatId])
    }));
  },
  
  stopRenamingAnimation: (chatId: string) => {
    set((state) => {
      const newRenamingChats = new Set(state.renamingChats);
      newRenamingChats.delete(chatId);
      return { renamingChats: newRenamingChats };
    });
  },

  // Timetable actions
  createTimetable: async (): Promise<Timetable> => {
    set({ isLoading: true, error: null });
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        throw new Error('User not authenticated');
      }

      const { timetables } = get();
      const timetableCount = timetables.length + 1;
      const name = `Timetable ${timetableCount}`;

      const newTimetable: Omit<DatabaseTimetable, 'created_at' | 'updated_at'> = {
        id: uuidv4(),
        user_id: user.id,
        name,
        is_active: true,
      };

      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetables')
          .insert(newTimetable)
          .select()
          .single();
        return response;
      });
      
      const { data, error } = result;

      if (error) throw error;

      const timetable = transformDatabaseTimetable(data);
      
      set((state) => ({
        timetables: [...state.timetables, timetable],
        activeTimetableId: timetable.id,
        isLoading: false,
      }));

      // Add default courses to the new timetable
      try {
        for (const courseData of default_courses) {
          const courseWithRelations = {
            ...courseData,
            user_id: user.id,
            timetable_id: timetable.id
          };
          
          await supabase
            .from('courses')
            .insert(courseWithRelations);
        }
      } catch (courseError) {
        console.warn('Failed to add default courses:', courseError);
        // Don't throw error - timetable creation should still succeed
      }

      // Cache invalidation removed - no longer using IndexedDB

      return timetable;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create timetable';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  renameTimetable: async (id: string, name: string): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();
      
      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetables')
          .update({ 
            name, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        return response;
      });
      
      const { error } = result;

      if (error) throw error;

      set((state) => ({
        timetables: state.timetables.map((timetable) =>
          timetable.id === id 
            ? { ...timetable, name, updatedAt: new Date() }
            : timetable
        ),
      }));

      // Cache invalidation removed - no longer using IndexedDB
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename timetable';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteTimetable: async (id: string): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();
      
      // Delete associated chats first (cascade should handle this, but being explicit)
      await withRetry(async () => {
        const response = await supabase
          .from('timetable_chats')
          .delete()
          .eq('timetable_id', id);
        return response;
      });

      // Delete the timetable
      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetables')
          .delete()
          .eq('id', id);
        return response;
      });
      
      const { error } = result;

      if (error) throw error;

      set((state) => ({
        timetables: state.timetables.filter((timetable) => timetable.id !== id),
        chats: state.chats.filter((chat) => chat.timetableId !== id),
        activeTimetableId: state.activeTimetableId === id ? null : state.activeTimetableId,
        activeChatId: state.chats.some(chat => chat.timetableId === id && chat.id === state.activeChatId) 
          ? null 
          : state.activeChatId,
      }));

      // Invalidate cache for this user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Cache invalidation removed - no longer using IndexedDB
      } catch (cacheError) {
        console.warn('Failed to invalidate cache:', cacheError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete timetable';
      set({ error: errorMessage });
      throw error;
    }
  },

  setActiveTimetable: (id: string) => {
    set({ activeTimetableId: id });
  },

  // Chat actions
  // Create a temporary chat that exists only in memory until first message is sent
  createTemporaryChat: (timetableId: string): Chat => {
    const { chats } = get();
    const timetableChats = chats.filter(chat => chat.timetableId === timetableId);
    const chatCount = timetableChats.length + 1;
    
    const tempChat: Chat = {
      id: `temp-${uuidv4()}`,
      timetableId,
      name: `Chat ${chatCount}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state) => ({
      activeChatId: tempChat.id,
      // Don't add to chats array yet - only add when first message is sent
    }));
    
    return tempChat;
  },

  // Convert temporary chat to permanent chat and save to database
  persistTemporaryChat: async (tempChatId: string, firstMessageText: string): Promise<Chat> => {
    set({ isLoading: true, error: null });
    
    try {
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        set({ error: 'Authentication failed', isLoading: false });
        throw new Error('Authentication failed');
      }
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        throw new Error('User not authenticated');
      }
      
      // Get timetable ID from temp chat ID pattern
      const { activeTimetableId } = get();
      if (!activeTimetableId) {
        throw new Error('No active timetable');
      }
      
      // Generate chat name with emoji based on first message
      const chatName = generateChatName(firstMessageText);
      
      const newChat: Omit<DatabaseChat, 'created_at' | 'updated_at'> = {
        id: uuidv4(), // Generate new permanent ID
        timetable_id: activeTimetableId,
        name: chatName,
        messages: [],
      };

      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetable_chats')
          .insert(newChat)
          .select()
          .single();
        return response;
      });
      
      const { data, error } = result;

      if (error) {
        throw error;
      }

      const chat = transformDatabaseChat(data);
      
      set((state) => ({
        chats: [...state.chats, chat],
        activeChatId: chat.id,
        isLoading: false,
      }));

      return chat;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  createChat: async (timetableId: string, name?: string): Promise<Chat> => {
    // Check if a chat creation is already in progress for this timetable
    if (ongoingChatCreations.has(timetableId)) {
      // Wait for the ongoing creation to complete and return the existing chat
      const { chats } = get();
      const existingChat = chats.find(chat => chat.timetableId === timetableId);
      if (existingChat) {
        return existingChat;
      }
      throw new Error('Chat creation already in progress');
    }

    // Mark this timetable as having an ongoing chat creation
    ongoingChatCreations.add(timetableId);
    
    set({ isLoading: true, error: null });
    
    try {
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        set({ error: 'Authentication failed', isLoading: false });
        throw new Error('Authentication failed');
      }
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        throw new Error('User not authenticated');
      }
      
      const { chats } = get();
      const timetableChats = chats.filter(chat => chat.timetableId === timetableId);
      const chatCount = timetableChats.length + 1;
      const chatName = name || `Chat ${chatCount}`;

      const newChat: Omit<DatabaseChat, 'created_at' | 'updated_at'> = {
        id: uuidv4(),
        timetable_id: timetableId,
        name: chatName,
        messages: [],
      };

      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetable_chats')
          .insert(newChat)
          .select()
          .single();
        return response;
      });
      
      const { data, error } = result;

      if (error) {
        throw error;
      }

      const chat = transformDatabaseChat(data);
      
      set((state) => ({
        chats: [...state.chats, chat],
        activeChatId: chat.id,
        isLoading: false,
      }));

      // Cache invalidation removed - no longer using IndexedDB

      return chat;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat';
      set({ error: errorMessage, isLoading: false });
      throw error;
    } finally {
      // Always remove the timetable from ongoing creations
      ongoingChatCreations.delete(timetableId);
    }
  },

  renameChat: async (id: string, name: string): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();
      
      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetable_chats')
          .update({ 
            name, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        return response;
      });
      
      const { error } = result;

      if (error) throw error;

      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === id 
            ? { ...chat, name, updatedAt: new Date() }
            : chat
        ),
      }));

      // Cache invalidation removed - no longer using IndexedDB
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename chat';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteChat: async (id: string): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();
      
      const result = await withRetry(async () => {
        const response = await supabase
          .from('timetable_chats')
          .delete()
          .eq('id', id);
        return response;
      });
      
      const { error } = result;

      if (error) throw error;

      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== id),
        activeChatId: state.activeChatId === id ? null : state.activeChatId,
      }));

      // Cache invalidation removed - no longer using IndexedDB
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete chat';
      set({ error: errorMessage });
      throw error;
    }
  },

  setActiveChat: (id: string) => {
    set({ activeChatId: id });
  },

  clearActiveChat: () => {
    set({ activeChatId: null });
  },

  addMessage: async (chatId: string, message:UIMessage): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();
      
      const newMessage: UIMessage = {
        ...message
      };
      
      const { chats } = get();
      const chat = chats.find(c => c.id === chatId);
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const updatedMessages = [...chat.messages, newMessage];
      
      // Check if this is the first user message and auto-rename if needed
      const isFirstUserMessage = newMessage.role === 'user' && 
        chat.messages.filter(msg => msg.role === 'user').length === 0;
      
      let updatedChatName = chat.name;
      let shouldStartAnimation = false;
      if (isFirstUserMessage && shouldAutoRename(chat.name, chat.messages.length)) {
        updatedChatName = generateChatName(newMessage.content as string);
        shouldStartAnimation = true;
        // Start typing animation
        get().startRenamingAnimation(chatId);
      }
  
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === chatId 
            ? { 
                ...c, 
                messages: updatedMessages, 
                name: updatedChatName,
                updatedAt: new Date() 
              }
            : c
        ),
      }));
      
      // IndexedDB update removed - no longer using cache
    
      setTimeout(async () => {
        try {
          const result = await withRetry(async () => {
            const updateData: any = {
              messages: updatedMessages,
              name: updatedChatName,
              updated_at: new Date().toISOString()
            };
            
            const response = await supabase
              .from('timetable_chats')
              .update(updateData)
              .eq('id', chatId);
            return response;
          });
          
          const { error } = result;
          if (error) {
            console.error('Background sync to Supabase failed:', error);
          }
          
          // Stop typing animation after a delay if it was started
          if (shouldStartAnimation) {
            setTimeout(() => {
              get().stopRenamingAnimation(chatId);
            }, 1500); // 1.5 second typing animation
          }
        } catch (syncError) {
          console.error('Background sync to Supabase failed:', syncError);
          // Stop animation even if sync fails
          if (shouldStartAnimation) {
            setTimeout(() => {
              get().stopRenamingAnimation(chatId);
            }, 1500);
          }
        }
      }, 100); 
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add message';
      set({ error: errorMessage });
      throw error;
    }
  },

  updateChatMessages: async (chatId: string, messages: UIMessage[]): Promise<void> => {
    set({ error: null });
    
    try {
      const supabase = createClient();

      const { chats } = get();
      const chat = chats.find(c => c.id === chatId);
      let updatedChatName: string | undefined = chat?.name;
      let shouldStartAnimation = false;

      if (chat) {
        const prevAssistantCount = chat.messages.filter(m => m.role === 'assistant').length;
        const newAssistantCount = messages.filter(m => m.role === 'assistant').length;
        const isFirstAssistantMessage = prevAssistantCount === 0 && newAssistantCount > 0;

        if (isFirstAssistantMessage && shouldAutoRename(chat.name, chat.messages.length)) {
          const getTextFromUIMessage = (msg: UIMessage): string => {
            const parts: any[] = (msg as any).parts;
            if (Array.isArray(parts)) {
              const textPart = parts.find(p => p?.type === 'text' && typeof p?.text === 'string');
              if (textPart) return textPart.text as string;
            }
            return (msg as any).content || '';
          };

          const firstUserExisting = chat.messages.find(m => m.role === 'user');
          const firstUserNew = messages.find(m => m.role === 'user');
          const firstAssistantNew = messages.find(m => m.role === 'assistant');

          if (firstUserExisting) {
            const titleSource = getTextFromUIMessage(firstUserExisting);
            updatedChatName = generateChatName(titleSource);
          } else if (firstUserNew) {
            const titleSource = getTextFromUIMessage(firstUserNew);
            updatedChatName = generateChatName(titleSource);
          } else if (firstAssistantNew) {
            const titleSource = getTextFromUIMessage(firstAssistantNew);
            updatedChatName = generateChatName(titleSource);
          }

          if (updatedChatName && updatedChatName !== chat.name) {
            shouldStartAnimation = true;
            get().startRenamingAnimation(chatId);
          }
        }
      }
      
      // Update local state immediately for better UX
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === chatId 
            ? { ...c, messages: messages, name: updatedChatName ?? c.name, updatedAt: new Date() }
            : c
        ),
      }));
      
      // IndexedDB update removed - no longer using cache
      
      // Sync to Supabase in background
      setTimeout(async () => {
        try {
          const updateData: any = {
            messages: messages,
            updated_at: new Date().toISOString()
          };
          if (updatedChatName && chat && updatedChatName !== chat.name) {
            updateData.name = updatedChatName;
          }
          const result = await withRetry(async () => {
            const response = await supabase
              .from('timetable_chats')
              .update(updateData)
              .eq('id', chatId);
            return response;
          });
          
          const { error } = result;
          if (error) {
            console.error('Background sync to Supabase failed:', error);
            // Optionally, you could implement a retry queue here
          } else if (shouldStartAnimation) {
            setTimeout(() => {
              get().stopRenamingAnimation(chatId);
            }, 1500);
          }
        } catch (syncError) {
          console.error('Background sync to Supabase failed:', syncError);
          if (shouldStartAnimation) {
            setTimeout(() => {
              get().stopRenamingAnimation(chatId);
            }, 1500);
          }
        }
      }, 100); // Small delay to ensure UI responsiveness
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update chat messages';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Data sync
  loadTimetables: async (forceRefresh: boolean = false): Promise<void> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        throw new Error('User not authenticated');
      }

      // Always fetch fresh data from Supabase to ensure chat items are up to date
      set({ isLoading: true, error: null });
      await get().syncFromSupabase(user.id);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load timetables';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Silent refresh method that doesn't show loading state
  refreshTimetablesSilently: async (): Promise<void> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return; // Silently fail if not authenticated
      }

      // Refresh data from Supabase without showing loading state
      await get().syncFromSupabase(user.id);
      
    } catch (error) {
      console.error('Silent refresh failed:', error);
      // Don't set error state to avoid disrupting UI
    }
  },

  // New method for syncing from Supabase (used by both loadTimetables and background sync)
  syncFromSupabase: async (userId: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Load timetables
      const timetablesResult = await withRetry(async () => {
        const response = await supabase
          .from('timetables')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        return response;
      });
      
      const { data: timetablesData, error: timetablesError } = timetablesResult;

      if (timetablesError) throw timetablesError;

      let timetables = timetablesData?.map(transformDatabaseTimetable) || [];

      // Load chats for all timetables
      const timetableIds = timetables.map(t => t.id);
      let chats: Chat[] = [];

      if (timetableIds.length > 0) {
        const chatsResult = await withRetry(async () => {
          const response = await supabase
            .from('timetable_chats')
            .select('*')
            .in('timetable_id', timetableIds)
            .order('created_at', { ascending: true });
          return response;
        });
        
        const { data: chatsData, error: chatsError } = chatsResult;

        if (chatsError) throw chatsError;
        chats = chatsData?.map(transformDatabaseChat) || [];
        
        // IndexedDB storage removed - no longer caching chat messages
      }

      // Create placeholder timetable if no timetables exist and none in cache
      if (timetables.length === 0) {
        // Check if we already have a placeholder in the current state to avoid duplicates
        const currentTimetables = get().timetables;
        if (currentTimetables.length === 0) {
          try {
            const placeholderTimetable = await get().createTimetable();
            timetables = [placeholderTimetable];
          } catch (error) {
            console.warn('Failed to create placeholder timetable:', error);
          }
        } else {
          // Use existing timetables from state
          timetables = currentTimetables;
        }
      }

      // Auto-select first timetable if none is selected
      const currentState = get();
      let newActiveTimetableId = currentState.activeTimetableId;
      let newActiveChatId = currentState.activeChatId;
      
      if (!newActiveTimetableId && timetables.length > 0) {
        newActiveTimetableId = timetables[0].id;
      }
      
      // Auto-select first chat if timetable is selected but no chat is selected
      if (newActiveTimetableId && !newActiveChatId) {
        const timetableChats = chats.filter(chat => chat.timetableId === newActiveTimetableId);
        if (timetableChats.length > 0) {
          newActiveChatId = timetableChats[0].id;
        }
      }

      // Update state
      set({
        timetables,
        chats,
        activeTimetableId: newActiveTimetableId,
        activeChatId: newActiveChatId,
        isLoading: false,
        error: null
      });

      // Cache saving removed - no longer using IndexedDB
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync timetables';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  syncToSupabase: async (): Promise<void> => {
    // This method can be used for manual sync operations
    // For now, we'll just reload data to ensure consistency
    await get().loadTimetables(true); // Force refresh to ensure latest data
  },

  // Enhanced method to force refresh data from Supabase
  refreshFromDatabase: async (): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      set({ error: 'User not authenticated', isLoading: false });
      throw new Error('User not authenticated');
    }

    set({ isLoading: true, error: null });
    try {
      await get().syncFromSupabase(user.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
    }),
    {
      name: 'timetable-store',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            if (!item) return null;
            try {
              const parsed = JSON.parse(item);
              return JSON.stringify({ state: deserializeState(parsed.state) });
            } catch {
              return item;
            }
          } catch (error) {
            console.warn('Failed to get item from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            const parsed = JSON.parse(value);
            const serialized = JSON.stringify({ state: serializeState(parsed.state) });
            localStorage.setItem(name, serialized);
          } catch (error) {
            console.warn('Failed to set item in localStorage:', error);
            try {
              localStorage.setItem(name, value);
            } catch {
              // Silently fail if localStorage is not available
            }
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.warn('Failed to remove item from localStorage:', error);
          }
        }
      })),
      onRehydrateStorage: () => (state) => {
        // Automatic sync after rehydration removed to prevent unexpected API calls
      },
      partialize: (state) => ({
        timetables: state.timetables,
        chats: state.chats,
        activeTimetableId: state.activeTimetableId,
        activeChatId: state.activeChatId,
        // Don't persist loading, error states, and renaming animation state
      }),
    }
  ) : (set, get) => ({
    timetables: [],
    chats: [],
    activeTimetableId: null,
    activeChatId: null,
    isLoading: false,
    error: null,
    renamingChats: new Set<string>(),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
    startRenamingAnimation: (chatId: string) => {
      set((state) => ({
        renamingChats: new Set([...state.renamingChats, chatId])
      }));
    },
    stopRenamingAnimation: (chatId: string) => {
      set((state) => {
        const newRenamingChats = new Set(state.renamingChats);
        newRenamingChats.delete(chatId);
        return { renamingChats: newRenamingChats };
      });
    },
    createTimetable: async (): Promise<Timetable> => { throw new Error('Not available in SSR'); },
    renameTimetable: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    deleteTimetable: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    setActiveTimetable: () => {},
    createChat: async (): Promise<Chat> => { throw new Error('Not available in SSR'); },
    renameChat: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    deleteChat: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    setActiveChat: () => {},
    clearActiveChat: () => {},
    addMessage: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    updateChatMessages: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    loadTimetables: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    syncFromSupabase: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    syncToSupabase: async (): Promise<void> => { throw new Error('Not available in SSR'); },
    refreshFromDatabase: async (): Promise<void> => { throw new Error('Not available in SSR'); },
  })
);