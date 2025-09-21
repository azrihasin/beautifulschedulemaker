import { useEffect } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";

export function useSidebarKeyboard() {
  const { toggleSidebar, isCollapsed } = useSidebarStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B (common shortcut)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }

      // Toggle sidebar with Ctrl/Cmd + \ (VS Code style)
      if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return { isCollapsed };
}