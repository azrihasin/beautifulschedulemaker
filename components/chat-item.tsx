"use client";

import React, { useState } from "react";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { useTimetableStore } from "@/stores/timetableStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TypingAnimation } from "@/components/ui/typing-animation";
import type { Chat } from "@/stores/types";

interface ChatItemProps {
  chat: Chat;
}

export function ChatItem({ chat }: ChatItemProps) {
  const { 
    activeChatId, 
    setActiveChat, 
    renameChat, 
    deleteChat,
    renamingChats 
  } = useTimetableStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chat.name);

  const isActive = activeChatId === chat.id;
  const isRenaming = renamingChats.has(chat.id);

  const handleClick = () => {
    setActiveChat(chat.id);
  };

  const handleRename = async () => {
    if (editName.trim() && editName !== chat.name) {
      try {
        await renameChat(chat.id, editName.trim());
      } catch (error) {
        console.error('Failed to rename chat:', error);
        setEditName(chat.name); // Reset on error
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deleteChat(chat.id);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(chat.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors hover:bg-accent focus-within:bg-accent",
        isActive && "bg-accent text-accent-foreground"
      )}
      onClick={handleClick}
    >
      {/* Chat Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-6 px-1 text-sm border-0 bg-background shadow-sm"
            autoFocus
            aria-label="Edit chat name"
            onClick={(e) => e.stopPropagation()}
          />
        ) : isRenaming ? (
          <TypingAnimation
            text={chat.name}
            speed={50}
            className="text-sm font-medium text-foreground"
            onComplete={() => {}}
          />
        ) : (
          <span className="text-sm font-medium text-foreground truncate block">
            {chat.name}
          </span>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Chat actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}