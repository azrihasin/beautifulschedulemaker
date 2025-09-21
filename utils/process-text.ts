/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai';

// Initialize the OpenAI client with DeepSeek configuration
const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY, // Use environment variable
    baseURL: 'https://api.deepseek.com', // Directly use DeepSeek API URL
});

// Define the tools (function calling)
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_subjects',
      description: `Extract and return an array of subjects from the provided text. Assign a consistent hex color code to each subject based on its code or name. The color field is required and must be a valid hex color code. 
    Ensure the colors contrast well with the background image and complement the default background color (Golden Yellow, #FFCC33). 
    Use the following color palette for inspiration:
    - Deep Orange (#FF7F11): Matches the character's cloak while providing warmth.
    - Sky Blue (#00CCFF): Reflects the electric bolts and adds a cool contrast.
    - Dark Slate Gray (#2C2F33): A neutral tone to balance the bright colors and represent the dark background elements.
    - Cream White (#FFFFE0): Provides a light, soft contrast for text or highlights.
    `,
      parameters: {
        type: 'object',
        properties: {
          subjects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                sessions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      day: { type: 'string' },
                      startTime: { 
                        type: 'string',
                        pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', // 24-hour format regex
                      },
                      endTime: { 
                        type: 'string',
                        pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', // 24-hour format regex
                      },
                      location: { type: 'string' },
                    },
                    required: ['day', 'startTime', 'endTime', 'location'],
                  },
                },
                color: { 
                  type: 'string',
                  pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', // Hex color code regex
                },
              },
              required: ['code', 'name', 'sessions', 'color'], // color is required
            },
          },
        },
        required: ['subjects'],
      },
    },
  },
];

// Function to separate combined days (e.g., "M-W" → ["MON", "WED"])
function separateDays(day: string): string[] {
    const dayMap: { [key: string]: string } = {
        'M': 'MON',
        'T': 'TUE',
        'W': 'WED',
        'TH': 'THU',
        'F': 'FRI',
        'S': 'SAT',
        'U': 'SUN',
    };

    // Split combined days (e.g., "M-W" → ["M", "W"])
    const days = day.split('-');
    return days.map((d) => dayMap[d] || d);
}

// Function to process the subjects and return a string
function getSubjects(subjects: Array<{
  code: string;
  name: string;
  sessions: Array<{
      day: string;
      startTime: string;
      endTime: string;
      location: string;
  }>;
  color: string;
}>): string {
  console.log('Validating and processing subjects...');

  // Validate the subjects array
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      console.log('Subjects array is invalid or empty.');
      return '';
  }

  // Process each subject
  const processedSubjects = subjects.map((subject) => {
      // Validate the sessions array
      if (!subject.sessions || !Array.isArray(subject.sessions) || subject.sessions.length === 0) {
          console.warn(`Subject ${subject.code} has no valid sessions. Skipping...`);
          return null;
      }

      // Process each session
      const processedSessions = subject.sessions.flatMap((session) => {
          // Separate combined days into individual days
          const days = separateDays(session.day);

          // Create a new session entry for each day
          return days.map((day) => ({
              day: day,
              startTime: session.startTime,
              endTime: session.endTime,
              location: session.location,
          }));
      });

      // Return the subject with its processed sessions
      return {
          code: subject.code,
          name: subject.name,
          sessions: processedSessions,
          color: subject.color,
      };
  }).filter((subject) => subject !== null); // Remove null entries

  console.log('Processed subjects:', processedSubjects);
  // Return the processed subjects as a JSON string
  return JSON.stringify(processedSubjects);
}
// Function to send messages to DeepSeek and handle function calling
export async function processTextWithDeepSeek(text: string) {
    try {
        console.log('Starting text processing with DeepSeek...');

        // Initial user message
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: 'Extract the subjects from the provided text and return them in the required format. Assign a consistent hex color code to each subject based on its code or name. Use hex color codes (e.g., #FF5733, #33FF57) for the colors.',
            },
            { role: 'user', content: text },
        ];

        console.log('Sending initial message to DeepSeek...');
        // Send the message to DeepSeek
        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages,
            tools,
        });

        const message = response.choices[0].message;
        console.log('Received response from DeepSeek:', message);

        // Check if the model wants to call a function
        if (message.tool_calls) {
            console.log('DeepSeek requested a function call.');

            const toolCall = message.tool_calls[0];
            console.log('Function call details:', toolCall);

            if (toolCall.function.name === 'get_subjects') {
                console.log('Parsing function arguments...');
                // Parse the arguments
                const { subjects } = JSON.parse(toolCall.function.arguments);
                console.log('Function arguments:', subjects);

                // Call the function
                console.log('Calling getSubjects function...');
                const result = getSubjects(subjects);
                console.log('Function result:', result);

                // Return the function result directly
                return result;
            }
        }

        console.log('No function call requested by DeepSeek. Returning model response.');
        // If no function is called, return the model's response
        return message.content;
    } catch (error: any) {
        console.error('Error processing text with DeepSeek:', error.message);
        throw error;
    }
}