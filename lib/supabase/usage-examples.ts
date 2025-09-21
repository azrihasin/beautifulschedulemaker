/**
 * Usage examples for the timetables and chats database schema
 * 
 * This file provides practical examples of how to interact with the
 * timetables and timetable_chats tables using the Supabase client.
 */

import { createClient } from './client'
import type { 
  Timetable, 
  TimetableChat, 
  TimetableInsert, 
  TimetableChatInsert,
  ChatMessage 
} from './database.types'

const supabase = createClient()

/**
 * Timetable Operations
 */
export class TimetableOperations {
  /**
   * Create a new timetable for the authenticated user
   */
  static async createTimetable(name: string): Promise<Timetable> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('timetables')
      .insert({
        user_id: user.id,
        name,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all timetables for the authenticated user
   */
  static async getUserTimetables(): Promise<Timetable[]> {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Update a timetable name
   */
  static async renameTimetable(id: string, name: string): Promise<Timetable> {
    const { data, error } = await supabase
      .from('timetables')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Soft delete a timetable (set is_active to false)
   */
  static async deleteTimetable(id: string): Promise<void> {
    const { error } = await supabase
      .from('timetables')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Get a specific timetable by ID
   */
  static async getTimetableById(id: string): Promise<Timetable | null> {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }
}

/**
 * Chat Operations
 */
export class ChatOperations {
  /**
   * Create a new chat for a timetable
   */
  static async createChat(
    timetableId: string, 
    name: string, 
    initialMessage?: ChatMessage
  ): Promise<TimetableChat> {
    const messages = initialMessage ? [initialMessage] : []

    const { data, error } = await supabase
      .from('timetable_chats')
      .insert({
        timetable_id: timetableId,
        name,
        messages
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all chats for a specific timetable
   */
  static async getTimetableChats(timetableId: string): Promise<TimetableChat[]> {
    const { data, error } = await supabase
      .from('timetable_chats')
      .select('*')
      .eq('timetable_id', timetableId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Add a message to a chat
   */
  static async addMessageToChat(
    chatId: string, 
    message: ChatMessage
  ): Promise<TimetableChat> {
    // First get the current messages
    const { data: currentChat, error: fetchError } = await supabase
      .from('timetable_chats')
      .select('messages')
      .eq('id', chatId)
      .single()

    if (fetchError) throw fetchError

    const currentMessages = (currentChat.messages as ChatMessage[]) || []
    const updatedMessages = [...currentMessages, message]

    const { data, error } = await supabase
      .from('timetable_chats')
      .update({ messages: updatedMessages })
      .eq('id', chatId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update chat name
   */
  static async renameChat(chatId: string, name: string): Promise<TimetableChat> {
    const { data, error } = await supabase
      .from('timetable_chats')
      .update({ name })
      .eq('id', chatId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a chat
   */
  static async deleteChat(chatId: string): Promise<void> {
    const { error } = await supabase
      .from('timetable_chats')
      .delete()
      .eq('id', chatId)

    if (error) throw error
  }

  /**
   * Get a specific chat by ID
   */
  static async getChatById(chatId: string): Promise<TimetableChat | null> {
    const { data, error } = await supabase
      .from('timetable_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }

  /**
   * Update entire message history for a chat
   */
  static async updateChatMessages(
    chatId: string, 
    messages: ChatMessage[]
  ): Promise<TimetableChat> {
    const { data, error } = await supabase
      .from('timetable_chats')
      .update({ messages })
      .eq('id', chatId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Combined Operations
 */
export class TimetableChatOperations {
  /**
   * Get a timetable with all its chats
   */
  static async getTimetableWithChats(timetableId: string): Promise<{
    timetable: Timetable
    chats: TimetableChat[]
  }> {
    const [timetable, chats] = await Promise.all([
      TimetableOperations.getTimetableById(timetableId),
      ChatOperations.getTimetableChats(timetableId)
    ])

    if (!timetable) {
      throw new Error('Timetable not found')
    }

    return { timetable, chats }
  }

  /**
   * Create a timetable with an initial chat
   */
  static async createTimetableWithChat(
    timetableName: string,
    chatName: string,
    initialMessage?: ChatMessage
  ): Promise<{
    timetable: Timetable
    chat: TimetableChat
  }> {
    const timetable = await TimetableOperations.createTimetable(timetableName)
    const chat = await ChatOperations.createChat(
      timetable.id, 
      chatName, 
      initialMessage
    )

    return { timetable, chat }
  }

  /**
   * Delete a timetable and all its chats
   */
  static async deleteTimetableAndChats(timetableId: string): Promise<void> {
    // Due to CASCADE DELETE, deleting the timetable will automatically delete all chats
    await TimetableOperations.deleteTimetable(timetableId)
  }

  /**
   * Get all timetables with their chat counts
   */
  static async getTimetablesWithChatCounts(): Promise<Array<{
    timetable: Timetable
    chatCount: number
  }>> {
    const timetables = await TimetableOperations.getUserTimetables()
    
    const timetablesWithCounts = await Promise.all(
      timetables.map(async (timetable) => {
        const chats = await ChatOperations.getTimetableChats(timetable.id)
        return {
          timetable,
          chatCount: chats.length
        }
      })
    )

    return timetablesWithCounts
  }
}

/**
 * Utility functions for working with chat messages
 */
export class ChatMessageUtils {
  /**
   * Create a new chat message
   */
  static createMessage(
    role: 'user' | 'assistant',
    content: string,
    id?: string
  ): ChatMessage {
    return {
      id: id || crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate a chat name from the first user message
   */
  static generateChatName(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find(msg => msg.role === 'user')
    if (!firstUserMessage) return 'New Chat'

    // Take first 30 characters and add ellipsis if longer
    const content = firstUserMessage.content.trim()
    return content.length > 30 ? content.substring(0, 30) + '...' : content
  }

  /**
   * Get the last message in a chat
   */
  static getLastMessage(messages: ChatMessage[]): ChatMessage | null {
    return messages.length > 0 ? messages[messages.length - 1] : null
  }

  /**
   * Count messages by role
   */
  static countMessagesByRole(messages: ChatMessage[]): {
    user: number
    assistant: number
  } {
    return messages.reduce(
      (counts, message) => {
        counts[message.role]++
        return counts
      },
      { user: 0, assistant: 0 }
    )
  }
}