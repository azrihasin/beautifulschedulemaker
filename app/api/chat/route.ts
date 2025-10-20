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

}
