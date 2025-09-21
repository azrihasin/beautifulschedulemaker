"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useSidebarKeyboard } from "@/hooks/use-sidebar-keyboard";
import { SidebarHeader } from "./sidebar-header";
import { SidebarContent } from "./sidebar-content";

export interface CollapsibleSidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
}

export function CollapsibleSidebar({ 
  className, 
  defaultCollapsed = false 
}: CollapsibleSidebarProps) {
  const { isCollapsed } = useSidebarStore();
  
  // Enable keyboard navigation
  useSidebarKeyboard();

  return (
    <aside
      className={cn(
        // Base styles using shadcn design tokens
        "flex flex-col bg-sidebar",
        "h-screen overflow-hidden transition-all duration-300 ease-in-out",
        // Desktop sizing with smooth transitions
        "lg:flex",
        isCollapsed ? "w-16" : "w-64",
        // Mobile overlay behavior - show on mobile when not collapsed
        "lg:relative lg:translate-x-0",
        isCollapsed 
          ? "hidden lg:flex" 
          : "fixed inset-y-0 left-0 z-50 lg:z-auto lg:relative",
        // Mobile backdrop with proper shadcn styling
        "lg:bg-sidebar bg-sidebar/95 backdrop-blur-sm",
        // Focus and accessibility
        "focus-within:outline-none",
        className
      )}
      role="complementary"
      aria-label="Timetable navigation sidebar"
      data-state={isCollapsed ? "collapsed" : "expanded"}
    >
      <SidebarHeader />
      <SidebarContent />
    </aside>
  );
}

// Mobile overlay for responsive behavior
export function MobileSidebarOverlay() {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  if (isCollapsed) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 lg:hidden",
        "bg-background/80 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      )}
      onClick={toggleSidebar}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          toggleSidebar();
        }
      }}
      aria-hidden="true"
      data-state={isCollapsed ? "closed" : "open"}
    />
  );
}