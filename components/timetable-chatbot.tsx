"use client";

import React, { useEffect, useState } from "react";
import { CourseChatbot } from "./course-chatbot";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, LogIn } from "lucide-react";
import AuthDialog from "./auth-dialog";

interface TimetableChatbotProps {
  className?: string;
}

export function TimetableChatbot({ className }: TimetableChatbotProps) {
  const { 
    activeTimetableId, 
    activeChatId, 
    chats, 
    timetables,
    createChat, 
    createTemporaryChat,
    setActiveChat,
    error: timetableError 
  } = useTimetableStore();
  
  const { loadCourses } = useCourseStore();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Load courses when timetable changes
  useEffect(() => {
    if (activeTimetableId) {
      loadCourses(activeTimetableId);
    }
  }, [activeTimetableId, loadCourses]);

  // Get the active chat
  const activeChat = activeChatId ? chats.find(chat => chat.id === activeChatId) : null;
  
  // Get chats for the active timetable
  const timetableChats = activeTimetableId 
    ? chats.filter(chat => chat.timetableId === activeTimetableId)
    : [];

  // Create temporary chat when timetable is selected but no chats exist
  useEffect(() => {
    if (activeTimetableId && timetableChats.length === 0 && !activeChatId) {
      const tempChat = createTemporaryChat(activeTimetableId);
      // The temporary chat is automatically set as active in the store
    }
  }, [activeTimetableId, timetableChats.length, activeChatId, createTemporaryChat]);

  // Handle creating a new chat when user starts chatting
  const handleCreateChat = async () => {
    if (!activeTimetableId || isCreatingChat) return;

    setIsCreatingChat(true);
    setChatError(null);

    try {
      const newChat = await createChat(activeTimetableId);
      setActiveChat(newChat.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat';
      setChatError(errorMessage);
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Remove auto-creation logic to prevent duplicate chat creation
  // Chat creation will be handled by user interaction or when they start typing

  // Show different states based on sidebar selection
  if (!activeTimetableId) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-screen p-8 text-center", className)}>
        <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          Select a Timetable
        </h3>
        <p className="text-sm text-gray-500 max-w-md">
          Choose a timetable from the sidebar to start chatting with your AI assistant about your courses and schedule.
        </p>
      </div>
    );
  }

  if (isCreatingChat) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-screen p-8", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-gray-600">Setting up your chat...</p>
      </div>
    );
  }

  if (chatError || timetableError) {
    const errorMessage = chatError || timetableError || '';
    const isAuthError = errorMessage.includes('User not authenticated') || errorMessage.includes('Authentication failed');
    
    if (isAuthError) {
      return (
        <>
          <div className={cn("flex flex-col items-center justify-center h-screen p-8 text-center", className)}>
            <LogIn className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              Please sign in to start chatting with your AI assistant about your courses and schedule.
            </p>
            <Button 
              onClick={() => setShowAuthDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
          <AuthDialog 
            open={showAuthDialog} 
            onOpenChange={setShowAuthDialog} 
          />
        </>
      );
    }
    
    return (
      <div className={cn("flex flex-col items-center justify-center h-screen p-8 text-center", className)}>
        <MessageSquare className="h-16 w-16 text-red-300 mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Error Loading Chat
        </h3>
        <p className="text-sm text-red-500 mb-6 max-w-md">
          {errorMessage}
        </p>
        <Button 
          onClick={() => {
            setChatError(null);
            if (activeTimetableId) {
              handleCreateChat();
            }
          }}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Always show the chat interface when a timetable is selected
  // The temporary chat will be created automatically by the useEffect
  return (
    <>
      <CourseChatbot className={className} />
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
      />
    </>
  );
}