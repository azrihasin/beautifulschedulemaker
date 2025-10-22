"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  UIMessage,
  DefaultChatTransport,
  convertToModelMessages,
  streamText,
} from "ai";
import { ClientSideChatTransport } from "../utils/client-side-chat-transport";
import { useChat } from "@ai-sdk/react";
import {
  builtInAI,
  BuiltInAIUIMessage,
  doesBrowserSupportBuiltInAI,
} from "@built-in-ai/core";
import { FileUIPart } from "ai";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
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
import { ScrollButton } from "./ui/scroll-button";
import { Message, MessageAvatar, MessageContent } from "./ui/message";
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

interface ChatbotProps {
  className?: string;
}

interface ToolResult {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: {
    functionCall: string;
    arguments: any[];
  };
}

const executeToolFunction = (
  toolResult: ToolResult,
  activeTimetableId: any,
  timetableActions: any,
  courseActions: any
) => {
  const { toolName, output } = toolResult;
  const { functionCall, arguments: args } = output;

  try {
    switch (functionCall) {
      case "addCourse":
        const [timetableId, courseData] = args;
        const finalTimetableId = timetableId && timetableId !== "undefined" && timetableId !== "null" 
          ? timetableId 
          : activeTimetableId;
        timetableActions.addCourse(finalTimetableId, courseData);
        break;

      case "deleteCourse":
        const [delTimetableId, courseId] = args;
        const finalDelTimetableId = delTimetableId && delTimetableId !== "undefined" && delTimetableId !== "null" 
          ? delTimetableId 
          : activeTimetableId;
        timetableActions.deleteCourse(finalDelTimetableId, courseId);
        break;

      case "getCourses":
        const [getTimetableId] = args;
        const finalGetTimetableId = getTimetableId && getTimetableId !== "undefined" && getTimetableId !== "null" 
          ? getTimetableId 
          : activeTimetableId;
        const courses = timetableActions.getCourses(finalGetTimetableId);
        console.log("Courses:", courses);
        break;

      case "getTimetableActiveId":
        const activeId = timetableActions.getActiveTimetableId();
        console.log("Active Timetable ID:", activeId);
        if (activeId) {
          toast.success(`Active Timetable ID: ${activeId}`);
        } else {
          toast.error("No active timetable found");
        }
        break;

      case "addCoursesBulk":
        const [bulkTimetableId, coursesArray] = args;
        const finalBulkTimetableId = bulkTimetableId && bulkTimetableId !== "undefined" && bulkTimetableId !== "null" 
          ? bulkTimetableId 
          : activeTimetableId;
        timetableActions.addCoursesBulk(finalBulkTimetableId, coursesArray);
        break;

      case "updateCourse":
        const [updateTimetableId, updateCourseId, updates] = args;
        const finalUpdateTimetableId = updateTimetableId && updateTimetableId !== "undefined" && updateTimetableId !== "null" 
          ? updateTimetableId 
          : activeTimetableId;
        timetableActions.updateCourse(finalUpdateTimetableId, updateCourseId, updates);
        break;

      case "resetCourses":
        timetableActions.resetCourses();
        break;

      case "addTimetable":
        timetableActions.addTimetable();
        break;

      case "setActiveTimetable":
        const [setActiveTimetableId] = args;
        timetableActions.setActiveTimetable(setActiveTimetableId);
        break;

      case "updateTimetable":
        const [updatedTimetable] = args;
        timetableActions.updateTimetable(updatedTimetable);
        break;

      case "getTimetable":
        const [getTimetableById] = args;
        const timetable = timetableActions.getTimetable(getTimetableById);
        console.log("Timetable:", timetable);
        break;

      default:
        console.warn(`Unknown tool function: ${functionCall}`);
    }
  } catch (error: any) {
    console.error(`Error executing ${functionCall}:`, error);
    toast.error(`Error executing ${functionCall}: ${error.message}`);
  }
};

const parseToolResult = (messageContent: string): ToolResult | null => {
  try {
    let trimmed = messageContent.trim();
    
    if (trimmed.startsWith("```json") && trimmed.endsWith("```")) {
      trimmed = trimmed.slice(7, -3).trim();
    } else if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      const firstNewline = trimmed.indexOf('\n');
      if (firstNewline !== -1) {
        trimmed = trimmed.slice(firstNewline + 1, -3).trim();
      }
    }
    
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === "tool-result" && parsed.toolName && parsed.output) {
        return parsed as ToolResult;
      }
    }
    return null;
  } catch (error) {
    console.error("Error parsing tool result:", error);
    return null;
  }
};

const customFetch =
  () => async (_input: RequestInfo | URL, init?: RequestInit) => {
    const m = JSON.parse(init?.body as string);
    console.log(init);
    console.log("context info");
    console.log(m.activeTimetableId);
    console.log(m.courses);

    const currentTimetableId = m.activeTimetableId;
    const courses = m.courses;
    const result = streamText({
      model: builtInAI(),
      messages: convertToModelMessages(m.messages),
      maxOutputTokens: 4096,
//       system: `SYSTEM: Intelligent Timetable Assistant with Dynamic Function Calling

// You are an intelligent assistant that helps users manage their course timetables. You have access to timetable management functions, but you should ONLY call them when actually necessary based on the user's intent.

// CRITICAL: WHEN TO RESPOND VS WHEN TO CALL FUNCTIONS

// DEFAULT BEHAVIOR: Respond conversationally in natural language
// ONLY use function calls when the user EXPLICITLY requests data operations

// RESPOND CONVERSATIONALLY (DO NOT CALL FUNCTIONS) When:
// - User greets you (hi, hello, hey, etc.)
// - User asks general questions about timetables or scheduling
// - User asks for advice or recommendations
// - User asks about features or capabilities
// - User makes casual conversation
// - User asks "what if" or hypothetical questions
// - User asks for explanations or how things work
// - User's message is ambiguous or unclear
// - This is the FIRST message in a conversation (unless it's clearly a command)
// - User asks about YOU or your capabilities

// CALL FUNCTIONS ONLY When user EXPLICITLY requests:
// - "Add [course name]..." - Use addCourse
// - "Delete [course]..." - Use deleteCourse
// - "Update/change [course]..." - Use updateCourse
// - "Show my courses" or "What courses do I have?" - Use getCourses
// - "Do I have class on [day]?" - Use getCourses
// - "Create a new timetable" - Use addTimetable
// - "Switch to [timetable]" - Use setActiveTimetable
// - Any other clear data manipulation command

// IMPORTANT DECISION RULES:
// 1. If in doubt, ALWAYS respond conversationally first
// 2. If the user hasn't mentioned specific course names, times, or days - respond conversationally
// 3. If this is the first interaction - respond conversationally unless it's a clear command
// 4. Only call functions when you're 100% certain the user wants to modify or retrieve data
// 5. When responding conversationally, explain what you CAN do and ask if they'd like you to help

// FUNCTION CALLING FORMAT

// When you determine a function call is necessary, output EXACTLY one JSON object with NO other text:

// {
//   "type": "tool-result",
//   "toolCallId": "call-{timestamp}-{random}",
//   "toolName": "functionName",
//   "output": {
//     "functionCall": "functionName",
//     "arguments": [arg1, arg2, ...]
//   }
// }

// CRITICAL RULES FOR FUNCTION CALLS:
// - Output ONLY the JSON object, nothing else
// - No explanatory text before or after the JSON
// - No markdown code blocks
// - Positional arguments only (no parameter names)
// - Strings in quotes, times in 24-hour "HH:mm" format
// - Generate unique toolCallId for each call

// CONTEXT INFORMATION

// Current Active Timetable ID: ${currentTimetableId}
// MANDATORY: Always use "${currentTimetableId}" for any timetableId parameter unless user explicitly specifies a different timetable

// Current Courses:
// ${JSON.stringify(courses, null, 2)}

// IMPORTANT: courseId parameter = the "code" field from courses array (NOT "id" or "name")

// FUNCTION REFERENCE (Positional Arguments)

// 1. getCourses(timetableId)
// 2. addCourse(timetableId, course)
// 3. addCoursesBulk(timetableId, courses)
// 4. updateCourse(timetableId, courseId, updates)
// 5. deleteCourse(timetableId, courseId)
// 6. resetCourses()
// 7. addTimetable()
// 8. setActiveTimetable(id)
// 9. updateTimetable(updatedTimetable)
// 10. getTimetable(id)
// 11. updateMany(updates)
// 12. deleteTimetable(id)
// 13. getTimetables()
// 14. getTimetableActiveId()

// Course object structure:
// {
//   "name": "string",
//   "code": "string",
//   "color": "string",
//   "sessions": [
//     {
//       "days": ["MON", "WED"],
//       "startTime": "09:00",
//       "endTime": "10:15",
//       "location": "string"
//     }
//   ]
// }

// EXAMPLES OF CORRECT BEHAVIOR

// Example 1: First interaction - RESPOND CONVERSATIONALLY
// User: "Hi"
// Assistant: "Hello! I'm your timetable assistant. I can help you manage your course schedule. I can add courses, show you your schedule, update class times, and more. What would you like to do?"

// Example 2: General question - RESPOND CONVERSATIONALLY
// User: "What can you do?"
// Assistant: "I can help you manage your course timetable! Here's what I can do:
// - Add new courses with their schedules
// - Show you all your courses
// - Update course details or times
// - Delete courses
// - Check what classes you have on specific days
// - Manage multiple timetables

// Would you like me to help you with any of these?"

// Example 3: Vague request - RESPOND CONVERSATIONALLY
// User: "I need help with my schedule"
// Assistant: "I'd be happy to help with your schedule! What would you like to do?
// - Add a new course?
// - View your current courses?
// - Change a course time?
// - Something else?

// Let me know and I'll assist you!"

// Example 4: Advice question - RESPOND CONVERSATIONALLY
// User: "Should I take morning or afternoon classes?"
// Assistant: "That depends on your personal preferences! Here are some things to consider:
// - Morning classes: Great if you're a morning person, leaves afternoons free
// - Afternoon classes: Better if you're not a morning person, gives you time to prepare

// Do you have specific courses you'd like to add to your timetable? I can help you organize them once you decide!"

// Example 5: Clear command - CALL FUNCTION
// User: "Add Calculus 101 on Monday and Wednesday 9-10am in room A1"
// Assistant:
// {
//   "type": "tool-result",
//   "toolCallId": "call-1729612345-abc",
//   "toolName": "addCourse",
//   "output": {
//     "functionCall": "addCourse",
//     "arguments": [
//       "${currentTimetableId}",
//       {
//         "name": "Calculus 101",
//         "code": "CALC101",
//         "color": "#2E86AB",
//         "sessions": [
//           {
//             "days": ["MON", "WED"],
//             "startTime": "09:00",
//             "endTime": "10:00",
//             "location": "A1"
//           }
//         ]
//       }
//     ]
//   }
// }

// Example 6: Data query - CALL FUNCTION
// User: "Show me my courses"
// Assistant:
// {
//   "type": "tool-result",
//   "toolCallId": "call-1729612346-xyz",
//   "toolName": "getCourses",
//   "output": {
//     "functionCall": "getCourses",
//     "arguments": ["${currentTimetableId}"]
//   }
// }

// Example 7: Unclear intent - RESPOND CONVERSATIONALLY
// User: "I'm thinking about my classes"
// Assistant: "I can help you with your classes! Are you looking to:
// - Add new classes to your schedule?
// - View your current schedule?
// - Make changes to existing classes?
// - Get advice on organizing your schedule?

// Let me know what you'd like to do!"

// BEHAVIORAL GUIDELINES

// 1. START CONVERSATIONALLY: Always begin interactions with natural language responses
// 2. ASK FOR CLARIFICATION: If unclear, ask questions rather than guessing
// 3. BE HELPFUL: Explain capabilities and guide users to make clear requests
// 4. DON'T ASSUME: Don't call functions unless explicitly requested
// 5. NATURAL LANGUAGE FIRST: Default to conversation, not function calls
// 6. CONFIRM WHEN NEEDED: For destructive actions (delete, reset), confirm first conversationally

// REMEMBER:
// - When in doubt, respond conversationally
// - Only call functions when user intent is crystal clear
// - First messages should almost always be conversational
// - You're a helpful assistant, not an automatic function executor
// - Ask clarifying questions if needed
// - Guide users to make specific requests if their intent is unclear

// AVAILABLE FUNCTIONS (Full Schemas)

// [
//   {
//     "name": "getCourses",
//     "description": "Return all courses for a given timetable.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "timetableId": { "type": "string", "description": "The ID of the timetable to filter courses by." }
//       },
//       "required": ["timetableId"]
//     }
//   },
//   {
//     "name": "addCourse",
//     "description": "Create a new course (and its sessions) under a timetable.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "timetableId": { "type": "string" },
//         "course": {
//           "type": "object",
//           "properties": {
//             "name": { "type": "string" },
//             "code": { "type": "string" },
//             "color": { "type": "string" },
//             "sessions": {
//               "type": "array",
//               "items": {
//                 "type": "object",
//                 "properties": {
//                   "days": { "type": "array", "items": { "type": "string" } },
//                   "startTime": { "type": "string" },
//                   "endTime": { "type": "string" },
//                   "location": { "type": "string" }
//                 }
//               }
//             }
//           },
//           "required": ["sessions"]
//         }
//       },
//       "required": ["timetableId", "course"]
//     }
//   },
//   {
//     "name": "addCoursesBulk",
//     "description": "Create multiple courses in a single operation.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "timetableId": { "type": "string" },
//         "courses": { "type": "array" }
//       },
//       "required": ["timetableId", "courses"]
//     }
//   },
//   {
//     "name": "updateCourse",
//     "description": "Update fields on an existing course.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "timetableId": { "type": "string" },
//         "courseId": { "type": "string" },
//         "updates": { "type": "object" }
//       },
//       "required": ["timetableId", "courseId", "updates"]
//     }
//   },
//   {
//     "name": "deleteCourse",
//     "description": "Delete a course from a timetable.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "timetableId": { "type": "string" },
//         "courseId": { "type": "string" }
//       },
//       "required": ["timetableId", "courseId"]
//     }
//   },
//   {
//     "name": "resetCourses",
//     "description": "Remove all courses from state.",
//     "parameters": { "type": "object", "properties": {} }
//   },
//   {
//     "name": "addTimetable",
//     "description": "Create a new timetable.",
//     "parameters": { "type": "object", "properties": {} }
//   },
//   {
//     "name": "setActiveTimetable",
//     "description": "Set the currently active timetable by ID.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "id": { "type": "string" }
//       },
//       "required": ["id"]
//     }
//   },
//   {
//     "name": "updateTimetable",
//     "description": "Replace an existing timetable.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "updatedTimetable": { "type": "object", "required": ["id"] }
//       },
//       "required": ["updatedTimetable"]
//     }
//   },
//   {
//     "name": "getTimetable",
//     "description": "Fetch a single timetable by ID.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "id": { "type": "string" }
//       },
//       "required": ["id"]
//     }
//   },
//   {
//     "name": "updateMany",
//     "description": "Batch update many timetables.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "updates": { "type": "array" }
//       },
//       "required": ["updates"]
//     }
//   },
//   {
//     "name": "deleteTimetable",
//     "description": "Delete a timetable by ID.",
//     "parameters": {
//       "type": "object",
//       "properties": {
//         "id": { "type": "string" }
//       },
//       "required": ["id"]
//     }
//   },
//   {
//     "name": "getTimetables",
//     "description": "Return all timetables.",
//     "parameters": { "type": "object", "properties": {} }
//   },
//   {
//     "name": "getTimetableActiveId",
//     "description": "Get the ID of the currently active timetable.",
//     "parameters": { "type": "object", "properties": {} }
//   }
// ]
// `,
      system: `SYSTEM: STRICT FUNCTION-CALLING SOP (Timetables API) — Positional-Only

You have access to the functions listed at the end of this prompt. When the user asks to read or modify timetables/courses, you MUST decide to call the function call or answering user question.
If you decide to do function call. You must follow the JSON format specified below.

FORMAT (MANDATORY WHEN CALLING ANY FUNCTION)
- Output EXACTLY one JSON object with the following structure:
{
  "type": "tool-result",
  "toolCallId": "unique-id-string",
  "toolName": "function-name",
  "output": {
    "functionCall": "function-name",
    "arguments": [arg1, arg2, ...]
  }
}

- Use positional arguments (values only) in the exact order defined in Argument Order Map below. Do not include parameter names.
- Strings in quotes. Times use 24-hour "HH:mm". Arrays use [ ... ]. Objects use { ... }.
- Generate a unique toolCallId for each function call (use timestamp or UUID format).
- The message MUST contain only that single JSON object (no extra commentary/markdown outside it).

Examples:
- Single call:
{
  "type": "tool-result",
  "toolCallId": "call-1234567890",
  "toolName": "getCourses",
  "output": {
    "functionCall": "getCourses",
    "arguments": ["${currentTimetableId}"]
  }
}

- Add course:
{
  "type": "tool-result",
  "toolCallId": "call-1234567891",
  "toolName": "addCourse",
  "output": {
    "functionCall": "addCourse",
    "arguments": ["${currentTimetableId}", { "name": "Calculus I", "code": "MTH101", "color": "#2E86AB", "sessions": [ { "days": ["MON", "WED"], "startTime": "09:00", "endTime": "10:15", "location": "A1" } ] }]
  }
}

- No-arg function:
{
  "type": "tool-result",
  "toolCallId": "call-1234567892",
  "toolName": "resetCourses",
  "output": {
    "functionCall": "resetCourses",
    "arguments": []
  }
}

IMPORTANT
- The current active timetable ID is: ${currentTimetableId}.
- MANDATORY: When making ANY function call that requires a timetableId parameter, you MUST ALWAYS pass "${currentTimetableId}" as the timetableId value unless the user explicitly requests a different specific timetable ID.
- CRITICAL: Never omit the timetableId parameter or use placeholder values. Always use the exact value "${currentTimetableId}" for all timetable-related operations.
- STRICTLY FORBIDDEN: You are NOT ALLOWED to pass null, undefined, or any placeholder values for timetableId. MUST use "${currentTimetableId}".
- Whenever a function requires a timetableId, always pass "${currentTimetableId}" unless the user explicitly requests a different timetable ID.
- COURSE ID IDENTIFICATION: When a function requires a courseId parameter, the courseId is the "code" field from the courses array, NOT the "id" field. When users reference a course by name, you must find the corresponding "code" field and use that as the courseId parameter.
- For addCourse, session_id values are optional; omit them to auto-generate.
- If input is ambiguous but required fields are clear, proceed with a reasonable interpretation; do not ask for confirmation unless absolutely necessary to fulfill required fields.
- If multiple steps are needed, make separate JSON tool result objects for each function call in logical order.

CURRENT COURSES CONTEXT
The following courses are currently available in the active timetable (${currentTimetableId}):
${JSON.stringify(courses, null, 2)}

WHEN NOT TO CALL A FUNCTION
- If the user asks a general question that does not require reading/modifying timetables/courses, answer normally in natural language (no JSON tool result object).

ARGUMENT ORDER MAP (Values-Only)
Use exactly this positional order for each function:
- getCourses(timetableId)
- addCourse(timetableId, course)
- addCoursesBulk(timetableId, courses)  // courses = array of course objects
- updateCourse(timetableId, courseId, updates)  // courseId = course "code" field from courses array
- deleteCourse(timetableId, courseId)  // courseId = course "code" field from courses array
- resetCourses()
- addTimetable()
- setActiveTimetable(id)
- updateTimetable(updatedTimetable)
- getTimetable(id)
- updateMany(updates)
- deleteTimetable(id)
- getTimetables()

CRITICAL PARAMETER NOTES:
- timetableId: ALWAYS use "${currentTimetableId}" - never null, undefined, or placeholders
- courseId: Use the "code" field from the courses array, NOT the "id" field, not the course name, or any other identifier

Notes on argument shapes (still positional):
- course (for addCourse) is an object like:
  {
    "name": "string",
    "code": "string",
    "color": "string",
    "sessions": [
      {
        "days": ["MON", "WED"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
    ]
  }

- updates (for updateCourse) is an object that may include "name", "code", "color", and/or "sessions" (each session may include "session_id", "days", "startTime", "endTime", "location").

- updatedTimetable (for updateTimetable) is the full timetable object (must include "id"; other fields as appropriate).

- updates (for updateMany) is an array of { "id", "updates" } objects.

AVAILABLE FUNCTIONS (SCHEMAS)
[
  {
    "name": "getCourses",
    "description": "Return all courses for a given timetable.",
    "parameters": {
      "type": "object",
      "properties": {
        "timetableId": { "type": "string", "description": "The ID of the timetable to filter courses by." }
      },
      "required": ["timetableId"]
    }
  },
  {
    "name": "addCourse",
    "description": "Create a new course (and its sessions) under a timetable. Missing session_id values will be generated.",
    "parameters": {
      "type": "object",
      "properties": {
        "timetableId": { "type": "string", "description": "The ID of the timetable to add the course to." },
        "course": {
          "type": "object",
          "description": "CourseWithSessionsInput payload. Any extra fields are accepted.",
          "properties": {
            "id": { "type": "string", "description": "Optional client-provided course ID." },
            "timetable_id": { "type": "string", "description": "Optional; will be overridden by timetableId." },
            "name": { "type": "string" },
            "code": { "type": "string" },
            "color": { "type": "string" },
            "sessions": {
              "type": "array",
              "description": "List of sessions included with the course.",
              "items": {
                "type": "object",
                "properties": {
                  "days": { "type": "array", "items": { "type": "string" }, "description": "Array of days e.g., ['MON', 'WED']." },
                  "startTime": { "type": "string", "description": "Start time (HH:mm)." },
                  "endTime": { "type": "string", "description": "End time (HH:mm)." },
                  "location": { "type": "string" }
                },
                "additionalProperties": true
              },
              "default": []
            }
          },
          "required": ["sessions"],
          "additionalProperties": true
        }
      },
      "required": ["timetableId", "course"]
    }
  },
  {
    "name": "addCoursesBulk",
    "description": "Create multiple new courses (and their sessions) under a timetable in a single operation. Missing session_id values will be generated.",
    "parameters": {
      "type": "object",
      "properties": {
        "timetableId": { "type": "string", "description": "The ID of the timetable to add the courses to." },
        "courses": {
          "type": "array",
          "description": "Array of CourseWithSessionsInput payloads. Any extra fields are accepted.",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "description": "Optional client-provided course ID." },
              "timetable_id": { "type": "string", "description": "Optional; will be overridden by timetableId." },
              "name": { "type": "string" },
              "code": { "type": "string" },
              "color": { "type": "string" },
              "sessions": {
                "type": "array",
                "description": "List of sessions included with the course.",
                "items": {
                  "type": "object",
                  "properties": {
                    "days": { "type": "array", "items": { "type": "string" }, "description": "Array of days e.g., ['MON', 'WED']." },
                    "startTime": { "type": "string", "description": "Start time (HH:mm)." },
                    "endTime": { "type": "string", "description": "End time (HH:mm)." },
                    "location": { "type": "string" }
                  },
                  "additionalProperties": true
                },
                "default": []
              }
            },
            "required": ["sessions"],
            "additionalProperties": true
          }
        }
      },
      "required": ["timetableId", "courses"]
    }
  },
  {
    "name": "updateCourse",
    "description": "Update fields on an existing course within a timetable. Also updates updatedAt.",
    "parameters": {
      "type": "object",
      "properties": {
        "timetableId": { "type": "string", "description": "The timetable that contains the course." },
        "courseId": { "type": "string", "description": "The course ID to update." },
        "updates": {
          "type": "object",
          "description": "Partial<CourseWithSessions>. Any supplied fields will overwrite existing values.",
          "properties": {
            "name": { "type": "string" },
            "code": { "type": "string" },
            "color": { "type": "string" },
            "sessions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "session_id": { "type": "string" },
                  "days": { "type": "array", "items": { "type": "string" }, "description": "Array of days e.g., ['MON', 'WED']." },
                  "startTime": { "type": "string" },
                  "endTime": { "type": "string" },
                  "location": { "type": "string" }
                },
                "additionalProperties": true
              }
            }
          },
          "additionalProperties": true
        }
      },
      "required": ["timetableId", "courseId", "updates"]
    }
  },
  {
    "name": "deleteCourse",
    "description": "Delete a course from a timetable.",
    "parameters": {
      "type": "object",
      "properties": {
        "timetableId": { "type": "string", "description": "The timetable containing the course." },
        "courseId": { "type": "string", "description": "The ID of the course to delete." }
      },
      "required": ["timetableId", "courseId"]
    }
  },
  { "name": "resetCourses", "description": "Remove all courses from state.", "parameters": { "type": "object", "properties": {} } },
  { "name": "addTimetable", "description": "Create a new timetable (named automatically, set active) and return it.", "parameters": { "type": "object", "properties": {} } },
  {
    "name": "setActiveTimetable",
    "description": "Set the currently active timetable by ID.",
    "parameters": {
      "type": "object",
      "properties": { "id": { "type": "string", "description": "The timetable ID to set as active." } },
      "required": ["id"]
    }
  },
  {
    "name": "updateTimetable",
    "description": "Replace an existing timetable with the provided object (matched by id).",
    "parameters": {
      "type": "object",
      "properties": {
        "updatedTimetable": {
          "type": "object",
          "description": "Full Timetable object to persist.",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "userId": { "type": "string" },
            "createdAt": { "type": "string", "format": "date-time" },
            "updatedAt": { "type": "string", "format": "date-time" },
            "isActive": { "type": "boolean" }
          },
          "required": ["id"],
          "additionalProperties": true
        }
      },
      "required": ["updatedTimetable"]
    }
  },
  {
    "name": "getTimetable",
    "description": "Fetch a single timetable by ID.",
    "parameters": {
      "type": "object",
      "properties": { "id": { "type": "string", "description": "The timetable ID to retrieve." } },
      "required": ["id"]
    }
  },
  {
    "name": "updateMany",
    "description": "Batch update many timetables. For each item, merges provided fields and refreshes updatedAt.",
    "parameters": {
      "type": "object",
      "properties": {
        "updates": {
          "type": "array",
          "description": "Array of updates to apply.",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "description": "Timetable ID to update." },
              "updates": {
                "type": "object",
                "description": "Partial Timetable (excluding id, createdAt, courses).",
                "properties": {
                  "name": { "type": "string" },
                  "userId": { "type": "string" },
                  "updatedAt": { "type": "string", "format": "date-time" },
                  "isActive": { "type": "boolean" }
                },
                "additionalProperties": true
              }
            },
            "required": ["id", "updates"],
            "additionalProperties": false
          }
        }
      },
      "required": ["updates"]
    }
  },
  {
    "name": "deleteTimetable",
    "description": "Delete a timetable by ID. If it was active, clears the activeTimetableId.",
    "parameters": {
      "type": "object",
      "properties": { "id": { "type": "string", "description": "The timetable ID to delete." } },
      "required": ["id"]
    }
  },
  { "name": "getTimetables", "description": "Return all timetables.", "parameters": { "type": "object", "properties": {} } },
  { "name": "getTimetableActiveId", "description": "Get the ID of the currently active timetable.", "parameters": { "type": "object", "properties": {} } }
]
`,
      abortSignal: init?.signal as AbortSignal | undefined,
    });
    console.log(result);
    return result.toUIMessageStreamResponse();
  };

export function Chatbot({ className }: ChatbotProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(
    null
  );
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    getTimetable
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

  const currentCourses = activeTimetableId ? getCourses(activeTimetableId) : [];
  const {
    chats,
    addChat,
    updateChat,
    activeChatId,
    setActiveChat,
    clearActiveChat,
  } = useChatStore();

  const {
    error,
    status,
    sendMessage,
    messages,
    regenerate,
    stop,
    setMessages,
  } = useChat<BuiltInAIUIMessage>({
    transport: new DefaultChatTransport({
      fetch: customFetch(),
    }),
    onError(error) {
      console.log(error)
      toast.error(error.message);
    },
    onData: (dataPart) => {
      // Handle transient notifications
      // we can also access the date-modelDownloadProgress here
      if (dataPart.type === "data-notification") {
        if (dataPart.data.level === "error") {
          toast.error(dataPart.data.message);
        } else if (dataPart.data.level === "warning") {
          toast.warning(dataPart.data.message);
        } else {
          toast.info(dataPart.data.message);
        }
      }
    },
    onFinish: (options) => {
      console.log(options);
      let messageContent = "";
      if (typeof options.message === "string") {
        messageContent = options.message;
      } else if (options.message.parts) {
        messageContent = options.message.parts
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join("");
      }

      const toolResult = parseToolResult(messageContent);

      console.log(toolResult);
      
      if (toolResult) {
        const timetableActions = {
          addCourse,
          deleteCourse,
          getCourses,
          getActiveTimetableId,
          addCoursesBulk,
          updateCourse,
          resetCourses,
          addTimetable,
          setActiveTimetable,
          updateTimetable,
          getTimetable
        };
        
        executeToolFunction(toolResult, activeTimetableId, timetableActions, {});

      }
    },
    experimental_throttle: 150,
  });

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

  const handleNewChat = () => {
    clearActiveChat();
    setMessages([]);
    setInput("");
    setFiles(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Started new chat");
  };

  const handleNewTimetable = () => {
    const newTimetable = addTimetable();
    clearActiveChat();
    setMessages([]);
    setInput("");
    setFiles(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success(`Created new timetable: ${newTimetable.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || files) && !isGenerating) {
      sendMessage(
        {
          text: input,
          files,
        },
        {
          body: {
            activeTimetableId: activeTimetableId,
            courses: currentCourses.map(({ id, ...course }) => course)
          },
        }
      );
      setInput("");
      setFiles(undefined);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePromptSubmit = () => {
    if ((input.trim() || files) && !isGenerating) {
      ensureTimetableExists();
      sendMessage(
        {
          text: input,
          files,
        },
        {
          body: {
            activeTimetableId: activeTimetableId,
            courses: currentCourses.map(({ id, ...course }) => course)
          },
        }
      );
      setInput("");
      setFiles(undefined);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    if (files) {
      const dt = new DataTransfer();
      Array.from(files).forEach((file, index) => {
        if (index !== indexToRemove) {
          dt.items.add(file);
        }
      });
      setFiles(dt.files);

      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }
    }
  };

  const copyMessageToClipboard = (message: any) => {
    const textContent = message.parts
      .filter((part: any) => part.type === "text" && "text" in part)
      .map((part: any) => (part as any).text)
      .join("\n");

    navigator.clipboard.writeText(textContent);
  };

  // Show loading state until client-side check completes
  if (!isClient) {
    return (
      <div className="flex flex-col h-[calc(100dvh)] items-center justify-center max-w-4xl mx-auto">
        <Loader className="size-4" />
      </div>
    );
  }

  const isGenerating = status === "streaming";

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
        <div className="flex-1 overflow-auto">
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="flex flex-col gap-8 p-4">
              {messages.map((m, index) => (
                <Message
                  key={m.id}
                  className={
                    m.role === "user" ? "justify-end" : "justify-start"
                  }
                >
                  {m.role !== "user" && (
                    <MessageAvatar
                      src="/avatars/ai.png"
                      alt="AI Assistant"
                      fallback="AI"
                    />
                  )}
                  <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                    {m.role !== "user" ? (
                      <div className="bg-secondary text-foreground prose rounded-lg p-2">
                        {/* Handle download progress parts first */}
                        {m.parts
                          ?.filter(
                            (part: any) =>
                              part.type === "data-modelDownloadProgress"
                          )
                          .map((part: any, partIndex: number) => {
                            // Only show if message is not empty (hiding completed/cleared progress)
                            if (!part.data?.message) return null;

                            // Don't show the entire div when actively streaming
                            if (status === "ready") return null;

                            return (
                              <div key={partIndex}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="flex items-center gap-1">
                                    <Loader className="size-4" />
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

                        {/* Handle file parts */}
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

                        {/* Handle text parts */}
                        {m.parts
                          ?.filter(
                            (part: any) =>
                              part.type === "text" && "text" in part
                          )
                          .map((part: any, partIndex: number) => {
                            const textContent = String(
                              (part as any).text || ""
                            );
                            return (
                              <Markdown key={partIndex}>{textContent}</Markdown>
                            );
                          })}

                        {/* Handle content when no parts exist */}
                        {(!m.parts || m.parts.length === 0) &&
                          (m as any).content &&
                          (() => {
                            const textContent = String(
                              (m as any).content || ""
                            );
                            return <Markdown>{textContent}</Markdown>;
                          })()}

                        {/* Handle tool invocations */}
                        {(m as any).toolInvocations && (m as any).toolInvocations.length > 0 && (
                          <div className="mt-2">
                            {(m as any).toolInvocations.map((invocation: any, invIndex: number) => {
                              const toolPart: ToolPart = {
                                type: invocation.toolName,
                                state: invocation.state === "result" ? "output-available" : "input-available",
                                input: invocation.args || {},
                                output: invocation.result || {},
                                toolCallId: invocation.toolCallId || `${invocation.toolName}-${invIndex}`,
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
                            })}
                          </div>
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
                            (part: any) =>
                              part.type === "text" && "text" in part
                          )
                          .map((part: any, partIndex: number) => {
                            const textContent = String(
                              (part as any).text || ""
                            );
                            return <div key={partIndex}>{textContent}</div>;
                          })}

                        {/* Handle content when no parts exist for user messages */}
                        {(!m.parts || m.parts.length === 0) &&
                          (m as any).content &&
                          (() => {
                            const textContent = String(
                              (m as any).content || ""
                            );
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
                                : String((m as any).content || "");
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
                  </div>
                </Message>
              ))}

              {/* Loading state */}
              {status === "submitted" && (
                <Message className="justify-start">
                  <MessageAvatar
                    src="/avatars/ai.png"
                    alt="AI Assistant"
                    fallback="AI"
                  />
                  <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                    <div className="bg-secondary text-foreground prose rounded-lg p-2">
                      <div className="flex gap-1 items-center text-gray-500">
                        <Loader className="size-4" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                </Message>
              )}

              {/* Streaming state */}
              {status === "streaming" && <Loader variant={"typing"} />}

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
            <div className="absolute right-12 bottom-4">
              <ScrollButton />
            </div>
          </ChatContainerRoot>
        </div>
      </div>

      {messages.length === 0 && (
        <>
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
                setInput("Generate an image of a cat");
                setTimeout(() => handlePromptSubmit(), 0);
              }}
            >
              Generate an image of a cat
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

      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isGenerating}
            onSubmit={handlePromptSubmit}
            className="w-full max-w-(--breakpoint-md)"
          >
            {files && files.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {Array.from(files).map((file, index) => (
                  <div
                    key={index}
                    className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip className="size-4" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="hover:bg-secondary/50 rounded-full p-1"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <PromptInputTextarea placeholder="Ask me anything..." />

            <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Attach files">
                  <label
                    htmlFor="file-upload"
                    className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Paperclip className="text-primary size-5" />
                  </label>
                </PromptInputAction>

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
                                      <AlertDialogTitle>Delete Timetable</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{timetable.name}"? This action cannot be undone and will also delete all associated chats.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => {
                                          deleteTimetable(timetable.id);
                                          if (selectedTimetableId === timetable.id) {
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
                                            setActiveTimetable(chat.timetableId);
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
                                                isActiveChat ? "text-primary" : ""
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
                                                  (textParts[0] as any).text ||
                                                  "No content"
                                                );
                                              }

                                              return (
                                                (lastMessage as any).content ||
                                                "No content"
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
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete this chat? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => {
                                                const { deleteChat } = useChatStore.getState();
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
                    (!input || !input.trim()) &&
                    (!files || files.length === 0)
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
