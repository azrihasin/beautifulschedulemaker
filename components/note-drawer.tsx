import React, { useEffect, useState } from "react";
import { X, Pin, PinOff, Hash, List, WifiOff } from "lucide-react";
import { useNoteStore } from "@/stores/noteStore";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";
import type { NoteContext } from "@/stores/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/note-editor";
import { NoteOrganization } from "@/components/note-organization";
import type { JSONContent } from "@/stores/types";

interface NoteDrawerProps {
  isOpen: boolean;
  selectedContext: NoteContext | null;
  onClose: () => void;
}

interface NoteDrawerHeaderProps {
  context: NoteContext | null;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onClose: () => void;
}

const NoteDrawerHeader: React.FC<NoteDrawerHeaderProps> = ({
  context,
  isPinned,
  onPin,
  onUnpin,
  onClose,
}) => {
  const { courses } = useCourseStore();
  const { timetables } = useTimetableStore();

  const getContextTitle = () => {
    if (!context) return "Notes";

    const timetable = timetables.find(t => t.id === context.timetableId);
    const timetableName = timetable?.name || "Timetable";

    switch (context.type) {
      case 'session':
        if (context.courseId && context.sessionId) {
          const course = courses.find(c => c.id === context.courseId);
          const session = course?.sessions.find(s => s.session_id === context.sessionId);
          if (course && session) {
            const daysStr = session.days.join(", ");
            const timeStr = `${session.startTime}-${session.endTime}`;
            return `${course.code} - ${daysStr} ${timeStr}`;
          }
        }
        return "Session Notes";
      case 'course':
        if (context.courseId) {
          const course = courses.find(c => c.id === context.courseId);
          return course ? `${course.code} - ${course.name}` : "Course Notes";
        }
        return "Course Notes";
      case 'timetable':
      default:
        return `${timetableName} Notes`;
    }
  };

  const getContextSubtitle = () => {
    if (!context) return "";

    switch (context.type) {
      case 'session':
        return "Session-specific notes";
      case 'course':
        return "Course-wide notes";
      case 'timetable':
      default:
        return "General timetable notes";
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 truncate">
          {getContextTitle()}
        </h2>
        <p className="text-sm text-gray-500 truncate">
          {getContextSubtitle()}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={isPinned ? onUnpin : onPin}
          className="h-8 w-8 p-0"
          title={isPinned ? "Unpin note" : "Pin note"}
        >
          {isPinned ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
          title="Close drawer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const NoteDrawer: React.FC<NoteDrawerProps> = ({
  isOpen,
  selectedContext,
  onClose,
}) => {
  const {
    currentNote,
    isLoading,
    error,
    loadNote,
    saveNote,
    setCurrentContext,
    clearError,
    checkConnectivity,
    retryFailedOperations,
  } = useNoteStore();

  const [content, setContent] = useState<JSONContent | null>(null);
  const [showOrganization, setShowOrganization] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Load note when context changes
  useEffect(() => {
    if (isOpen && selectedContext) {
      setCurrentContext(selectedContext);
      loadNote(selectedContext).catch(console.error);
    }
  }, [isOpen, selectedContext, setCurrentContext, loadNote]);

  // Update content when current note changes
  useEffect(() => {
    if (currentNote?.content) {
      setContent(currentNote.content as JSONContent);
    } else {
      setContent(null);
    }
  }, [currentNote]);

  // Check connectivity periodically
  useEffect(() => {
    const checkConnection = async () => {
      const online = await checkConnectivity();
      setIsOnline(online);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkConnectivity]);

  // Handle retry when coming back online
  useEffect(() => {
    if (isOnline && error?.includes('Connection lost')) {
      retryFailedOperations();
    }
  }, [isOnline, error, retryFailedOperations]);

  const handlePinToggle = async () => {
    if (currentNote) {
      try {
        await saveNote({ isPinned: !currentNote.isPinned });
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    }
  };

  const handleContentChange = (newContent: JSONContent) => {
    setContent(newContent);
  };

  // Helper function to calculate content length from JSONContent
  const getContentLength = (json: JSONContent | null): number => {
    if (!json || !json.content) return 0;
    
    const extractText = (node: any): string => {
      if (node.text) return node.text;
      if (node.content) {
        return node.content.map(extractText).join("");
      }
      return "";
    };

    return json.content.map(extractText).join("").length;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 opacity-100"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out w-80 sm:w-96 md:w-[400px] translate-x-0"
      >
        <div className="flex flex-col h-full">
          <NoteDrawerHeader
            context={selectedContext}
            isPinned={currentNote?.isPinned || false}
            onPin={handlePinToggle}
            onUnpin={handlePinToggle}
            onClose={onClose}
          />

          {/* Tab Navigation */}
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setShowOrganization(false)}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                !showOrganization
                  ? "bg-white border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Current Note
            </button>
            <button
              onClick={() => setShowOrganization(true)}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                showOrganization
                  ? "bg-white border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <List className="h-4 w-4" />
              All Notes
            </button>
          </div>

          {/* Connection Status */}
          {!isOnline && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <WifiOff className="h-4 w-4" />
                Offline - Changes will sync when connection is restored
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 border-b">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="h-6 w-6 p-0 text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {showOrganization ? (
              <div className="flex-1 p-4 overflow-y-auto">
                <NoteOrganization
                  timetableId={selectedContext?.timetableId || ''}
                  onSelectNote={(context) => {
                    setShowOrganization(false);
                    setCurrentContext(context);
                    loadNote(context).catch(console.error);
                  }}
                  selectedContext={selectedContext}
                />
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-sm text-gray-500">Loading note...</div>
              </div>
            ) : (
              <div className="flex-1 p-4">
                <NoteEditor
                  content={content}
                  onChange={handleContentChange}
                  placeholder="Start writing your notes..."
                  autoFocus={false}
                  className="h-full"
                />
              </div>
            )}

            {/* Note metadata */}
            {currentNote && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Last edited: {new Date(currentNote.updatedAt).toLocaleDateString()} at{" "}
                    {new Date(currentNote.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>
                    {getContentLength(content)} characters
                  </span>
                </div>
                {currentNote.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Hash className="h-3 w-3" />
                    <div className="flex flex-wrap gap-1">
                      {currentNote.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NoteDrawer;