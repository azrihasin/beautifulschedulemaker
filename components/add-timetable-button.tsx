"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useTimetableStore } from "@/stores/timetableStore";
import { useChatStore } from "@/stores/chatStore";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddTimetableButton() {
  const { isCollapsed } = useSidebarStore();
  const { addTimetable, isLoading } = useTimetableStore();
  const { clearActiveChat } = useChatStore();

  const handleCreateTimetable = async () => {
    try {
      await addTimetable();
      // Clear active chat to show empty chat state for new timetable
      clearActiveChat();
    } catch (error) {
      console.error("Failed to create timetable:", error);
      // Error handling will be managed by the store
    }
  };

  if (isCollapsed) {
    return (
      <Button
        onClick={handleCreateTimetable}
        disabled={isLoading}
        size="icon"
        className={cn(
          "w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "transition-all duration-200"
        )}
        aria-label="Add new timetable"
        title="Add new timetable"
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCreateTimetable}
      disabled={isLoading}
      className={cn(
        "w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "transition-all duration-200",
        isLoading && "opacity-70 cursor-not-allowed"
      )}
      aria-label="Add new timetable"
    >
      <Plus className="h-4 w-4" />
      <span className="text-sm font-medium">
        {isLoading ? "Creating..." : "Add Timetable"}
      </span>
    </Button>
  );
}