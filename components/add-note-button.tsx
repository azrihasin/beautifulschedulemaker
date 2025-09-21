import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddNoteButtonProps {
  onTransitionToNoteList: () => void;
  className?: string;
}

export const AddNoteButton: React.FC<AddNoteButtonProps> = ({
  onTransitionToNoteList,
  className,
}) => {
  return (
    <Button
      onClick={onTransitionToNoteList}
      variant="default"
      size="lg"
      className={cn(
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        "font-medium transition-all duration-200",
        "flex items-center gap-2",
        "focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "hover:scale-105 active:scale-95",
        className
      )}
      aria-label="Add new visual note"
      title="Create a new visual note with Excalidraw"
    >
      <Plus className="h-5 w-5" aria-hidden="true" />
      Add Note
    </Button>
  );
};