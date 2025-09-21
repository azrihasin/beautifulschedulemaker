"use client";
import React, { useEffect, useRef, useState } from "react";
import Timetable from "@/components/timetable";
import CourseDialog from "@/components/course-dialog";
import { useCourseStore } from "@/stores/courseStore";
import AuthDialog from "@/components/auth-dialog";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import AddJsonDialog from "@/components/add-json-dialog";
import CopyJsonDialog from "@/components/copy-json-dialog";
import CourseListDialog from "@/components/course-list-dialog";
import SettingsArea from "@/components/settings-area";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/stores/settingsStore";
import bg from "../public/sky-evening.jpg";
import bg1 from "../public/wallpaper.jpeg";
import { useScreenshot } from "@/hooks/use-screenshot";
import SaveTimetableDialog from "@/components/save-timetable-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, Menu, LogIn, RotateCcw } from "lucide-react";
import { CourseChatbot } from "@/components/course-chatbot";
import { TimetableChatbot } from "@/components/timetable-chatbot";
import { cn } from "@/lib/utils";
import {
  CollapsibleSidebar,
  MobileSidebarOverlay,
} from "@/components/collapsible-sidebar";
import { useTimetableStore } from "@/stores/timetableStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingSkeleton } from "@/components/ui/loading-states";
import { initializeCoursesForTimetable } from "@/lib/course-timetable-helpers";
import { AddNoteButton } from "@/components/add-note-button";
import { ExcalidrawNoteEditor } from "@/components/excalidraw-note-editor";
import { NoteListView } from "@/components/note-list-view";
import { loadMockNotes } from "@/lib/mock-notes-data";
import { NoteCard } from "@/lib/types/three-view-notes";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useExcalidrawNoteStore } from "@/stores/excalidrawNoteStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const deviceModels = [
  {
    model: "iPhone 16 Pro Max",
    width: 1320,
    height: 2868,
  },
  {
    model: "iPhone 16 Pro",
    width: 1206,
    height: 2622,
  },
  {
    model: "iPhone 16 Plus",
    width: 1290,
    height: 2796,
  },
  {
    model: "iPhone 16",
    width: 1179,
    height: 2556,
  },
  {
    model: "iPhone 15 Pro Max",
    width: 1290,
    height: 2796,
  },
  {
    model: "iPhone 15 Pro",
    width: 1179,
    height: 2556,
  },
  {
    model: "iPhone 15 Plus",
    width: 1290,
    height: 2796,
  },
  {
    model: "iPhone 15",
    width: 1179,
    height: 2556,
  },
  {
    model: "iPhone 14 Pro Max",
    width: 1290,
    height: 2796,
  },
  {
    model: "iPhone 14 Pro",
    width: 1179,
    height: 2556,
  },
  {
    model: "iPhone 14 Plus",
    width: 1284,
    height: 2778,
  },
  {
    model: "iPhone 14",
    width: 1170,
    height: 2532,
  },
  {
    model: "iPhone 13 Pro Max",
    width: 1284,
    height: 2778,
  },
  {
    model: "iPhone 13 Pro",
    width: 1170,
    height: 2532,
  },
  {
    model: "iPhone 13 mini",
    width: 1080,
    height: 2340,
  },
  {
    model: "iPhone 13",
    width: 1170,
    height: 2532,
  },
  {
    model: "iPhone 12 Pro Max",
    width: 1284,
    height: 2778,
  },
  {
    model: "iPhone 12 Pro",
    width: 1170,
    height: 2532,
  },
  {
    model: "iPhone 12 mini",
    width: 1080,
    height: 2340,
  },
  {
    model: "iPhone 12",
    width: 1170,
    height: 2532,
  },
  {
    model: "iPhone 11 Pro Max",
    width: 1242,
    height: 2688,
  },
  {
    model: "iPhone 11 Pro",
    width: 1125,
    height: 2436,
  },
  {
    model: "iPhone 11",
    width: 828,
    height: 1792,
  },
  {
    model: "iPhone XR",
    width: 828,
    height: 1792,
  },
  {
    model: "iPhone XS Max",
    width: 1242,
    height: 2688,
  },
  {
    model: "iPhone XS",
    width: 1125,
    height: 2436,
  },
  {
    model: "iPhone X",
    width: 1125,
    height: 2436,
  },
  {
    model: "Samsung Galaxy S25 Ultra",
    width: 1440,
    height: 3120,
  },
  {
    model: "Vivo X100 Pro",
    width: 1440,
    height: 3200,
  },
  {
    model: "Vivo V40 Pro",
    width: 1260,
    height: 2800,
  },
  {
    model: "Oppo Reno 14 Pro",
    width: 1264,
    height: 2776,
  },
  {
    model: "Oppo Reno13 Pro",
    width: 1264,
    height: 2776,
  },
  {
    model: "Realme GT7",
    width: 1264,
    height: 2776,
  },
  {
    model: "Xiaomi Redmi Note 15 Pro",
    width: 1080,
    height: 2400,
  },
  {
    model: "Xiaomi Redmi Note 14 Pro",
    width: 1220,
    height: 2712,
  },
  {
    model: "Xiaomi Redmi Note 14",
    width: 1080,
    height: 2400,
  },
  {
    model: "Xiaomi Redmi 14C 5G",
    width: 1080,
    height: 2400,
  },
  {
    model: "Samsung Galaxy A55",
    width: 1080,
    height: 2340,
  },
  {
    model: "Samsung Galaxy A35",
    width: 1080,
    height: 2340,
  },
  {
    model: "Oppo A98",
    width: 1080,
    height: 2400,
  },
  {
    model: "Vivo Y36",
    width: 1080,
    height: 2408,
  },
  {
    model: "Realme 12 Pro+",
    width: 1080,
    height: 2412,
  },
];
export default function Home() {
  const courses = useCourseStore((state) => state.courses);
  const setCourses = useCourseStore((state) => state.setCourses);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isCopyJsonDialogOpen, setIsCopyJsonDialogOpen] = useState(false);
  const [isCourseListDialogOpen, setIsCourseListDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginDialog, setLoginDialog] = useState(false);
  const [settingsMode, setSettingsMode] = useState(false);
  const [cropperSize, setCropperSize] = useState({ width: 100, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSaveTimetableDialogOpen, setIsSaveTimetableDialogOpen] =
    useState(false);
  const [useChatInterface, setUseChatInterface] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  type ViewMode = "timetable" | "note-list" | "note-editor";
  const [currentView, setCurrentView] = useState<ViewMode>("timetable");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"timetable" | "note-list">(
    "timetable"
  );

  const { loadNotes, createNote, updateNote } = useExcalidrawNoteStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (currentView === "note-editor") {
          handleBackToNoteList();
        } else if (activeTab === "note-list") {
          setActiveTab("timetable");
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault();
        if (activeTab === "timetable") {
          handleTransitionToNoteList();
        } else if (activeTab === "note-list") {
          handleCreateNewNote();
        }
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        currentView === "note-editor"
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentView, activeTab]);

  const handleTransitionToNoteList = () => {
    setActiveTab("note-list");
    setCurrentView("note-list");
  };

  const handleBackToNoteList = () => {
    setSelectedNoteId(null);
    setActiveTab("note-list");
    setCurrentView("note-list");
  };

  const handleCreateNewNote = () => {
    setSelectedNoteId(null);
    setCurrentView("note-editor");
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setCurrentView("note-editor");
  };

  const handleLoadNotes = async () => {
    try {
      await loadNotes();
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const handleSaveNote = async (title: string, sceneData: any) => {
    try {
      console.log("Saving note:", { title, sceneData });

      const { toast } = await import("sonner");

      if (!title.trim()) {
        toast.error("Note title is required", {
          description: "Please provide a title for your note before saving.",
          duration: 3000,
        });
        return;
      }

      let savedNote;
      let savedNoteId;

      if (selectedNoteId) {
        savedNote = await updateNote(selectedNoteId, title.trim(), sceneData);
        savedNoteId = savedNote?.id || selectedNoteId;
      } else {
        const newNoteId = await createNote(
          title.trim(),
          sceneData,
          "timetable",
          null
        );
        if (newNoteId) {
          setSelectedNoteId(newNoteId);
          savedNoteId = newNoteId;
          savedNote = { id: newNoteId }; // Create a minimal object for success check
        }
      }

      if (savedNote || savedNoteId) {
        try {
          await handleLoadNotes();
        } catch (loadError) {
          console.warn("Failed to refresh notes list after save:", loadError);
        }

        toast.success("Note saved successfully", {
          description: `"${title}" has been saved to your notes.`,
          duration: 3000,
        });

        console.log("Note saved successfully:", savedNoteId);
      }
    } catch (error) {
      console.error("Error saving note:", error);

      const { toast } = await import("sonner");

      // Only show user-friendly error message, don't re-throw
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      toast.error("Failed to save note", {
        description:
          errorMessage ||
          "An unexpected error occurred while saving your note. Please try again.",
        duration: 4000,
        action: {
          label: "Retry",
          onClick: () => handleSaveNote(title, sceneData),
        },
      });

      // Don't re-throw the error to prevent null errors from propagating
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromDatabase();
      await loadTimetables();
      
      const { toast } = await import("sonner");
      toast.success("Data refreshed successfully", {
        description: "Timetables and courses have been updated.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      
      const { toast } = await import("sonner");
      toast.error("Failed to refresh data", {
        description: "Please try again later.",
        duration: 3000,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const {
    activeTimetableId,
    activeChatId,
    chats,
    loadTimetables,
    refreshFromDatabase,
    isLoading,
    error,
  } = useTimetableStore();
  const { isCollapsed } = useSidebarStore();
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && activeTimetableId) {
      initializeCoursesForTimetable(activeTimetableId).catch((error) => {
        console.error("Failed to load courses for timetable:", error);
      });
    }
  }, [activeTimetableId, isAuthenticated]);

  // Set iPhone 16 Pro Max as the default device
  const [selectedDevice, setSelectedDevice] = useState(deviceModels[0]); // iPhone 16 Pro Max
  // Default dimensions scaled down by factor of 4 (iPhone 16 Pro Max: 1320x2868)
  const [containerDimensions, setContainerDimensions] = useState({
    width: 330, // 1320 / 4
    height: 717, // 2868 / 4
  });

  const { captureElement, downloadImage, copyToClipboard } = useScreenshot();
  const timetableRef = useRef<HTMLDivElement>(null);

  const {
    isCustomizingWallpaper,
    setIsCustomizingWallpaper,
    backgroundImage,
    setBackgroundImage,
  } = useSettingsStore();

  const handleDeviceSelect = (device: (typeof deviceModels)[0]) => {
    setSelectedDevice(device);

    // Scale down to create a smaller version while maintaining aspect ratio
    const scaleFactor = 4; // Increased from 3 to make it smaller
    const scaledWidth = Math.round(device.width / scaleFactor);
    const scaledHeight = Math.round(device.height / scaleFactor);
    setContainerDimensions({ width: scaledWidth, height: scaledHeight });
  };

  const handleScreenshot = async (format: "png" | "jpeg" | "svg" = "png") => {
    const timetableElement = document.querySelector(
      '[data-timetable="true"]'
    ) as HTMLElement;
    if (!timetableElement) return;

    try {
      const dataUrl = await captureElement(timetableElement, {
        format,
        quality: format === "jpeg" ? 0.9 : 1.0,
        pixelRatio: 3,
      });

      const filename = `timetable-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      downloadImage(dataUrl, filename);
    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    const timetableElement = document.querySelector(
      '[data-timetable="true"]'
    ) as HTMLElement;
    if (!timetableElement) return;

    const success = await copyToClipboard(timetableElement);
    if (success) {
      console.log("Copied to clipboard!");
    }
  };

  const [hasLoadedTimetables, setHasLoadedTimetables] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);

      if (session && loadTimetables && !hasLoadedTimetables) {
        loadTimetables()
          .then(() => {
            setHasLoadedTimetables(true);
          })
          .catch(console.error);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);

      if (event === "SIGNED_IN" && session && loadTimetables) {
        loadTimetables()
          .then(() => {
            setHasLoadedTimetables(true);
          })
          .catch((error) => {
            console.error("Failed to load timetables:", error);
            setLoadingError(
              error instanceof Error
                ? error.message
                : "Failed to load timetables"
            );
          });
      } else if (event === "SIGNED_OUT") {
        setHasLoadedTimetables(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadTimetables, hasLoadedTimetables]);

  return (
    <div>
      <div className="flex h-screen">
        <ErrorBoundary>
          <CollapsibleSidebar />
          <MobileSidebarOverlay />
        </ErrorBoundary>

        <div
          className={cn(
            "flex flex-col lg:flex-row flex-1 transition-all duration-300",
            "lg:ml-0"
          )}
        >
          <ResizablePanelGroup
            direction="horizontal"
            className="hidden lg:flex flex-1 h-full relative z-50"
          >
            <ResizablePanel
              defaultSize={50}
              className="flex flex-col relative z-50"
            >
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => {
                    const sidebarStore = useSidebarStore.getState();
                    if (sidebarStore?.toggleSidebar) {
                      sidebarStore.toggleSidebar();
                    }
                  }}
                  className={cn(
                    "lg:hidden flex items-center justify-center w-10 h-10",
                    "bg-[var(--color-background)]/90 backdrop-blur-sm rounded-lg",
                    "border hover:bg-accent hover:text-accent-foreground",
                    "transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => setUseChatInterface(true)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-md transition-all",
                      useChatInterface
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setUseChatInterface(false)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-md transition-all",
                      !useChatInterface
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    🔘 Buttons
                  </button>
                </div>
              </div>

              {/* Chat Interface */}
              {useChatInterface && !settingsMode && (
                <div className="flex-1 p-4 pt-16">
                  <div className="h-full max-w-2xl mx-auto">
                    {/* Chatbot with transparent background and full height */}
                    <div className="bg-transparent h-[calc(100vh-100px)] w-full">
                      {isLoading ? (
                        <div className="p-6">
                          <LoadingSkeleton lines={5} />
                        </div>
                      ) : !isAuthenticated ? (
                        <div className="p-6 flex flex-col items-center justify-center h-full">
                          <div className="text-center max-w-md">
                            <h3 className="text-lg font-medium mb-2">
                              Sign in to manage your timetables
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Create an account or sign in to save and manage
                              your class schedules
                            </p>
                            <button
                              onClick={() => setLoginDialog(true)}
                              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                            >
                              <LogIn className="w-4 h-4 mr-2" />
                              Sign in
                            </button>
                          </div>
                        </div>
                      ) : loadingError || error ? (
                        <div className="p-6 text-center">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-600">
                              {loadingError || error}
                            </p>
                            <button
                              onClick={() => {
                                setLoadingError(null);
                                loadTimetables?.().catch((err) =>
                                  console.error(err)
                                );
                              }}
                              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
                            >
                              Try again
                            </button>
                          </div>
                        </div>
                      ) : (
                        <TimetableChatbot className="h-full" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Traditional Button Interface */}
              {!useChatInterface && !settingsMode && (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="flex flex-col items-center justify-center w-2xl pr-4">
                    <div className="text-left w-full">
                      <h1 className="text-7xl font-bold mb-2">
                        All your classes,
                      </h1>
                      <h2 className="text-7xl font-bold mb-8">
                        perfectly organized.
                      </h2>
                    </div>

                    <div className="w-full space-y-6">
                      <div className="w-full flex justify-start">
                        <div className="w-full max-w-[51rem] overflow-visible">
                          <div className="flex flex-row flex-wrap w-full gap-2 justify-start items-center">
                            <button
                              onClick={() => setIsDialogOpen(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              ➕<span className="font-geist">Add Subject</span>
                            </button>

                            <button
                              onClick={() => setIsCourseListDialogOpen(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              ✏️
                              <span>Edit Subject</span>
                            </button>

                            <button
                              onClick={() => setIsDialogOpen(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              🗑️
                              <span>Delete Subject</span>
                            </button>

                            <button
                              onClick={() => setIsJsonDialogOpen(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              📃
                              <span>Add Json</span>
                            </button>

                            <button
                              onClick={() => setIsCopyJsonDialogOpen(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              📒
                              <span>Copy Json</span>
                            </button>

                            <button
                              onClick={() => setSettingsMode(true)}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              ⚙️
                              <span>Settings</span>
                            </button>

                            <button
                              onClick={() => handleScreenshot("png")}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              📷
                              <span className="font-geist">PNG</span>
                            </button>

                            <button
                              onClick={() => handleScreenshot("jpeg")}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              🖼️
                              <span className="font-geist">JPEG</span>
                            </button>

                            <button
                              onClick={() => handleScreenshot("svg")}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              🎨
                              <span className="font-geist">SVG</span>
                            </button>

                            <button
                              onClick={handleCopyToClipboard}
                              className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                            >
                              📋
                              <span className="font-geist">Copy</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsMode && (
                <div className="flex flex-col items-end justify-center flex-1">
                  <div className="flex flex-col items-center justify-center w-2xl pr-4">
                    <div className="w-full space-y-6">
                      <div className="w-full flex justify-start">
                        <div className="w-full max-w-[51rem] overflow-visible">
                          <div className="flex flex-row flex-wrap w-full gap-2 justify-start items-center">
                            <SettingsArea setSettingsMode={setSettingsMode} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <AuthDialog
                isOpen={loginDialog}
                onClose={() => setLoginDialog(false)}
              />
              <CourseDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
              />
              <AddJsonDialog
                isOpen={isJsonDialogOpen}
                onClose={() => setIsJsonDialogOpen(false)}
              />
              <CopyJsonDialog
                isOpen={isCopyJsonDialogOpen}
                onClose={() => setIsCopyJsonDialogOpen(false)}
              />
              <CourseListDialog
                isOpen={isCourseListDialogOpen}
                onClose={() => setIsCourseListDialogOpen(false)}
              />

              <SaveTimetableDialog
                isOpen={isSaveTimetableDialogOpen}
                onClose={() => setIsSaveTimetableDialogOpen(false)}
              />
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors z-50"
            />

            <ResizablePanel
              defaultSize={20}
              className="relative h-screen flex justify-center items-center pt-8 px-8 z-50"
            >
              {currentView === "note-editor" && (
                <div
                  className={cn(
                    "absolute inset-0 w-full h-full p-4",
                    "transition-all duration-300 ease-in-out",
                    isTransitioning
                      ? "opacity-0 scale-95"
                      : "opacity-100 scale-100"
                  )}
                  role="region"
                  aria-label="Note editor view"
                >
                  <ExcalidrawNoteEditor
                    isVisible={currentView === "note-editor"}
                    noteId={selectedNoteId}
                    onBack={handleBackToNoteList}
                    onSave={handleSaveNote}
                    className="w-full h-full"
                  />
                </div>
              )}

              {currentView !== "note-editor" && (
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as "timetable" | "note-list")
                  }
                  className="w-full h-full flex flex-col"
                >
                  <div className="w-full flex justify-between items-center px-4 sm:px-0">
                    <TabsList className="bg-transparent p-0 h-auto text-sm sm:text-sm">
                      <TabsTrigger
                        value="timetable"
                        className="bg-transparent shadow-none rounded-none px-0 py-0 text-sm sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Timetable
                      </TabsTrigger>
                      <TabsTrigger
                        value="note-list"
                        className="bg-transparent shadow-none rounded-none px-0 py-0 ml-4 text-sm sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Notes
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-input-border hover:bg-input-hover transition-all duration-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title="Refresh data"
                      >
                        <RotateCcw 
                          className={`h-4 w-4 text-muted-foreground ${
                            isRefreshing ? 'animate-spin' : ''
                          }`} 
                        />
                      </button>
                      
                      {activeTab === "timetable" && (
                        <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white">
                          📱
                          <span className="ml-1">{selectedDevice.model}</span>
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          {deviceModels.map((device) => (
                            <DropdownMenuItem
                              key={device.model}
                              onClick={() => handleDeviceSelect(device)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {device.model}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {device.width} × {device.height}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <TabsContent value="note-list" className="flex-1 mt-0">
                    <div
                      className={cn(
                        "w-full h-full pt-6",
                        "transition-all duration-300 ease-in-out",
                        isTransitioning
                          ? "opacity-0 scale-95"
                          : "opacity-100 scale-100"
                      )}
                      role="region"
                      aria-label="Notes list view"
                    >
                      <NoteListView
                        isVisible={activeTab === "note-list"}
                        onSelectNote={handleSelectNote}
                        onCreateNewNote={handleCreateNewNote}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="timetable" className="flex-1 mt-0">
                    <Card className="border-0 shadow-none w-full lg:max-w-[1000px] h-full bg-transparent rounded-2xl justify-center items-center mx-auto">
                      <CardContent
                        ref={containerRef}
                        className={`w-[${containerDimensions.width}px] h-[${containerDimensions.height}px] p-0`}
                        style={{
                          width: `${containerDimensions.width}px`,
                          height: `${containerDimensions.height}px`,
                        }}
                      >
                        <div
                          className="w-full h-full flex flex-col"
                          role="div"
                          aria-label="Three-view notes system"
                        >
                          <div
                            className={cn(
                              "w-full flex-1 rounded-2xl overflow-hidden",
                              "transition-all duration-300 ease-in-out",
                              "px-2 sm:px-0", // Mobile padding
                              isTransitioning
                                ? "opacity-0 scale-95"
                                : "opacity-100 scale-100"
                            )}
                            role="region"
                            aria-label="Timetable view"
                          >
                            <Timetable />
                          </div>

                          {isTransitioning && (
                            <div
                              className="absolute inset-0 bg-[var(--color-background)]/50 backdrop-blur-sm flex items-center justify-center z-50"
                              role="status"
                              aria-label="Loading"
                            >
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Loading...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>

          <div className="flex flex-col lg:hidden flex-1">
            <div className="w-full flex flex-col relative">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => {
                    const sidebarStore = useSidebarStore.getState();
                    if (sidebarStore?.toggleSidebar) {
                      sidebarStore.toggleSidebar();
                    }
                  }}
                  className="lg:hidden p-2 rounded-md bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => setUseChatInterface(true)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-md transition-all",
                      useChatInterface
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setUseChatInterface(false)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-md transition-all",
                      !useChatInterface
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    🔘 Buttons
                  </button>
                </div>
              </div>

              {/* <div className="flex-1 p-4 pt-20">
                <Timetable />
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
