// Chrome Built-in AI utility functions
// Uses Chrome's native AI Language Model API

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        create: (options?: any) => Promise<LanguageModel>;
        capabilities: () => Promise<any>;
      };
    };
  }
  
  interface LanguageModel {
    prompt: (text: string) => Promise<string>;
    promptStreaming: (text: string) => AsyncIterable<string>;
    destroy: () => void;
  }
}

interface LanguageModel {
  prompt: (text: string) => Promise<string>;
  promptStreaming: (text: string) => AsyncIterable<string>;
  destroy: () => void;
}

interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

interface StreamTextResult {
  textStream: AsyncIterable<string>;
  text: Promise<string>;
}

class ChromeAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChromeAIError';
  }
}

// Check if Chrome AI is available
export function isChromeAIAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'ai' in window && 
         window.ai?.languageModel?.create !== undefined;
}

// Create a language model session using the Chrome AI API
export async function createLanguageModel(): Promise<LanguageModel> {
  if (!isChromeAIAvailable()) {
    throw new ChromeAIError('Chrome AI is not available. Please use Chrome Canary with AI features enabled.');
  }

  try {
    // Use the LanguageModel.create() API as shown in the example
    const session = await window.ai!.languageModel!.create();
    return session;
  } catch (error) {
    throw new ChromeAIError(`Failed to create language model: ${error}`);
  }
}

// Convert UI messages to a single prompt string
export function convertMessagesToPrompt(messages: UIMessage[]): string {
  return messages
    .map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else {
        return `Assistant: ${msg.content}`;
      }
    })
    .join('\n\n');
}

// Stream text function that mimics AI SDK's streamText
export async function streamText(options: {
  messages?: UIMessage[];
  prompt?: string;
  system?: string;
}): Promise<StreamTextResult> {
  const session = await createLanguageModel();
  
  let finalPrompt = '';
  
  if (options.system) {
    finalPrompt += `System: ${options.system}\n\n`;
  }
  
  if (options.messages) {
    finalPrompt += convertMessagesToPrompt(options.messages);
  } else if (options.prompt) {
    finalPrompt += options.prompt;
  }

  const stream = session.promptStreaming(finalPrompt);
  
  // Create a text promise that collects all chunks
  const textPromise = (async () => {
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk;
    }
    return fullText;
  })();

  return {
    textStream: stream,
    text: textPromise
  };
}

// Generate text function that mimics AI SDK's generateText
export async function generateText(options: {
  messages?: UIMessage[];
  prompt?: string;
  system?: string;
}): Promise<{ text: string }> {
  const session = await createLanguageModel();
  
  let finalPrompt = '';
  
  if (options.system) {
    finalPrompt += `System: ${options.system}\n\n`;
  }
  
  if (options.messages) {
    finalPrompt += convertMessagesToPrompt(options.messages);
  } else if (options.prompt) {
    finalPrompt += options.prompt;
  }

  const result = await session.prompt(finalPrompt);
  
  return { text: result };
}

// Hook to replace useChat from @ai-sdk/react
export function useChromeAIChat(options: {
  api?: string;
  onError?: (error: Error) => void;
  sendAutomaticallyWhen?: any;
}) {
  const [messages, setMessages] = React.useState<UIMessage[]>([]);
  const [status, setStatus] = React.useState<'idle' | 'streaming'>('idle');
  const [isLoading, setIsLoading] = React.useState(false);

  const sendMessage = async (message: { text: string; files?: any[] }) => {
    if (!message.text.trim()) return;

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message.text,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setStatus('streaming');
    setIsLoading(true);

    try {
      // Create a language model session
      const session = await createLanguageModel();
      
      // Create assistant message placeholder
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Convert messages to a simple prompt format
      const prompt = convertMessagesToPrompt([...messages, userMessage]);

      // Use promptStreaming as shown in the example
      const stream = session.promptStreaming(prompt);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: fullResponse }
              : msg
          )
        );
      }

      // Clean up the session
      session.destroy();

    } catch (error) {
      console.error('Chrome AI error:', error);
      if (options.onError) {
        options.onError(error as Error);
      }
      
      // Add error message to chat
      const errorMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure Chrome AI is available and try again.',
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setStatus('idle');
      setIsLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    status,
    isLoading,
    setMessages
  };
}

// React import for the hook
import React from 'react';

export { ChromeAIError };