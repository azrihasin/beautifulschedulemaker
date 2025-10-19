"use client";

import React, { useEffect } from "react";
import { useTimetableStore } from "@/stores/timetableStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { cn } from "@/lib/utils";
import { TimetableItem } from "./timetable-item";

export function TimetableList() {
  // Use selective subscriptions to prevent unnecessary rerenders
  const timetables = useTimetableStore((state) => state.timetables);
  const isLoading = useTimetableStore((state) => state.isLoading);
  const loadTimetables = useTimetableStore((state) => state.loadTimetables);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  // Load timetables when component mounts if not already loaded
  useEffect(() => {
    if (timetables.length === 0 && !isLoading && loadTimetables) {
      loadTimetables().catch(console.error);
    }
  }, [timetables.length, isLoading]); // Remove loadTimetables from dependencies

  if (isLoading) {
    return (
      <div className="space-y-2">
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-gray-200 rounded-md",
              isCollapsed ? "h-8 w-8" : "h-10 w-full"
            )}
          />
        ))}
      </div>
    );
  }

  if (timetables.length === 0) {
    return (
      <div className={cn(
        "text-center py-8",
        isCollapsed && "hidden"
      )}>
        <p className="text-sm text-sidebar-muted-foreground mb-2">No timetables yet</p>
        <p className="text-sm text-sidebar-muted-foreground">
          Click "Add Timetable" to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list">
      {timetables.map((timetable) => (
        <TimetableItem key={timetable.id} timetable={timetable} />
      ))}
    </div>
  );
}