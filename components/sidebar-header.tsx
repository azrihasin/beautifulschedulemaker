"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/stores/sidebarStore";
import { Menu, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarHeader() {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        {/* Logo/Branding - Only shows when expanded */}
        {!isCollapsed && (
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-200 ease-in-out cursor-pointer hover:opacity-80",
              "opacity-100 scale-100"
            )}
            onClick={toggleSidebar}
          >
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">
              BEAUTIFUL
              <br />
              SCHEDULE
              <br />
              MAKER
            </h1>
          </div>
        )}

        {/* Menu Button - Only shows when collapsed */}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "h-8 w-8 shrink-0 mx-auto",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2",
              "transition-colors duration-200"
            )}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
