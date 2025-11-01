"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { BuiltInAIUIMessage } from "@built-in-ai/core";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";
import { useSettingsStore } from "@/stores/settingsStore";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp,
  Square,
  Copy,
  RefreshCcw,
  MessageSquare,
  Plus,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { ChatContainerContent, ChatContainerRoot } from "./ui/chat-container";
import { Message, MessageAvatar, MessageContent, MessageActions, MessageAction } from "./ui/message";
import { Markdown } from "./ui/markdown";
import { Loader } from "./ui/loader";
import { PromptSuggestion } from "./ui/prompt-suggestion";

import { Tool, type ToolPart } from "@/components/ui/tool";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useChatStore } from "@/stores/chatStore";

import {
  FunctionDeclarationsTool,
  getAI,
  getGenerativeModel,
  InferenceMode,
  Schema,
} from "firebase/ai";
import { db, firebaseApp } from "@/lib/firebase";

export function Chatbot({ className }: any) {

  const [input, setInput] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(
    null
  );
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [copiedMessageIds, setCopiedMessageIds] = useState<Set<string>>(new Set());
  const isLoadingMessagesRef = useRef(false);
  const isCreatingChatRef = useRef(false);

  const {
    timetables,
    addTimetable,
    updateTimetable,
    setActiveTimetable,
    activeTimetableId,
    getActiveTimetableId,
    deleteTimetable,
    getTimetable,
    updateMany,
    getTimetables,
  } = useTimetableStore();
  const {
    courses,
    addCourse,
    addCoursesBulk,
    updateCourse,
    deleteCourse,
    resetCourses,
    getCourses,
  } = useCourseStore();
  
  const { selectedWallpaper, websiteBackgroundImage } = useSettingsStore();

  const currentCourses = activeTimetableId ? getCourses(activeTimetableId) : [];
  const {
    chats,
    addChat,
    updateChat,
    activeChatId,
    setActiveChat,
    clearActiveChat,
  } = useChatStore();

  const [messages, setMessages] = useState<BuiltInAIUIMessage[]>([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<Error | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  // Chrome AI Language Model state
  const [languageModelAvailability, setLanguageModelAvailability] = useState<
    string | null
  >(null);
  const [languageModelDownloadProgress, setLanguageModelDownloadProgress] =
    useState<number>(0);
  const [isLanguageModelDownloading, setIsLanguageModelDownloading] =
    useState(false);
  const [languageModelSession, setLanguageModelSession] = useState<any>(null);

  const timetableTool: FunctionDeclarationsTool = {
    functionDeclarations: [
      {
        name: "getCourses",
        description: "Return all courses for a given timetable.",
        parameters: Schema.object({
          properties: {
            timetableId: Schema.string({
              description: "The ID of the timetable to filter courses by.",
            }),
          },
          required: ["timetableId"],
        }),
      },
      {
        name: "addCourse",
        description:
          "Create a new course (and its sessions) under a timetable. Missing session_id values will be generated.",
        parameters: Schema.object({
          properties: {
            timetableId: Schema.string({
              description: "The ID of the timetable to add the course to.",
            }),
            course: Schema.object({
              description:
                "CourseWithSessionsInput payload. Any extra fields are accepted.",
              properties: {
                id: Schema.string({
                  description: "Optional client-provided course ID.",
                }),
                timetable_id: Schema.string({
                  description: "Optional; will be overridden by timetableId.",
                }),
                name: Schema.string({ description: "Course name." }),
                code: Schema.string({ description: "Course code." }),
                color: Schema.string({ description: "Display color." }),
                sessions: Schema.array({
                  description: "List of sessions included with the course.",
                  items: Schema.object({
                    properties: {
                      days: Schema.array({
                        description: "Array of days e.g., ['MON', 'WED'].",
                        items: Schema.string(),
                      }),
                      startTime: Schema.string({
                        description: "Start time (HH:mm).",
                      }),
                      endTime: Schema.string({
                        description: "End time (HH:mm).",
                      }),
                      location: Schema.string({ description: "Location." }),
                    },
                  }),
                }),
              },
              required: ["sessions"],
            }),
          },
          required: ["timetableId", "course"],
        }),
      },
      {
        name: "addCoursesBulk",
        description:
          "Create multiple new courses (and their sessions) under a timetable in a single operation. Missing session_id values will be generated.",
        parameters: Schema.object({
          properties: {
            timetableId: Schema.string({
              description: "The ID of the timetable to add the courses to.",
            }),
            courses: Schema.array({
              description:
                "Array of CourseWithSessionsInput payloads. Any extra fields are accepted.",
              items: Schema.object({
                properties: {
                  id: Schema.string({
                    description: "Optional client-provided course ID.",
                  }),
                  timetable_id: Schema.string({
                    description: "Optional; will be overridden by timetableId.",
                  }),
                  name: Schema.string({ description: "Course name." }),
                  code: Schema.string({ description: "Course code." }),
                  color: Schema.string({ description: "Display color." }),
                  sessions: Schema.array({
                    description: "List of sessions included with the course.",
                    items: Schema.object({
                      properties: {
                        days: Schema.array({
                          description: "Array of days e.g., ['MON', 'WED'].",
                          items: Schema.string(),
                        }),
                        startTime: Schema.string({
                          description: "Start time (HH:mm).",
                        }),
                        endTime: Schema.string({
                          description: "End time (HH:mm).",
                        }),
                        location: Schema.string({ description: "Location." }),
                      },
                    }),
                  }),
                },
                required: ["sessions"],
              }),
            }),
          },
          required: ["timetableId", "courses"],
        }),
      },
      {
        name: "updateCourse",
        description:
          "Update fields on an existing course within a timetable. Also updates updatedAt.",
        parameters: Schema.object({
          properties: {
            timetableId: Schema.string({
              description: "The timetable that contains the course.",
            }),
            courseId: Schema.string({
              description: "The course ID to update.",
            }),
            updates: Schema.object({
              description:
                "Partial<CourseWithSessions>. Any supplied fields will overwrite existing values.",
              properties: {
                name: Schema.string(),
                code: Schema.string(),
                color: Schema.string(),
                sessions: Schema.array({
                  items: Schema.object({
                    properties: {
                      session_id: Schema.string(),
                      days: Schema.array({
                        description: "Array of days e.g., ['MON', 'WED'].",
                        items: Schema.string(),
                      }),
                      startTime: Schema.string(),
                      endTime: Schema.string(),
                      location: Schema.string(),
                    },
                  }),
                }),
              },
            }),
          },
          required: ["timetableId", "courseId", "updates"],
        }),
      },
      {
        name: "deleteCourse",
        description: "Delete a course from a timetable.",
        parameters: Schema.object({
          properties: {
            timetableId: Schema.string({
              description: "The timetable containing the course.",
            }),
            courseId: Schema.string({
              description: "The ID of the course to delete.",
            }),
          },
          required: ["timetableId", "courseId"],
        }),
      },
      {
        name: "resetCourses",
        description: "Remove all courses from state.",
        parameters: Schema.object({
          properties: {},
        }),
      },
      {
        name: "addTimetable",
        description:
          "Create a new timetable (named automatically, set active) and return it.",
        parameters: Schema.object({
          properties: {},
        }),
      },
      {
        name: "setActiveTimetable",
        description: "Set the currently active timetable by ID.",
        parameters: Schema.object({
          properties: {
            id: Schema.string({
              description: "The timetable ID to set as active.",
            }),
          },
          required: ["id"],
        }),
      },
      {
        name: "updateTimetable",
        description:
          "Replace an existing timetable with the provided object (matched by id).",
        parameters: Schema.object({
          properties: {
            updatedTimetable: Schema.object({
              description: "Full Timetable object to persist.",
              properties: {
                id: Schema.string(),
                name: Schema.string(),
                userId: Schema.string(),
                createdAt: Schema.string({
                  description: "Creation timestamp (ISO 8601 date-time).",
                }),
                updatedAt: Schema.string({
                  description: "Last update timestamp (ISO 8601 date-time).",
                }),
                isActive: Schema.boolean(),
              },
              required: ["id"],
            }),
          },
          required: ["updatedTimetable"],
        }),
      },
      {
        name: "getTimetable",
        description: "Fetch a single timetable by ID.",
        parameters: Schema.object({
          properties: {
            id: Schema.string({
              description: "The timetable ID to retrieve.",
            }),
          },
          required: ["id"],
        }),
      },
      {
        name: "updateMany",
        description:
          "Batch update many timetables. For each item, merges provided fields and refreshes updatedAt.",
        parameters: Schema.object({
          properties: {
            updates: Schema.array({
              description: "Array of updates to apply.",
              items: Schema.object({
                properties: {
                  id: Schema.string({
                    description: "Timetable ID to update.",
                  }),
                  updates: Schema.object({
                    description:
                      "Partial Timetable (excluding id, createdAt, courses).",
                    properties: {
                      name: Schema.string(),
                      userId: Schema.string(),
                      updatedAt: Schema.string({
                        description:
                          "Last update timestamp (ISO 8601 date-time).",
                      }),
                      isActive: Schema.boolean(),
                    },
                  }),
                },
                required: ["id", "updates"],
              }),
            }),
          },
          required: ["updates"],
        }),
      },
      {
        name: "deleteTimetable",
        description:
          "Delete a timetable by ID. If it was active, clears the activeTimetableId.",
        parameters: Schema.object({
          properties: {
            id: Schema.string({
              description: "The timetable ID to delete.",
            }),
          },
          required: ["id"],
        }),
      },
      {
        name: "getTimetables",
        description: "Return all timetables.",
        parameters: Schema.object({
          properties: {},
        }),
      },
      {
        name: "getTimetableActiveId",
        description: "Get the ID of the currently active timetable.",
        parameters: Schema.object({
          properties: {},
        }),
      },
    ],
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const streamContentRef = useRef<string>("");
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (
    message: { text: string },
    options?: any
  ) => {
    if (!message.text.trim()) return;

    const userMessage: any = {
      id: uuidv4(),
      role: "user",
      content: message.text,
      parts: [{ type: "text", text: message.text }],
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus("thinking");
    setError(null);

    abortControllerRef.current = new AbortController();

    const jsonSchema = Schema.enumString({
      enum: ["tool-call", "answer-prompt"],
    });

    try {
      const googleAI = getAI(firebaseApp);

      // Step 1: Create decision model (ONLY_ON_DEVICE) to determine intent
      const decisionModel = getGenerativeModel(googleAI, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        onDeviceParams: {
          promptOptions: {
            responseConstraint: jsonSchema,
          },
        },
      });

      // System prompt for tool calling decision
      const systemPrompt = `Think step by step before deciding whether to call a tool or answer the prompt directly.

          STEP-BY-STEP ANALYSIS:
          1. ANALYZE THE CURRENT MESSAGE: What is the user explicitly asking for?
          2. CONSIDER PREVIOUS CONTEXT: Does this message reference or continue from previous instructions that involved course management?
          3. IDENTIFY INTENT: Is this about course operations (add/delete/edit/manage) or general conversation?
          4. CHECK FOR IMPLICIT REQUESTS: Even if not explicitly stated, does the context suggest course management is needed?
          5. MAKE DECISION: Based on the analysis above, choose the appropriate action.

          DECISION RULES:
          - Answer tool-call if user wants to add, delete, edit, or manage courses (explicitly or implicitly based on context)
          - Answer answer-prompt for simple questions, help, or general conversation that doesn't involve course management

          IMPORTANT: Pay special attention to context from previous messages. If previous instructions mentioned course operations and the current message seems to be a continuation or clarification of those instructions, consider tool-call even if the current message alone seems conversational.`;

      // Get decision from on-device model with error handling
      let decisionResult;
      try {
        decisionResult = await decisionModel.generateContent([
          { text: systemPrompt },
          { text: `User message: "${message.text}"` },
        ]);
      } catch (decisionError) {
        console.error("Decision model error:", decisionError);
        // Default to answer-prompt if decision model fails
        decisionResult = { response: { text: () => "answer-prompt" } };
      }

      setStatus("submitted");

      const rawDecision = decisionResult.response.text().trim();
      console.log("Raw decision response:", rawDecision);
      console.log("Raw decision type:", typeof rawDecision);

      // Try to parse as JSON if it looks like JSON
      let decision;
      try {
        if (rawDecision.startsWith('"') && rawDecision.endsWith('"')) {
          decision = JSON.parse(rawDecision);
        } else if (rawDecision.startsWith("{") || rawDecision.startsWith("[")) {
          const parsed = JSON.parse(rawDecision);
          decision = parsed;
        } else {
          decision = rawDecision;
        }
      } catch (e) {
        decision = rawDecision;
      }

      console.log("Parsed decision:", decision);
      console.log("Decision type:", typeof decision);

      // Step 2: Route to appropriate model based on decision
      let targetModel;
      let modelHistory;

      // Check if decision indicates tool-call (handle various response formats)
      const isToolCall =
        decision === "tool-call" ||
        (typeof decision === "object" && decision?.value === "tool-call") ||
        (typeof decision === "string" &&
          decision.toLowerCase().includes("tool-call"));

      console.log("Is tool call?", isToolCall);

      if (isToolCall) {
        // Use ONLY_IN_CLOUD for tool calls
        console.log("🌐 Using CLOUD model for tool call response");
        targetModel = getGenerativeModel(googleAI, {
          mode: InferenceMode.ONLY_IN_CLOUD,
          inCloudParams: {
            model: "gemini-2.5-flash",
            systemInstruction: `

You have access to the functions listed at the end of this prompt. When the user asks to read or modify timetables/courses, you MUST decide to call the function call or answering user question.
If you decide to do function call. You must follow the JSON format specified below.

IMPORTANT
- The current active timetable ID is: ${activeTimetableId}.
- MANDATORY: When making ANY function call that requires a timetableId parameter, you MUST ALWAYS pass "${activeTimetableId}" as the timetableId value unless the user explicitly requests a different specific timetable ID.
- CRITICAL: Never omit the timetableId parameter or use placeholder values. Always use the exact value "${activeTimetableId}" for all timetable-related operations.
- STRICTLY FORBIDDEN: You are NOT ALLOWED to pass null, undefined, or any placeholder values for timetableId. MUST use "${activeTimetableId}".
- Whenever a function requires a timetableId, always pass "${activeTimetableId}" unless the user explicitly requests a different timetable ID.

CURRENT COURSES CONTEXT
The following courses are currently available in the active timetable (${activeTimetableId}):
${JSON.stringify(courses, null, 2)}

- timetableId: ALWAYS use "${activeTimetableId}" - never null, undefined, or placeholders
- courseId: Use the "code" field from the courses array, NOT the "id" field, not the course name, or any other identifier

PARAMETER COMPLETION REQUIREMENT
If user doesn't provide enough parameters or specify required parameters, you MUST create them by yourself. This is very important:
- Generate reasonable default values for missing parameters
- Use logical assumptions based on context and available data
- Never ask the user for missing parameters - always complete them automatically
- Ensure all function calls have complete and valid parameters

COURSE COLOR PALETTE REQUIREMENT

1. AUTOMATIC COLOR ASSIGNMENT - Automatically assign a pastel color from the approved palette when user doesn't specify one, never ask. YOU ARE OBLIGED TO PROVIDE A COLOR if the user didn't mention one.
2. CATEGORY-BASED SELECTION - Match colors to categories: Tech uses soft blues/mint greens, Design uses pinks/lavenders, Business uses peach/yellows.
3. COLOR VALIDATION - Convert any harsh or bright user-provided colors to the nearest pastel equivalent automatically.
4. EVEN DISTRIBUTION - Rotate colors across courses to avoid duplicates and maintain visual variety.
5. PASTEL-ONLY ENFORCEMENT - Use only soft colors with high brightness and low saturation from the approved palette.
6. HEX CODE FORMAT - All colors MUST be provided in hex code format (e.g., #FFB6C1, #E6E6FA, #F0E68C). NEVER use color names like "red", "blue", "pink" - ONLY hex codes are allowed.

Always tell the user the operation that you do what function you call and conclusion of your action`,
            tools: [timetableTool],
          },
        });
      } else {
        // Use ONLY_ON_DEVICE for answer prompts
        console.log("📱 Using ON-DEVICE model for answer response");
        targetModel = getGenerativeModel(googleAI, {
          mode: InferenceMode.ONLY_ON_DEVICE,
        });
      }

      modelHistory = [
        ...messages.map((msg: any) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      ];

      console.log(modelHistory);
      console.log(messages);

      const chat = targetModel.startChat({
        history: modelHistory as any,
      });

      const assistantMessage: any = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        parts: [{ type: "text", text: "" }],
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessage.id);
      streamContentRef.current = "";

      console.log(message.text);

      try {
        const result = await chat.sendMessage(message.text);
        const functionCalls = result.response.functionCalls();

        console.log("Response result:", result);
        console.log("Function calls:", functionCalls);

        let functionCall: any = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
          console.log("Processing function calls...");

          if (functionCall[0]) {
            const { name: functionName, args } = functionCall[0];
            let functionResult: any = null;
            let functionDescription = "";

            try {
              // Execute the function based on its name
              switch (functionName) {
                case "getCourses":
                  functionResult = getCourses(args.timetableId);
                  functionDescription = `Retrieved ${functionResult.length} courses for timetable ${args.timetableId}`;
                  break;

                case "addCourse":
                  functionResult = addCourse(args.timetableId, args.course);
                  functionDescription = `Added course "${args.course.name}" (${args.course.code}) to timetable ${args.timetableId}`;
                  break;

                case "addCoursesBulk":
                  functionResult = addCoursesBulk(
                    args.timetableId,
                    args.courses
                  );
                  functionDescription = `Added ${args.courses.length} courses to timetable ${args.timetableId}`;
                  break;

                case "updateCourse":
                  updateCourse(args.timetableId, args.courseId, args.updates);
                  functionResult = { success: true };
                  functionDescription = `Updated course ${args.courseId} in timetable ${args.timetableId}`;
                  break;

                case "deleteCourse":
                  deleteCourse(args.timetableId, args.courseId);
                  functionResult = { success: true };
                  functionDescription = `Deleted course ${args.courseId} from timetable ${args.timetableId}`;
                  break;

                case "resetCourses":
                  resetCourses();
                  functionResult = { success: true };
                  functionDescription = "Reset all courses";
                  break;

                case "addTimetable":
                  functionResult = addTimetable();
                  functionDescription = `Created new timetable "${functionResult.name}" with ID ${functionResult.id}`;
                  break;

                case "setActiveTimetable":
                  setActiveTimetable(args.id);
                  functionResult = { success: true };
                  functionDescription = `Set timetable ${args.id} as active`;
                  break;

                case "updateTimetable":
                  updateTimetable(args.updatedTimetable);
                  functionResult = { success: true };
                  functionDescription = `Updated timetable ${args.updatedTimetable.id}`;
                  break;

                case "getTimetable":
                  functionResult = getTimetable(args.id);
                  functionDescription = functionResult
                    ? `Retrieved timetable "${functionResult.name}" (${args.id})`
                    : `Timetable ${args.id} not found`;
                  break;

                case "updateMany":
                  updateMany(args.updates);
                  functionResult = { success: true };
                  functionDescription = `Updated ${args.updates.length} timetables`;
                  break;

                case "deleteTimetable":
                  deleteTimetable(args.id);
                  functionResult = { success: true };
                  functionDescription = `Deleted timetable ${args.id}`;
                  break;

                case "getTimetables":
                  functionResult = getTimetables();
                  functionDescription = `Retrieved ${functionResult.length} timetables`;
                  break;

                case "getTimetableActiveId":
                  functionResult = getActiveTimetableId();
                  functionDescription = functionResult
                    ? `Active timetable ID: ${functionResult}`
                    : "No active timetable";
                  break;

                default:
                  functionResult = {
                    error: `Unknown function: ${functionName}`,
                  };
                  functionDescription = `Error: Unknown function "${functionName}"`;
              }

              // Create a comprehensive response
              let finalText = `${functionDescription}\n\nFunction executed: ${functionName}\nResult: ${JSON.stringify(
                functionResult,
                null,
                2
              )}`;

              // Ensure we always have content to display
              if (!finalText.trim()) {
                finalText = "Task completed successfully.";
              }

              let chunkBuffer = finalText;
              let displayedContent = "";
              let hasStartedStreaming = false;

              streamIntervalRef.current = setInterval(() => {
                if (chunkBuffer.length > 0) {
                  const charsToAdd = Math.min(3, chunkBuffer.length);
                  displayedContent += chunkBuffer.slice(0, charsToAdd);
                  chunkBuffer = chunkBuffer.slice(charsToAdd);

                  // Only set streaming status when we actually receive content
                  if (!hasStartedStreaming) {
                    setIsStreaming(true);
                    setStatus("streaming");
                    hasStartedStreaming = true;
                  }

                  if (displayedContent.trim()) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessage.id
                          ? {
                              ...msg,
                              content: displayedContent,
                              parts: [{ type: "text", text: displayedContent }],
                            }
                          : msg
                      )
                    );
                  }
                }
              }, 30);

              const waitForBufferComplete = () => {
                return new Promise<void>((resolve) => {
                  const checkBuffer = () => {
                    if (chunkBuffer.length === 0) {
                      resolve();
                    } else {
                      setTimeout(checkBuffer, 30);
                    }
                  };
                  checkBuffer();
                });
              };

              await waitForBufferComplete();
            } catch (error) {
              console.error("Function execution error:", error);
              const errorText = `Error executing function ${functionName}: ${
                error instanceof Error ? error.message : "Unknown error"
              }. Please try again or rephrase your request.`;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id
                    ? {
                        ...msg,
                        content: errorText,
                        parts: [{ type: "text", text: errorText }],
                      }
                    : msg
                )
              );
            }
          }
        } else {
          console.log("No function calls, using streaming response...");

          try {
            const streamResult = await chat.sendMessageStream(message.text);

            let chunkBuffer = "";
            let displayedContent = "";
            let hasStartedStreaming = false;
            let hasReceivedContent = false;

            streamIntervalRef.current = setInterval(() => {
              if (chunkBuffer.length > 0) {
                const charsToAdd = Math.min(3, chunkBuffer.length);
                displayedContent += chunkBuffer.slice(0, charsToAdd);
                chunkBuffer = chunkBuffer.slice(charsToAdd);

                if (displayedContent.trim()) {
                  hasReceivedContent = true;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? {
                            ...msg,
                            content: displayedContent,
                            parts: [{ type: "text", text: displayedContent }],
                          }
                        : msg
                    )
                  );
                }
              }
            }, 30);

            for await (const chunk of streamResult.stream) {
              if (abortControllerRef.current?.signal.aborted) {
                console.log("Generation aborted by user");
                // Ensure aborted message has content
                if (!hasReceivedContent || !streamContentRef.current.trim()) {
                  const abortedMessage = "Response was stopped by user.";
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? {
                            ...msg,
                            content: abortedMessage,
                            parts: [{ type: "text", text: abortedMessage }],
                          }
                        : msg
                    )
                  );
                }
                break;
              }

              const delta = chunk.text();
              if (!delta) continue;

              // Only set streaming status when we actually receive content
              if (!hasStartedStreaming) {
                setIsStreaming(true);
                setStatus("streaming");
                hasStartedStreaming = true;
              }

              if (delta) {
                chunkBuffer += delta;
                streamContentRef.current += delta;
                hasReceivedContent = true;
              }
            }

            const waitForBufferComplete = () => {
              return new Promise<void>((resolve) => {
                const checkBuffer = () => {
                  if (chunkBuffer.length === 0) {
                    resolve();
                  } else {
                    setTimeout(checkBuffer, 30);
                  }
                };
                checkBuffer();
              });
            };

            await waitForBufferComplete();

            // Ensure we always have content to display
            if (!hasReceivedContent || !streamContentRef.current.trim()) {
              const fallbackContent =
                "I understand your request. How can I help you further?";
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id
                    ? {
                        ...msg,
                        content: fallbackContent,
                        parts: [{ type: "text", text: fallbackContent }],
                      }
                    : msg
                )
              );
            }
          } catch (streamError) {
            console.error("Streaming error:", streamError);
            const fallbackMessage =
              "I apologize, but I encountered an issue generating a response. Please try rephrasing your question or try again.";

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? {
                      ...msg,
                      content: fallbackMessage,
                      parts: [{ type: "text", text: fallbackMessage }],
                    }
                  : msg
              )
            );
          }
        }
      } catch (err) {
        console.error("Streaming error:", err);
        setStatus("error");
      } finally {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        setIsStreaming(false);
        setStreamingMessageId(null);
        setStatus("idle");
      }
    } catch (err) {
      console.error("Google AI error:", err);
      setError(err as Error);

      setMessages((prev) => {
        const filtered = prev.filter(
          (msg: any) => msg.role !== "assistant" || msg.content !== ""
        );
        return [
          ...filtered,
          {
            id: uuidv4(),
            role: "assistant",
            content:
              "I apologize, but I encountered an unexpected error while processing your request. Please try again or rephrase your question.",
            parts: [
              {
                type: "text",
                text: "I apologize, but I encountered an unexpected error while processing your request. Please try again or rephrase your question.",
              },
            ],
            createdAt: new Date(),
          },
        ];
      });
    } finally {
      // Comprehensive cleanup
      setStatus("idle");
      setIsStreaming(false);
      setStreamingMessageId(null);

      // Clear streaming interval
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }

      // Reset abort controller
      abortControllerRef.current = null;
    }
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
      setStreamingMessageId(null);
      toast.info("Generation stopped");

      // Ensure any empty message gets content when stopped
      if (streamingMessageId) {
        setMessages((prev) =>
          prev.map((msg: any) =>
            msg.id === streamingMessageId &&
            (!msg.content || !msg.content.trim())
              ? {
                  ...msg,
                  content: "Response was stopped by user.",
                  parts: [
                    { type: "text", text: "Response was stopped by user." },
                  ],
                }
              : msg
          )
        );
      }
    }

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);
  };

  const regenerate = async () => {
    if (messages.length < 2) return;

    const lastUserMessage: any = messages.findLast((m) => m.role === "user");
    if (!lastUserMessage) return;

    setMessages((prev) => prev.slice(0, -1));

    await sendMessage({ text: lastUserMessage.content });
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content.trim());
      setCopiedMessageIds(prev => new Set(prev).add(messageId));
      setTimeout(() => {
        setCopiedMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && timetables.length === 0 && messages.length === 0) {
      console.log(
        "No timetables found. A new timetable will be created when you start chatting."
      );
    }
  }, [isClient, timetables.length, messages.length]);

  useEffect(() => {
    setCurrentChatId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    isLoadingMessagesRef.current = true;
    if (activeChatId) {
      const activeChat = chats.find((c) => c.id === activeChatId);
      if (activeChat && activeChat.messages) {
        setMessages(activeChat.messages as BuiltInAIUIMessage[]);
      }
    }
    setTimeout(() => {
      isLoadingMessagesRef.current = false;
    }, 100);
  }, [activeChatId, chats]);

  useEffect(() => {
    if (
      messages.length > 0 &&
      !currentChatId &&
      !isCreatingChatRef.current &&
      !isLoadingMessagesRef.current
    ) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        const activeTimetable =
          timetables.find((t) => t.id === activeTimetableId) || timetables[0];
        if (activeTimetable) {
          const messageText =
            firstUserMessage.parts
              ?.filter((part: any) => part.type === "text" && "text" in part)
              .map((part: any) => (part as any).text)
              .join(" ") ||
            (firstUserMessage as any).content ||
            "New Chat";

          isCreatingChatRef.current = true;
          createNewChat(activeTimetable.id, messageText, messages);
          setTimeout(() => {
            isCreatingChatRef.current = false;
          }, 100);
        }
      }
    }
  }, [messages, currentChatId, timetables, activeTimetableId]);

  useEffect(() => {
    if (currentChatId && messages.length > 0 && !isLoadingMessagesRef.current) {
      saveMessagesToChat(currentChatId, messages);
    }
  }, [messages, currentChatId]);

  useEffect(() => {
    if (dialogOpen && activeChatId) {
      const activeChat = chats.find((c) => c.id === activeChatId);
      if (activeChat) {
        setSelectedTimetableId(activeChat.timetableId);
      }
    }
  }, [dialogOpen, activeChatId, chats]);

  useEffect(() => {
    if (timetables.length > 0 && !activeTimetableId) {
      setActiveTimetable(timetables[0].id);
    }
  }, [timetables, activeTimetableId, setActiveTimetable]);

  // Chrome AI Language Model initialization - simplified since we handle it in new chat
  useEffect(() => {
    const checkLanguageModelSupport = async () => {
      try {
        // Check if LanguageModel is available in the browser
        if (
          typeof window !== "undefined" &&
          "ai" in window &&
          "languageModel" in (window as any).ai
        ) {
          const LanguageModel = (window as any).ai.languageModel;

          // Check availability
          const availability = await LanguageModel.availability();
          setLanguageModelAvailability(availability);
          console.log("Language Model availability:", availability);
        } else {
          console.log(
            "Chrome AI Language Model is not supported in this browser"
          );
          setLanguageModelAvailability("not-supported");
        }
      } catch (error) {
        console.error("Error checking Language Model support:", error);
        setLanguageModelAvailability("error");
      }
    };

    if (isClient) {
      checkLanguageModelSupport();
    }
  }, [isClient]);

  const ensureTimetableExists = () => {
    if (timetables.length === 0) {
      const newTimetable = addTimetable();
      toast.success(`Created new timetable: ${newTimetable.name}`);
      return newTimetable;
    }
    return null;
  };

  const createNewChat = (
    timetableId: string,
    firstMessage: string,
    currentMessages: any[] = []
  ) => {
    const chatId = uuidv4();
    const chatName =
      firstMessage.length > 50
        ? firstMessage.substring(0, 50) + "..."
        : firstMessage;

    const chatMessages = currentMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      parts: msg.parts || [],
      createdAt: new Date(),
    }));

    const newChat = {
      id: chatId,
      name: chatName,
      timetableId,
      messages: chatMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addChat(newChat);
    setActiveChat(chatId);
    return chatId;
  };

  const saveMessagesToChat = (chatId: string, messages: any[]) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const chatMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      parts: msg.parts || [],
      createdAt: new Date(),
    }));

    const updatedChat = {
      ...chat,
      messages: chatMessages,
      updatedAt: new Date(),
    };

    updateChat(updatedChat);
  };

  const loadChatMessages = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChat(chatId);
      setActiveTimetable(chat.timetableId);
      toast.success(`Loaded chat: ${chat.name}`);
    }
  };

  const handleNewChat = async () => {
    clearActiveChat();
    setMessages([]);
    setInput("");

    // Check LanguageModel availability and download if needed
    await initializeLanguageModelForNewChat();

    toast.success("Started new chat");
  };

  const initializeLanguageModelForNewChat = async () => {
    try {
      // Check if LanguageModel is available in the browser
      if (
        typeof window !== "undefined" &&
        "ai" in window &&
        "languageModel" in (window as any).ai
      ) {
        const LanguageModel = (window as any).ai.languageModel;

        // Check availability first
        const availability = await LanguageModel.availability();
        setLanguageModelAvailability(availability);
        console.log("Language Model availability:", availability);

        // If the model needs to be downloaded, show loading and download
        if (availability === "downloadable") {
          setIsLanguageModelDownloading(true);
          setLanguageModelDownloadProgress(0);

          // Add initial downloading message
          const downloadingMessage: any = {
            id: uuidv4(),
            role: "assistant",
            content: "Downloading model... 0%",
            parts: [
              {
                type: "text",
                text: "Downloading model... 0%",
                data: {
                  message: "Downloading model... 0%",
                  status: "downloading",
                  progress: 0,
                },
              },
            ],
            createdAt: new Date(),
          };

          setMessages([downloadingMessage]);

          // Create session with download monitoring
          const session = await LanguageModel.create({
            monitor(m: any) {
              m.addEventListener("downloadprogress", (e: any) => {
                const progress = Math.round(e.loaded * 100);
                setLanguageModelDownloadProgress(progress);
                console.log(`Downloaded ${progress}%`);

                // Update the downloading message with progress
                const updatedMessage: any = {
                  id: downloadingMessage.id,
                  role: "assistant",
                  content: `Downloading model... ${progress}%`,
                  parts: [
                    {
                      type: "text",
                      text: `Downloading model... ${progress}%`,
                      data: {
                        message: `Downloading model... ${progress}%`,
                        status: "downloading",
                        progress: progress,
                      },
                    },
                  ],
                  createdAt: new Date(),
                };

                setMessages([updatedMessage]);

                // When download is complete
                if (progress >= 100) {
                  setIsLanguageModelDownloading(false);

                  // Replace downloading message with completion message
                  const completionMessage: any = {
                    id: uuidv4(),
                    role: "assistant",
                    content: "Model download completed! Ready to chat.",
                    parts: [
                      {
                        type: "text",
                        text: "Model download completed! Ready to chat.",
                      },
                    ],
                    createdAt: new Date(),
                  };

                  setMessages([completionMessage]);

                  // Clear the completion message after 2 seconds
                  setTimeout(() => {
                    setMessages([]);
                  }, 2000);
                }
              });
            },
          });

          setLanguageModelSession(session);
        } else if (availability === "available") {
          // Model is already available, create session without monitoring
          const session = await LanguageModel.create();
          setLanguageModelSession(session);

          // Show brief ready message
          const readyMessage: any = {
            id: uuidv4(),
            role: "assistant",
            content: "Model ready! You can start chatting.",
            parts: [
              {
                type: "text",
                text: "Model ready! You can start chatting.",
              },
            ],
            createdAt: new Date(),
          };

          setMessages([readyMessage]);

          // Clear the ready message after 1 second
          setTimeout(() => {
            setMessages([]);
          }, 1000);
        } else {
          // Model not available
          console.log(
            "Chrome AI Language Model is not available:",
            availability
          );
          setLanguageModelAvailability(availability);
        }
      } else {
        console.log(
          "Chrome AI Language Model is not supported in this browser"
        );
        setLanguageModelAvailability("not-supported");
      }
    } catch (error) {
      console.error("Error initializing Language Model for new chat:", error);
      setLanguageModelAvailability("error");
      setIsLanguageModelDownloading(false);
    }
  };

  const handleNewTimetable = () => {
    const newTimetable = addTimetable();
    clearActiveChat();
    setMessages([]);
    setInput("");
    toast.success(`Created new timetable: ${newTimetable.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      sendMessage(
        {
          text: input,
        } as any,
        {
          body: {
            activeTimetableId: activeTimetableId,
            courses: currentCourses.map(({ id, ...course }) => course),
          },
        }
      );
      setInput("");
    }
  };

  const handlePromptSubmit = () => {
    if (input.trim() && !isGenerating) {
      ensureTimetableExists();
      sendMessage(
        {
          text: input,
        } as any,
        {
          body: {
            activeTimetableId: activeTimetableId,
            courses: currentCourses.map(({ id, ...course }) => course),
          },
        }
      );
      setInput("");
    }
  };



  const copyMessageToClipboard = (message: any) => {
    const textContent = message.parts
      .filter((part: any) => part.type === "text" && "text" in part)
      .map((part: any) => (part as any).text)
      .join("\n")
      .trim();

    navigator.clipboard.writeText(textContent);
  };

  if (!isClient) {
    return (
      <div className="flex flex-col h-[calc(100dvh)] items-center justify-center max-w-4xl mx-auto">
        <Loader className="size-4" />
      </div>
    );
  }

  const isGenerating = status === "streaming" || status === "submitted";

  const promptSuggestions = [
    "Help me plan my day",
    "Explain a complex topic",
    "Write a creative story",
    "Solve a problem",
  ];

  return (
    <div
      className={`relative overflow-hidden flex flex-col h-[calc(100vh-100px)] mb-24 ${className}`}
    >
      <div className="relative overflow-hidden flex flex-col h-full mb-1">
        <div className="flex-1 overflow-auto scrollbar">
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="flex flex-col gap-8 p-4">
              {/* Model downloading loading state */}
              {isLanguageModelDownloading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Loader variant="typing" />
                    <span className="text-lg font-medium">
                      Downloading model...
                    </span>
                  </div>
                  {languageModelDownloadProgress > 0 && (
                    <div className="w-full max-w-md space-y-2">
                      <Progress
                        value={languageModelDownloadProgress}
                        className="w-full"
                      />
                      <p className="text-center text-sm text-muted-foreground">
                        {languageModelDownloadProgress}% complete
                      </p>
                    </div>
                  )}
                </div>
              )}

              {messages.map((m, index) => (
                <Message
                  key={m.id}
                  className={
                    m.role === "user" ? "justify-end" : "justify-start"
                  }
                >
                  {m.role !== "user" && (
                    <MessageAvatar
                  src="/avatars/assistant-icon.gif"
                      alt="AI Assistant"
                      fallback="AI"
                    />
                  )}

                  {m.role !== "user" ? (
                    <div className="bg-secondary text-foreground prose rounded-lg p-2">
                      {status === "submitted" &&
                        m.id === streamingMessageId && (
                          <Loader variant={"typing"} />
                        )}

                      {/* Always show content and copy buttons for messages with content */}
                      {(
                        <>
                          {m.parts.map((part: any, partIndex: number) => {
                            if (!part.data?.message) return null;

                            return (
                              <div key={partIndex}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="flex items-center gap-1">
                                    {part.data.message}
                                  </span>
                                </div>
                                {part.data.status === "downloading" &&
                                  part.data.progress !== undefined && (
                                    <Progress value={part.data.progress} />
                                  )}
                              </div>
                            );
                          })}

                          {m.parts
                            ?.filter((part: any) => part.type === "file")
                            .map((part: any, partIndex: number) => {
                              if (part.mediaType?.startsWith("image/")) {
                                return (
                                  <div key={partIndex} className="mt-2">
                                    <img
                                      src={part.url}
                                      width={300}
                                      height={300}
                                      alt={part.filename || "Uploaded image"}
                                      className="object-contain max-w-sm rounded-lg border"
                                    />
                                  </div>
                                );
                              }

                              if (part.mediaType?.startsWith("audio/")) {
                                return (
                                  <div key={partIndex} className="mt-2">
                                    <audio controls className="w-full max-w-sm">
                                      <source
                                        src={part.url}
                                        type={part.mediaType}
                                      />
                                      Your browser does not support the audio
                                      element.
                                    </audio>
                                    {part.filename && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {part.filename}
                                      </p>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div key={partIndex} className="mt-2">
                                  <a
                                    href={part.url}
                                    download={part.filename}
                                    className="text-blue-500 hover:underline"
                                  >
                                    {part.filename || "Download file"}
                                  </a>
                                </div>
                              );
                            })}

                          {m.parts
                            ?.filter(
                              (part: any) =>
                                part.type === "text" && "text" in part
                            )
                            .map((part: any, partIndex: number) => {
                              const textContent = String(
                                (part as any).text || ""
                              ).trim();
                              return (
                                <div key={partIndex} className="flex w-full flex-col gap-2">
                                  <MessageContent markdown className="bg-transparent p-0">
                                    {textContent}
                                  </MessageContent>
                                  
                                  {!(status === "submitted" && m.id === streamingMessageId) && (
                                    <MessageActions className="self-end">
                                      <MessageAction tooltip="Copy to clipboard">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full cursor-pointer"
                                          onClick={() => handleCopy(textContent, m.id)}
                                        >
                                          <Copy className={`size-4 ${copiedMessageIds.has(m.id) ? "text-green-500" : ""}`} />
                                        </Button>
                                      </MessageAction>
                                    </MessageActions>
                                  )}
                                </div>
                              );
                            })}

                          {(!m.parts || m.parts.length === 0) &&
                            (m as any).content &&
                            (() => {
                              const textContent = String(
                                (m as any).content || ""
                              ).trim();
                              return (
                                <div className="flex w-full flex-col gap-2">
                                  <MessageContent markdown className="bg-transparent p-0">
                                    {textContent}
                                  </MessageContent>
                                  
                                  {!(status === "submitted" && m.id === streamingMessageId) && (
                                    <MessageActions className="self-end">
                                      <MessageAction tooltip="Copy to clipboard">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full cursor-pointer"
                                          onClick={() => handleCopy(textContent, m.id)}
                                        >
                                          <Copy className={`size-4 ${copiedMessageIds.has(m.id) ? "text-green-500" : ""}`} />
                                        </Button>
                                      </MessageAction>
                                    </MessageActions>
                                  )}
                                </div>
                              );
                            })()}

                          {(m as any).toolInvocations &&
                            (m as any).toolInvocations.length > 0 && (
                              <div className="mt-2">
                                {(m as any).toolInvocations.map(
                                  (invocation: any, invIndex: number) => {
                                    const toolPart: ToolPart = {
                                      type: invocation.toolName,
                                      state:
                                        invocation.state === "result"
                                          ? "output-available"
                                          : "input-available",
                                      input: invocation.args || {},
                                      output: invocation.result || {},
                                      toolCallId:
                                        invocation.toolCallId ||
                                        `${invocation.toolName}-${invIndex}`,
                                    };

                                    return (
                                      <div key={invIndex} className="my-2">
                                        <Tool
                                          toolPart={toolPart}
                                          defaultOpen={false}
                                          className="w-full max-w-2xl transition-all duration-200 hover:shadow-md"
                                        />
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  ) : (
                    <MessageContent className="bg-primary text-primary-foreground">
                      {/* Handle file parts for user messages */}
                      {m.parts
                        ?.filter((part: any) => part.type === "file")
                        .map((part: any, partIndex: number) => {
                          if (part.mediaType?.startsWith("image/")) {
                            return (
                              <div key={partIndex} className="mt-2">
                                <img
                                  src={part.url}
                                  width={300}
                                  height={300}
                                  alt={part.filename || "Uploaded image"}
                                  className="object-contain max-w-sm rounded-lg border"
                                />
                              </div>
                            );
                          }

                          if (part.mediaType?.startsWith("audio/")) {
                            return (
                              <div key={partIndex} className="mt-2">
                                <audio controls className="w-full max-w-sm">
                                  <source
                                    src={part.url}
                                    type={part.mediaType}
                                  />
                                  Your browser does not support the audio
                                  element.
                                </audio>
                                {part.filename && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {part.filename}
                                  </p>
                                )}
                              </div>
                            );
                          }

                          // Handle other file types
                          return (
                            <div key={partIndex} className="mt-2">
                              <a
                                href={part.url}
                                download={part.filename}
                                className="text-blue-500 hover:underline"
                              >
                                {part.filename || "Download file"}
                              </a>
                            </div>
                          );
                        })}

                      {/* Handle text parts for user messages */}
                      {m.parts
                        ?.filter(
                          (part: any) => part.type === "text" && "text" in part
                        )
                        .map((part: any, partIndex: number) => {
                          const textContent = String((part as any).text || "");
                          return <div key={partIndex}>{textContent}</div>;
                        })}

                      {/* Handle content when no parts exist for user messages */}
                      {(!m.parts || m.parts.length === 0) &&
                        (m as any).content &&
                        (() => {
                          const textContent = String((m as any).content || "");
                          return <div>{textContent}</div>;
                        })()}
                    </MessageContent>
                  )}

                  {/* Action buttons for assistant messages */}
                  {(m.role === "assistant" || m.role === "system") &&
                    index === messages.length - 1 &&
                    status === "ready" && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const textContent = m.parts
                              ? m.parts
                                  .filter(
                                    (part: any) =>
                                      part.type === "text" && "text" in part
                                  )
                                  .map((part: any) =>
                                    String((part as any).text || "")
                                  )
                                  .join("\n")
                                  .trim()
                              : String((m as any).content || "").trim();
                            navigator.clipboard.writeText(textContent);
                            toast.success("Copied to clipboard!");
                          }}
                          className="text-muted-foreground hover:text-foreground h-4 w-4 [&_svg]:size-3.5"
                        >
                          <Copy />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => regenerate()}
                          className="text-muted-foreground hover:text-foreground h-4 w-4 [&_svg]:size-3.5"
                        >
                          <RefreshCcw />
                        </Button>
                      </div>
                    )}
                </Message>
              ))}

              {status === "thinking" && (
                <Message>
                  <MessageAvatar
                  src="/avatars/ai.svg"
                    alt="AI Assistant"
                    fallback="AI"
                  />
                  <div className="bg-secondary text-black prose rounded-lg p-2">
                    <Loader variant={"text-blink"} text="Thinking..." />
                  </div>
                </Message>
              )}

              {/* Error state */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 mb-2">
                    An error occurred: {error.message}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => regenerate()}
                    disabled={status === "streaming" || status === "submitted"}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </ChatContainerContent>
          </ChatContainerRoot>
        </div>
      </div>

      {messages.length === 0 && (
        <>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className={`text-left w-full ${
              selectedWallpaper && selectedWallpaper !== "default" 
                ? "bg-gradient-to-r from-black/5 to-black/3 backdrop-blur-sm rounded-lg p-6" 
                : ""
            }`}>
              <div className={`inline-flex items-center px-3 py-1 mb-6 text-sm font-medium rounded-md ${
                selectedWallpaper && selectedWallpaper !== "default" 
                  ? "text-white bg-black/20" 
                  : "text-gray-700 bg-gray-100/50 border border-gray-200/50"
              }`}>
                Built with Chrome Built in AI and Firebase AI Logic
              </div>
              <h1 className={`text-7xl font-bold mb-2 ${
                selectedWallpaper && selectedWallpaper !== "default" ? "text-white" : ""
              }`}>
                All your classes,
              </h1>
              <h2 className={`text-7xl font-bold mb-8 ${
                selectedWallpaper && selectedWallpaper !== "default" ? "text-white" : ""
              }`}>
                perfectly organized.
              </h2>
              <p className={`text-lg max-w-3xl leading-relaxed ${
                selectedWallpaper && selectedWallpaper !== "default" ? "text-white" : "text-gray-600"
              }`}>
                Built with Chrome's native AI capabilities and Gemini AI to automate timetable creation. Share your course plan with the AI, and it will intelligently arrange your classes and generate a balanced schedule. Two powerful AI systems working together to simplify your academic planning.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <PromptSuggestion
              onClick={() => {
                setInput("Tell me a joke");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              Tell me a joke
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("How does this work?");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              How does this work?
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("Add course Mathematics");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              Add course Mathematics
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("Write a poem");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              Write a poem
            </PromptSuggestion>
            <PromptSuggestion
              onClick={() => {
                setInput("Code a React component");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              Code a React component
            </PromptSuggestion>
          </div>
        </>
      )}

      <div className="border-t bg-background rounded-3xl">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isGenerating}
            onSubmit={handlePromptSubmit}
            className="w-full max-w-(--breakpoint-md)"
          >
            <PromptInputTextarea placeholder="Ask me anything..." />

            <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Chat History">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl">
                        <MessageSquare className="text-primary size-5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
                      <DialogTitle className="sr-only">
                        Chat History
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        View chat history organized by timetables.
                      </DialogDescription>
                      <div className="flex h-[480px]">
                        <div className="w-64 border-r bg-muted/30">
                          <div className="p-4 border-b">
                            <h3 className="font-semibold text-sm">
                              Timetables
                            </h3>
                          </div>
                          <div className="overflow-y-auto h-[calc(480px-57px)]">
                            {timetables.map((timetable) => (
                              <div
                                key={timetable.id}
                                className={`relative group border-b transition-colors ${
                                  selectedTimetableId === timetable.id
                                    ? "bg-muted"
                                    : ""
                                }`}
                              >
                                <button
                                  onClick={() =>
                                    setSelectedTimetableId(timetable.id)
                                  }
                                  className="w-full text-left p-3 pr-10 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="font-medium text-sm">
                                    {timetable.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {
                                      chats.filter(
                                        (chat) =>
                                          chat.timetableId === timetable.id
                                      ).length
                                    }{" "}
                                    chats
                                  </div>
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Timetable
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "
                                        {timetable.name}"? This action cannot be
                                        undone and will also delete all
                                        associated chats.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => {
                                          deleteTimetable(timetable.id);
                                          if (
                                            selectedTimetableId === timetable.id
                                          ) {
                                            setSelectedTimetableId(null);
                                          }
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                            {timetables.length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                No timetables found
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                          <div className="p-4 border-b">
                            <h3 className="font-semibold text-sm">
                              {selectedTimetableId
                                ? `Chat History - ${
                                    timetables.find(
                                      (t) => t.id === selectedTimetableId
                                    )?.name
                                  }`
                                : "Select a timetable to view chat history"}
                            </h3>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4">
                            {selectedTimetableId ? (
                              <div className="space-y-4">
                                {chats
                                  .filter(
                                    (chat) =>
                                      chat.timetableId === selectedTimetableId
                                  )
                                  .map((chat) => {
                                    const isActiveChat =
                                      chat.id === activeChatId;
                                    return (
                                      <div
                                        key={chat.id}
                                        className={`w-full border rounded-lg p-3 transition-colors relative group ${
                                          isActiveChat
                                            ? "border-primary bg-primary/10"
                                            : "hover:bg-muted/30"
                                        }`}
                                      >
                                        <button
                                          onClick={() => {
                                            loadChatMessages(chat.id);
                                            setActiveTimetable(
                                              chat.timetableId
                                            );
                                            setDialogOpen(false);
                                          }}
                                          className="w-full text-left cursor-pointer"
                                        >
                                          {isActiveChat && (
                                            <div className="absolute top-2 right-8 w-2 h-2 bg-primary rounded-full"></div>
                                          )}
                                          <div className="flex justify-between items-start mb-2 pr-8">
                                            <h4
                                              className={`font-medium text-sm ${
                                                isActiveChat
                                                  ? "text-primary"
                                                  : ""
                                              }`}
                                            >
                                              {chat.name}
                                              {isActiveChat && (
                                                <span className="ml-2 text-xs text-primary">
                                                  (Active)
                                                </span>
                                              )}
                                            </h4>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(
                                                chat.createdAt
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {chat.messages.length} messages
                                          </div>
                                          {chat.messages.length > 0 && (
                                            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                              Last:{" "}
                                              {(() => {
                                                const lastMessage =
                                                  chat.messages[
                                                    chat.messages.length - 1
                                                  ];
                                                if (!lastMessage)
                                                  return "No content";

                                                const textParts =
                                                  lastMessage.parts?.filter(
                                                    (part: any) =>
                                                      part.type === "text" &&
                                                      "text" in part
                                                  );
                                                if (
                                                  textParts &&
                                                  textParts.length > 0
                                                ) {
                                                  return (
                                                    (textParts[0] as any)
                                                      .text || "No content"
                                                  );
                                                }

                                                return (
                                                  (lastMessage as any)
                                                    .content || "No content"
                                                );
                                              })()}
                                            </div>
                                          )}
                                        </button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                Delete Chat
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete
                                                this chat? This action cannot be
                                                undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => {
                                                  const { deleteChat } =
                                                    useChatStore.getState();
                                                  deleteChat(chat.id);
                                                }}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    );
                                  })}
                                {chats.filter(
                                  (chat) =>
                                    chat.timetableId === selectedTimetableId
                                ).length === 0 && (
                                  <div className="text-center text-muted-foreground text-sm">
                                    No chat history found for this timetable
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Select a timetable from the sidebar to view its
                                chat history
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </PromptInputAction>

                <PromptInputAction tooltip="New Chat">
                  <button
                    onClick={handleNewChat}
                    className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                  >
                    <Plus className="text-primary size-5" />
                  </button>
                </PromptInputAction>

                <PromptInputAction tooltip="New Timetable">
                  <button
                    onClick={handleNewTimetable}
                    className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                  >
                    <Calendar className="text-primary size-5" />
                  </button>
                </PromptInputAction>
              </div>

              <PromptInputAction
                tooltip={isGenerating ? "Stop generation" : "Send message"}
              >
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={isGenerating ? stop : handleSubmit}
                  disabled={
                    !isGenerating &&
                    (!input || !input.trim())
                  }
                >
                  {isGenerating ? (
                    <Square className="size-5 fill-current" />
                  ) : (
                    <ArrowUp className="size-5" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
