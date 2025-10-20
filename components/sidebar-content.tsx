"use client";

import React from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { AddTimetableButton } from "./add-timetable-button";
import { TimetableList } from "./timetable-list";
import { cn } from "@/lib/utils";

export function SidebarContent() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Add Timetable Button */}
      <div className={cn(
        "p-4 pb-2 transition-all duration-200 ease-in-out",
        isCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      )}>
        <AddTimetableButton />
      </div>

      {/* Scrollable Timetable List */}
      <div 
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 scrollbar-corner-transparent no-scrollbar-arrows transition-all duration-200 ease-in-out",
          isCollapsed ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        role="navigation"
        aria-label="Timetable list"
      >
        <TimetableList />
      </div>


    </div>
  );
}