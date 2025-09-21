"use client";

import React, { useState, useEffect } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { AddTimetableButton } from "./add-timetable-button";
import { TimetableList } from "./timetable-list";
import { UserAvatar } from "./user-avatar";
import AuthDialog from "./auth-dialog";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarContent() {
  const { isCollapsed } = useSidebarStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginDialog, setLoginDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
          "sidebar-scrollbar transition-all duration-200 ease-in-out",
          isCollapsed ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        role="navigation"
        aria-label="Timetable list"
      >
        <TimetableList />
      </div>

      {/* User section at bottom */}
      <div className={cn(
        "border-t border-sidebar-border transition-all duration-200 ease-in-out",
        isCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      )}>
        {!isCollapsed && (
          <div>
            {isAuthenticated ? (
              <UserAvatar />
            ) : (
              <div className="p-4 space-y-2">
                <Button
                  onClick={() => setLoginDialog(true)}
                  className="w-full h-8 text-xs bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
                  size="sm"
                >
                  Sign In
                </Button>
                <p className="text-xs text-sidebar-muted-foreground text-center">
                  Access your timetables anywhere
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AuthDialog
        isOpen={loginDialog}
        onClose={() => setLoginDialog(false)}
      />
    </div>
  );
}