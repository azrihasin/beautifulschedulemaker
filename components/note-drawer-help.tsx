import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NoteDrawerHelp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-30 h-8 w-8 p-0 bg-white shadow-md hover:shadow-lg"
        title="Show notes help"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-white rounded-lg shadow-lg border p-4 max-w-xs">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Notes Help</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-4 w-4 p-0 -mt-1 -mr-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Shift + Click</strong> on:</p>
        <ul className="ml-2 space-y-0.5">
          <li>• Course blocks → Session notes</li>
          <li>• Empty space → Timetable notes</li>
        </ul>
        <p><strong>Right-click</strong> on:</p>
        <ul className="ml-2 space-y-0.5">
          <li>• Course blocks → Course notes</li>
        </ul>
        <p className="text-gray-500 mt-2">
          Notes auto-save after 2 seconds
        </p>
      </div>
    </div>
  );
};

export default NoteDrawerHelp;