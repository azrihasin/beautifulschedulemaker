"use client";

import React, { useState } from "react";
import { Folder, MoreHorizontal, Plus, Edit2, Trash2 } from "lucide-react";
import { useTimetableStore } from "@/stores/timetableStore";
import { useChatStore } from "@/stores/chatStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { ChatItem } from "./chat-item";
import type { Timetable } from "@/stores/types";

interface TimetableItemProps {
  timetable: Timetable;
}

export const TimetableItem = React.memo(function TimetableItem({ timetable }: TimetableItemProps) {
  // Use selective subscriptions to prevent unnecessary rerenders
  const activeTimetableId = useTimetableStore((state) => state.activeTimetableId);
  const setActiveTimetable = useTimetableStore((state) => state.setActiveTimetable);
  const updateTimetable = useTimetableStore((state) => state.updateTimetable);
  const deleteTimetable = useTimetableStore((state) => state.deleteTimetable);
  
  const chats = useChatStore((state) => state.chats);
  const createChat = useChatStore((state) => state.createChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const clearActiveChat = useChatStore((state) => state.clearActiveChat);
  
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const expandedTimetables = useSidebarStore((state) => state.expandedTimetables);
  const toggleTimetable = useSidebarStore((state) => state.toggleTimetable);
  const expandTimetable = useSidebarStore((state) => state.expandTimetable);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(timetable.name);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const isExpanded = expandedTimetables instanceof Set ? expandedTimetables.has(timetable.id) : false;
  const isActive = activeTimetableId === timetable.id;
  // Get all chats for this timetable
  const timetableChats = chats.filter(chat => 
    chat.timetableId === timetable.id
  );

  const handleToggle = async () => {
    setActiveTimetable(timetable.id);
    
    // Always expand the timetable when clicked to show chat items
    expandTimetable(timetable.id);
    
    // Clear active chat to show empty page with timetable title
    clearActiveChat();
  };

  const handleRename = async () => {
    if (editName.trim() && editName !== timetable.name) {
      try {
        updateTimetable({ ...timetable, name: editName.trim(), updatedAt: new Date() });
      } catch (error) {
        console.error('Failed to rename timetable:', error);
        setEditName(timetable.name); // Reset on error
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deleteTimetable(timetable.id);
    } catch (error) {
      console.error('Failed to delete timetable:', error);
    }
  };

  const handleAddChat = async () => {
    setIsCreatingChat(true);
    try {
      // Create a persistent chat that will be immediately saved to database
      const newChat = await createChat(timetable.id);
      
      // Set this timetable as active and the new chat as active
      setActiveTimetable(timetable.id);
      setActiveChat(newChat.id);
      
      // Always expand the timetable to show the chat interface
      expandTimetable(timetable.id);
    } catch (error) {
      console.error('Error creating chat:', error);
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('not authenticated')) {
        alert('Please log in to create a chat. Click the "Login" button in the top right corner.');
      } else {
        alert('Failed to create chat. Please try again.');
      }
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(timetable.name);
      setIsEditing(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-8 h-8 p-0 rounded-md cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isActive && "bg-accent text-accent-foreground"
          )}
          onClick={handleToggle}
          aria-label={`Select ${timetable.name}`}
        >
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Timetable Header with SidebarGroupLabel */}
      <div className="group flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={handleToggle}>

          {/* Timetable Name as SidebarGroupLabel */}
          <div className="flex-1 min-w-0 cursor-pointer">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="h-6 px-1 text-xs border-0 bg-background shadow-sm font-medium uppercase tracking-wider"
                autoFocus
                aria-label="Edit timetable name"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <SidebarGroupLabel
                variant={isActive ? "active" : "default"}
                className="cursor-pointer hover:text-sidebar-foreground transition-colors"
              >
                {timetable.name}
              </SidebarGroupLabel>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Add Button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              handleAddChat();
            }}
            disabled={isCreatingChat}
            aria-label="Add new chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Timetable actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddChat();
                }}
                disabled={isCreatingChat}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {isCreatingChat ? 'Creating...' : 'Add Chat'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Timetable</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{timetable.name}"? This will also delete all associated chats and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat List */}
      {isExpanded && timetableChats.length > 0 && !isCollapsed && (
        <div className="space-y-0.5">
          {timetableChats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} />
          ))}
        </div>
      )}
    </div>
  );
});