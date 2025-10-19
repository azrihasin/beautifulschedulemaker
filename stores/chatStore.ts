import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { ChatStore, Chat } from "./types";
import { persist, createPersistConfig } from "../lib/zustand-indexeddb-persistence";

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChatId: null,
      renamingChats: new Set<string>(),
      
      addChat: (chat: Chat) => set((state) => ({ 
        chats: [...state.chats, { ...chat, createdAt: new Date(), updatedAt: new Date() }] 
      })),
      
      deleteChat: async (id: string): Promise<void> => {
        set((state) => ({ 
          chats: state.chats.filter(chat => chat.id !== id),
          activeChatId: state.activeChatId === id ? null : state.activeChatId
        }));
      },
      
      updateChat: (updatedChat: Chat) => 
        set((state) => ({ 
          chats: state.chats.map((chat) => 
            chat.id === updatedChat.id ? { ...updatedChat, updatedAt: new Date() } : chat 
          ), 
        })),

      renameChat: async (id: string, newName: string): Promise<void> => {
        const { chats } = get();
        const chat = chats.find(c => c.id === id);
        if (!chat) return;

        // Mark as renaming for UI feedback
        set((state) => {
          const next = new Set(state.renamingChats);
          next.add(id);
          return { renamingChats: next };
        });

        try {
          const updatedChat: Chat = { ...chat, name: newName, updatedAt: new Date() };
          set((state) => ({
            chats: state.chats.map((c) => (c.id === id ? updatedChat : c)),
          }));
        } finally {
          // Clear renaming flag
          set((state) => {
            const next = new Set(state.renamingChats);
            next.delete(id);
            return { renamingChats: next };
          });
        }
      },
      
      createChat: async (timetableId: string): Promise<Chat> => {
        const { chats } = get();
        const chatCount = chats.filter(chat => chat.timetableId === timetableId).length + 1;
        const name = `Chat ${chatCount}`;

        const newChat: Chat = {
          id: uuidv4(),
          name,
          timetableId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          chats: [...state.chats, newChat],
          activeChatId: newChat.id,
        }));

        return newChat;
      },
      
      setActiveChat: (id: string) => {
        set({ activeChatId: id });
      },
      
      clearActiveChat: () => {
        set({ activeChatId: null });
      },
    }),
    createPersistConfig("chats", {
      partialize: (state) => ({ 
        chats: state.chats,
        activeChatId: state.activeChatId,
        renamingChats: state.renamingChats,
      }),
    })
  )
);