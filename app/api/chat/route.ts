import { z } from "zod";
import { withTokenLimit } from "@/lib/token-middleware";
import { randomUUID } from "crypto";
import { streamText, UIMessage } from "@/lib/chrome-ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const tokenCheck = await withTokenLimit(req, {
    estimatedTokens: 1000,
  });

  if (!tokenCheck.allowed) {
    return tokenCheck.response!;
  }

  const { messages, courses }: { messages: UIMessage[]; courses?: any[] } =
    await req.json();

  console.log(courses);

  // Enhanced prompt engineering for better LLM understanding
  const coursesContext =
    courses && courses.length > 0
      ? `

## CURRENT TIMETABLE STATE
The user currently has ${courses.length} course(s) in their timetable:

${courses
  .map(
    (course, index) => `
### Course ${index + 1}: ${course.code} - ${course.name}
- **Course ID**: ${course.id}
- **Color**: ${course.color}
- **Sessions**: ${course.sessions?.length || 0} session(s)
${
  course.sessions
    ?.map(
      (
        session: {
          days: any[];
          startTime: any;
          endTime: any;
          location: any;
          session_id: any;
          id: any;
        },
        sessionIndex: number
      ) => `
  **Session ${sessionIndex + 1}:**
  - Days: ${session.days?.join(", ") || "Not specified"}
  - Time: ${session.startTime || "TBD"} - ${session.endTime || "TBD"}
  - Location: ${session.location || "Not specified"}
  - Session ID: ${session.session_id || session.id || "Not specified"}`
    )
    .join("") || "  - No session details available"
}
`
  )
  .join("")}

**IMPORTANT**: These are the EXACT courses currently stored in the user's timetable. When referencing, modifying, or discussing courses, always use the specific course IDs, codes, and details shown above.`
      : `

## CURRENT TIMETABLE STATE
The user's timetable is currently **EMPTY** - no courses have been added yet.

**IMPORTANT**: Since there are no courses in the timetable, any course-related operations will be creating new entries.`;

  const systemPrompt = `You are an intelligent university timetable management assistant. Your primary role is to help users organize, manage, and optimize their academic schedules.

## YOUR CAPABILITIES
- Add new courses with detailed session information (days, times, locations)
- Update existing course details and schedules
- Delete courses from the timetable
- Provide schedule conflict detection and resolution
- Offer academic planning advice and optimization suggestions
- Answer questions about course scheduling and time management

## CONTEXT AWARENESS
${coursesContext}

## INTERACTION GUIDELINES
1. **Always reference the current timetable state** when making suggestions or modifications
2. **Use specific course IDs and codes** when performing operations on existing courses
3. **Validate schedule conflicts** before adding new courses or sessions
4. **Provide clear confirmations** when courses are added, updated, or deleted
5. **Offer helpful suggestions** for schedule optimization and time management
6. **Ask for clarification** when course details are incomplete or ambiguous

## RESPONSE STYLE
- Be conversational yet professional
- Provide clear, actionable information
- Explain the reasoning behind schedule recommendations
- Confirm actions taken on the timetable
- Offer proactive suggestions for schedule improvements

Remember: You have access to tools for adding, updating, and deleting courses. Always use the most current timetable state shown above when making decisions or recommendations.`;

  try {
    const result = await streamText({
      messages: messages,
      system: systemPrompt
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Chrome AI streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chrome AI error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Chrome AI is not available. Please use Chrome Canary with AI features enabled.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // const result = streamText({
  //   model: openai("gpt-4.1"),
  //   system: systemPrompt,
  //   messages: convertToModelMessages(messages),
  //   tools: {
  //     getWeatherInformation: {
  //       description: "show the weather in a given city to the user",
  //       inputSchema: z.object({ city: z.string() }),
  //       execute: async ({}: { city: string }) => {
  //         const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
  //         return weatherOptions[
  //           Math.floor(Math.random() * weatherOptions.length)
  //         ];
  //       },
  //     },
  //     getLocation: {
  //       description: "Get the user location.",
  //       inputSchema: z.object({}),
  //     },
  //     addCourse: {
  //       description: "Add a new course to the course store.",
  //       inputSchema: z.object({
  //         code: z.string().describe("Course code (e.g., 'INFO 3205')"),
  //         name: z
  //           .string()
  //           .describe("Course name (e.g., 'INFORMATION VISUALIZATION')"),
  //         sessions: z
  //           .array(
  //             z.object({
  //               days: z
  //                 .array(z.string())
  //                 .describe(
  //                   "Days of the week the course meets (e.g., ['MON', 'WED'])"
  //                 ),
  //               startTime: z
  //                 .string()
  //                 .describe("Start time in 24-hour format (e.g., '10:00')"),
  //               endTime: z
  //                 .string()
  //                 .describe("End time in 24-hour format (e.g., '11:20')"),
  //               location: z.string().describe("Physical location of the class"),
  //             })
  //           )
  //           .describe("Array of session objects"),
  //         color: z
  //           .string()
  //           .describe("Hex color code for the course (e.g., '#FFB3BA')"),
  //       }),
  //       execute: async ({
  //         code,
  //         name,
  //         sessions,
  //         color,
  //       }: {
  //         code: string;
  //         name: string;
  //         sessions: Array<{
  //           days: string[];
  //           startTime: string;
  //           endTime: string;
  //           location: string;
  //         }>;
  //         color: string;
  //       }) => {
  //         const courseData = {
  //           id: randomUUID(),
  //           code,
  //           name,
  //           color: color || "#FFB3BA",
  //           sessions: sessions.map((session) => ({
  //             ...session,
  //             session_id: randomUUID(),
  //           })),
  //         };

  //         return {
  //           success: true,
  //           course: courseData,
  //           message: `Successfully added ${code} - ${name} to your timetable!`,
  //           refreshCourses: true,
  //         };
  //       },
  //     },
  //     deleteCourse: {
  //       description: "Delete a course from the course store.",
  //       inputSchema: z.object({
  //         courseId: z.string().describe("The ID of the course to delete"),
  //       }),
  //       execute: async ({ courseId }: { courseId: string }) => {
  //         return {
  //           success: true,
  //           message: `Successfully deleted course ${courseId} from your timetable!`,
  //           refreshCourses: true,
  //         };
  //       },
  //     },
  //     updateCourse: {
  //       description: "Update an existing course in the course store.",
  //       inputSchema: z.object({
  //         courseId: z.string().describe("The ID of the course to update"),
  //         code: z
  //           .string()
  //           .optional()
  //           .describe("Course code (e.g., 'INFO 3205')"),
  //         name: z
  //           .string()
  //           .optional()
  //           .describe("Course name (e.g., 'INFORMATION VISUALIZATION')"),
  //         sessions: z
  //           .array(
  //             z.object({
  //               session_id: z.string().optional().describe("Session ID"),
  //               days: z
  //                 .array(z.string())
  //                 .describe(
  //                   "Days of the week the course meets (e.g., ['MON', 'WED'])"
  //                 ),
  //               startTime: z
  //                 .string()
  //                 .describe("Start time in 24-hour format (e.g., '10:00')"),
  //               endTime: z
  //                 .string()
  //                 .describe("End time in 24-hour format (e.g., '11:20')"),
  //               location: z.string().describe("Physical location of the class"),
  //             })
  //           )
  //           .optional()
  //           .describe("Array of session objects"),
  //         color: z
  //           .string()
  //           .optional()
  //           .describe("Hex color code for the course (e.g., '#FFB3BA')"),
  //       }),
  //       execute: async ({
  //         courseId,
  //         code,
  //         name,
  //         sessions,
  //         color,
  //       }: {
  //         courseId: string;
  //         code?: string;
  //         name?: string;
  //         sessions?: Array<{
  //           session_id?: string;
  //           days: string[];
  //           startTime: string;
  //           endTime: string;
  //           location: string;
  //         }>;
  //         color?: string;
  //       }) => {
  //         const updateData: any = { id: courseId };
  //         if (code !== undefined) updateData.code = code;
  //         if (name !== undefined) updateData.name = name;
  //         if (color !== undefined) updateData.color = color;
  //         if (sessions !== undefined) {
  //           updateData.sessions = sessions.map((session) => ({
  //             ...session,
  //             session_id:
  //               session.session_id ||
  //               `session-${Date.now()}-${Math.random()
  //                 .toString(36)
  //                 .substr(2, 9)}`,
  //           }));
  //         }

  //         return {
  //           success: true,
  //           course: updateData,
  //           message: `Successfully updated course ${courseId}!`,
  //           refreshCourses: true,
  //         };
  //       },
  //     },
  //     resetCourses: {
  //       description: "Delete all courses from the current timetable.",
  //       inputSchema: z.object({}),
  //       execute: async () => {
  //         return {
  //           success: true,
  //           message: "Successfully deleted all courses from your timetable!",
  //           refreshCourses: true,
  //         };
  //       },
  //     },
  //     searchNotes: {
  //       description:
  //         "Search and summarize user notes based on a query. Use this when users ask about their notes, want summaries, or need information from their saved notes.",
  //       inputSchema: z.object({
  //         query: z
  //           .string()
  //           .describe(
  //             "Search query or topic to find relevant notes (e.g., 'Physics', 'midterm', 'this week')"
  //           ),
  //       }),
  //       execute: async ({ query }) => {
  //         return {
  //           query,
  //           totalNotes: 0,
  //           notes: [],
  //         };
  //       },
  //     },
  //     updateTimetableSettings: {
  //       description:
  //         "Update timetable display settings such as text size, colors, opacity, and visibility options.",
  //       inputSchema: z.object({
  //         textSize: z
  //           .number()
  //           .min(6)
  //           .max(24)
  //           .optional()
  //           .describe("Text size in pixels (6-24)"),
  //         textColor: z
  //           .string()
  //           .optional()
  //           .describe("Text color (hex, rgb, or named color)"),
  //         opacity: z
  //           .number()
  //           .min(0)
  //           .max(100)
  //           .optional()
  //           .describe("Opacity percentage (0-100)"),
  //         abbreviationFormat: z
  //           .enum(["one", "two", "three", "full"])
  //           .optional()
  //           .describe("Course name abbreviation format"),
  //         hideCourseCode: z
  //           .boolean()
  //           .optional()
  //           .describe("Hide course codes from display"),
  //         hideCourseName: z
  //           .boolean()
  //           .optional()
  //           .describe("Hide course names from display"),
  //         hideTime: z
  //           .boolean()
  //           .optional()
  //           .describe("Hide time information from display"),
  //         hideDays: z
  //           .boolean()
  //           .optional()
  //           .describe("Hide days information from display"),
  //       }),
  //       execute: async ({
  //         textSize,
  //         textColor,
  //         opacity,
  //         abbreviationFormat,
  //         hideCourseCode,
  //         hideCourseName,
  //         hideTime,
  //         hideDays,
  //       }) => {
  //         try {
  //           const updates = [];

  //           if (textSize !== undefined) {
  //             updates.push(`text size to ${textSize}px`);
  //           }
  //           if (textColor !== undefined) {
  //             updates.push(`text color to ${textColor}`);
  //           }
  //           if (opacity !== undefined) {
  //             updates.push(`opacity to ${opacity}%`);
  //           }
  //           if (abbreviationFormat !== undefined) {
  //             updates.push(`abbreviation format to ${abbreviationFormat}`);
  //           }
  //           if (hideCourseCode !== undefined) {
  //             updates.push(
  //               `course code visibility to ${
  //                 hideCourseCode ? "hidden" : "visible"
  //               }`
  //             );
  //           }
  //           if (hideCourseName !== undefined) {
  //             updates.push(
  //               `course name visibility to ${
  //                 hideCourseName ? "hidden" : "visible"
  //               }`
  //             );
  //           }
  //           if (hideTime !== undefined) {
  //             updates.push(
  //               `time visibility to ${hideTime ? "hidden" : "visible"}`
  //             );
  //           }
  //           if (hideDays !== undefined) {
  //             updates.push(
  //               `days visibility to ${hideDays ? "hidden" : "visible"}`
  //             );
  //           }

  //           return {
  //             success: true,
  //             message: `Successfully updated timetable settings: ${updates.join(
  //               ", "
  //             )}`,
  //             settings: {
  //               textSize,
  //               textColor,
  //               opacity,
  //               abbreviationFormat,
  //               hideCourseCode,
  //               hideCourseName,
  //               hideTime,
  //               hideDays,
  //             },
  //             refreshSettings: true,
  //           };
  //         } catch (error) {
  //           console.error("Failed to update timetable settings:", error);
  //           return {
  //             error:
  //               error instanceof Error
  //                 ? error.message
  //                 : "Failed to update timetable settings",
  //           };
  //         }
  //       },
  //     },
  //     updateFontSettings: {
  //       description:
  //         "Update font settings for specific timetable elements (course code, course name, time, or days).",
  //       inputSchema: z.object({
  //         element: z
  //           .enum(["courseCode", "courseName", "time", "days"])
  //           .describe("Which element to update font settings for"),
  //         fontFamily: z.string().optional().describe("Font family name"),
  //         fontSize: z
  //           .number()
  //           .min(6)
  //           .max(48)
  //           .optional()
  //           .describe("Font size in pixels"),
  //         fontWeight: z
  //           .union([z.string(), z.number()])
  //           .optional()
  //           .describe("Font weight (normal, bold, 100-900)"),
  //         fontStyle: z
  //           .enum(["normal", "italic", "oblique"])
  //           .optional()
  //           .describe("Font style"),
  //         lineHeight: z
  //           .number()
  //           .min(0.5)
  //           .max(3)
  //           .optional()
  //           .describe("Line height multiplier"),
  //         letterSpacing: z
  //           .number()
  //           .min(-5)
  //           .max(10)
  //           .optional()
  //           .describe("Letter spacing in pixels"),
  //         textTransform: z
  //           .enum(["none", "uppercase", "lowercase", "capitalize"])
  //           .optional()
  //           .describe("Text transformation"),
  //       }),
  //       execute: async ({
  //         element,
  //         fontFamily,
  //         fontSize,
  //         fontWeight,
  //         fontStyle,
  //         lineHeight,
  //         letterSpacing,
  //         textTransform,
  //       }) => {
  //         try {
  //           const updates = [];

  //           if (fontFamily !== undefined) {
  //             updates.push(`font family to ${fontFamily}`);
  //           }
  //           if (fontSize !== undefined) {
  //             updates.push(`font size to ${fontSize}px`);
  //           }
  //           if (fontWeight !== undefined) {
  //             updates.push(`font weight to ${fontWeight}`);
  //           }
  //           if (fontStyle !== undefined) {
  //             updates.push(`font style to ${fontStyle}`);
  //           }
  //           if (lineHeight !== undefined) {
  //             updates.push(`line height to ${lineHeight}`);
  //           }
  //           if (letterSpacing !== undefined) {
  //             updates.push(`letter spacing to ${letterSpacing}px`);
  //           }
  //           if (textTransform !== undefined) {
  //             updates.push(`text transform to ${textTransform}`);
  //           }

  //           return {
  //             success: true,
  //             message: `Successfully updated ${element} font settings: ${updates.join(
  //               ", "
  //             )}`,
  //             element,
  //             fontSettings: {
  //               fontFamily,
  //               fontSize,
  //               fontWeight,
  //               fontStyle,
  //               lineHeight,
  //               letterSpacing,
  //               textTransform,
  //             },
  //             refreshSettings: true,
  //           };
  //         } catch (error) {
  //           console.error("Failed to update font settings:", error);
  //           return {
  //             error:
  //               error instanceof Error
  //                 ? error.message
  //                 : "Failed to update font settings",
  //           };
  //         }
  //       },
  //     },
  //   },
  // });

  // console.log(result);

  // const response = result.toUIMessageStreamResponse();

  // result.usage
  //   .then(async (usage) => {
  //     if (usage && usage.totalTokens) {
  //       await tokenCheck.recordUsage(usage.totalTokens);
  //     }
  //   })
  //   .catch((error) => {
  //     console.error("Failed to record token usage:", error);
  //   });

  // const headers = new Headers(response.headers);
  // headers.set(
  //   "X-RateLimit-Tokens-Used",
  //   tokenCheck.usage.tokensUsed.toString()
  // );
  // headers.set(
  //   "X-RateLimit-Tokens-Remaining",
  //   tokenCheck.usage.tokensRemaining.toString()
  // );
  // headers.set(
  //   "X-RateLimit-Requests-Used",
  //   tokenCheck.usage.requestsUsed.toString()
  // );
  // headers.set(
  //   "X-RateLimit-Requests-Remaining",
  //   tokenCheck.usage.requestsRemaining.toString()
  // );
  // headers.set(
  //   "X-RateLimit-Reset",
  //   new Date(tokenCheck.usage.resetTime).toISOString()
  // );

  // if (tokenCheck.usage.warningTriggered) {
  //   headers.set("X-RateLimit-Warning", "true");
  //   headers.set(
  //     "X-RateLimit-Warning-Message",
  //     tokenCheck.usage.message || "Approaching daily limit"
  //   );
  // }

  // return new Response(response.body, {
  //   status: response.status,
  //   statusText: response.statusText,
  //   headers,
  // });
}
