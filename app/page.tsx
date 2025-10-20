"use client";
import React, { useEffect, useRef, useState } from "react";
import Timetable from "@/components/timetable";
import CourseDialog from "@/components/course-dialog";
import { useCourseStore } from "@/stores/courseStore";

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
import { ChevronDownIcon, Calendar, FileText, Smartphone } from "lucide-react";
import { Chatbot } from "@/components/chatbot";
import { cn } from "@/lib/utils";
import { useTimetableStore } from "@/stores/timetableStore";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { streamText } from "@/lib/chrome-ai";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isCopyJsonDialogOpen, setIsCopyJsonDialogOpen] = useState(false);
  const [isCourseListDialogOpen, setIsCourseListDialogOpen] = useState(false);

  const [settingsMode, setSettingsMode] = useState(false);
  const [cropperSize, setCropperSize] = useState({ width: 100, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSaveTimetableDialogOpen, setIsSaveTimetableDialogOpen] =
    useState(false);
  const [useChatInterface, setUseChatInterface] = useState(true);


  type ViewMode = "timetable" | "note-list" | "note-editor";
  const [currentView, setCurrentView] = useState<ViewMode>("timetable");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"timetable" | "note-list">(
    "timetable"
  );
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

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
          savedNote = { id: newNoteId };
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
    }
  };



  const handleAiStream = async (prompt: string = "Hello, how are you") => {
    setIsAiStreaming(true);
    setAiResponse("");

    try {
      const result = await streamText({
        prompt: prompt,
      });

      for await (const chunk of result.textStream) {
        setAiResponse((prev) => prev + chunk);
        console.log(chunk);
      }
    } catch (error) {
      console.error("Error streaming AI response:", error);

      const { toast } = await import("sonner");
      toast.error("AI streaming failed", {
        description: "Please try again later.",
        duration: 3000,
      });
    } finally {
      setIsAiStreaming(false);
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
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTimetableId) {
      initializeCoursesForTimetable(activeTimetableId).catch((error) => {
        console.error("Failed to load courses for timetable:", error);
      });
    }
  }, [activeTimetableId]);

  useEffect(() => {
    if (loadTimetables) {
      loadTimetables().catch((error) => {
        console.error("Failed to load timetables:", error);
        setLoadingError(
          error instanceof Error ? error.message : "Failed to load timetables"
        );
      });
    }
  }, [loadTimetables]);

  const [selectedDevice, setSelectedDevice] = useState(deviceModels[0]);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 330,
    height: 717,
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

    const scaleFactor = 4;
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

  return (
    <div>
      <div className="h-screen">
        <div className="flex flex-col lg:flex-row h-full">
          <ResizablePanelGroup
            direction="horizontal"
            className="hidden lg:flex flex-1 h-full relative z-50"
          >
            <ResizablePanel
              defaultSize={50}
              className="flex flex-col relative z-50"
            >
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
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

              {useChatInterface && !settingsMode && (
                <div className="flex-1 p-4 pt-16">
                  <div className="h-full max-w-2xl mx-auto">
                    <div className="bg-transparent h-[calc(100vh-100px)] w-full">
                      {isLoading ? (
                        <div className="p-6">
                          <LoadingSkeleton lines={5} />
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
                        <Chatbot className="h-full" />
                      )}
                    </div>
                  </div>
                </div>
              )}

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

                      {aiResponse && (
                        <div className="w-full flex justify-start mt-4">
                          <div className="w-full max-w-[51rem] overflow-visible">
                            <div className="bg-white border border-input-border rounded-2xl p-4">
                              <h3 className="text-sm font-medium text-primary mb-2">
                                AI Response:
                              </h3>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {aiResponse}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {settingsMode && (
                <div className="flex flex-col items-center justify-center flex-1">
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
              className="w-2 z-50"
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
                  <div className="w-full flex items-center justify-end px-4 sm:px-0">
                    <TabsList className="bg-transparent p-0 h-auto text-sm sm:text-sm flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="timetable"
                            className="bg-transparent shadow-none rounded-md px-3 py-2 text-sm sm:text-sm cursor-pointer hover:bg-accent/50 data-[state=active]:bg-gray-200 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm transition-all duration-200 flex items-center justify-center"
                          >
                            <Calendar className={cn("h-4 w-4 transition-all duration-200", activeTab === "timetable" && "scale-110")} />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Timetable</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="note-list"
                            className="bg-transparent shadow-none rounded-md px-3 py-2 text-sm sm:text-sm cursor-pointer hover:bg-accent/50 data-[state=active]:bg-gray-200 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm transition-all duration-200 flex items-center justify-center"
                          >
                            <FileText className={cn("h-4 w-4 transition-all duration-200", activeTab === "note-list" && "scale-110")} />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Notes</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger className="bg-transparent shadow-none rounded-md px-2 py-2 text-sm sm:text-sm data-[state=open]:bg-accent hover:bg-accent cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring flex items-center justify-center">
                              <Smartphone className="h-4 w-4" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Timetable Size</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-64 max-h-60 overflow-y-auto">
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
                    </TabsList>
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
                              "px-2 sm:px-0",
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
