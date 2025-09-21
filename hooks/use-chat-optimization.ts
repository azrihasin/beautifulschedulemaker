/**
 * Chat optimization hook for handling long conversation histories and performance
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Message } from 'ai';

interface ChatOptimizationConfig {
  maxMessages: number;
  compressionThreshold: number;
  virtualScrollThreshold: number;
}

interface OptimizedMessage extends Message {
  isCompressed?: boolean;
  originalLength?: number;
}

import { config } from '@/lib/production-config';

const DEFAULT_CONFIG: ChatOptimizationConfig = {
  maxMessages: config.chat.maxMessages,
  compressionThreshold: config.chat.compressionThreshold,
  virtualScrollThreshold: config.chat.virtualScrollThreshold,
};

export function useChatOptimization(
  messages: Message[],
  config: Partial<ChatOptimizationConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const messageCache = useRef(new Map<string, OptimizedMessage>());
  const compressionRef = useRef<{ compressed: boolean; originalCount: number }>({
    compressed: false,
    originalCount: 0
  });

  // Optimize messages by removing old ones and compressing content
  const optimizedMessages = useMemo(() => {
    if (messages.length <= finalConfig.compressionThreshold) {
      return messages;
    }

    // Keep system messages and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-finalConfig.maxMessages);
    
    // Combine and deduplicate
    const combined = [...systemMessages, ...recentMessages];
    const uniqueMessages = combined.filter((message, index, arr) => 
      arr.findIndex(m => m.id === message.id) === index
    );

    // Update compression status
    compressionRef.current = {
      compressed: messages.length > finalConfig.maxMessages,
      originalCount: messages.length
    };

    return uniqueMessages;
  }, [messages, finalConfig.maxMessages, finalConfig.compressionThreshold]);

  // Compress message content for very long messages
  const compressMessage = useCallback((message: Message): OptimizedMessage => {
    const cached = messageCache.current.get(message.id);
    if (cached) return cached;

    if (message.content.length > 1000) {
      const compressed: OptimizedMessage = {
        ...message,
        content: message.content.substring(0, 500) + '... [message truncated]',
        isCompressed: true,
        originalLength: message.content.length
      };
      messageCache.current.set(message.id, compressed);
      return compressed;
    }

    messageCache.current.set(message.id, message);
    return message;
  }, []);

  // Get compressed messages for display
  const displayMessages = useMemo(() => {
    return optimizedMessages.map(compressMessage);
  }, [optimizedMessages, compressMessage]);

  // Virtual scrolling helpers
  const shouldUseVirtualScrolling = messages.length > finalConfig.virtualScrollThreshold;

  // Memory cleanup
  useEffect(() => {
    const cleanup = () => {
      // Keep only recent message cache entries
      const recentIds = new Set(optimizedMessages.map(m => m.id));
      for (const [id] of messageCache.current) {
        if (!recentIds.has(id)) {
          messageCache.current.delete(id);
        }
      }
    };

    const interval = setInterval(cleanup, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [optimizedMessages]);

  // Performance metrics
  const metrics = useMemo(() => ({
    originalCount: messages.length,
    optimizedCount: displayMessages.length,
    compressionRatio: messages.length > 0 ? displayMessages.length / messages.length : 1,
    isCompressed: compressionRef.current.compressed,
    shouldUseVirtualScrolling,
    cacheSize: messageCache.current.size
  }), [messages.length, displayMessages.length, shouldUseVirtualScrolling]);

  return {
    optimizedMessages: displayMessages,
    metrics,
    shouldUseVirtualScrolling,
    compressMessage
  };
}

// Hook for managing chat input throttling
export function useChatInputThrottle(delay: number = 1000) {
  const lastSubmitTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledSubmit = useCallback((
    submitFn: () => void,
    onThrottled?: () => void
  ) => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime.current;

    if (timeSinceLastSubmit >= delay) {
      // Allow immediate submission
      lastSubmitTime.current = now;
      submitFn();
    } else {
      // Throttle the submission
      if (onThrottled) onThrottled();
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule submission after remaining delay
      const remainingDelay = delay - timeSinceLastSubmit;
      timeoutRef.current = setTimeout(() => {
        lastSubmitTime.current = Date.now();
        submitFn();
      }, remainingDelay);
    }
  }, [delay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { throttledSubmit };
}

// Hook for managing streaming response optimization
export function useStreamingOptimization() {
  const bufferRef = useRef<string>('');
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const bufferContent = useCallback((content: string, onFlush: (buffered: string) => void) => {
    bufferRef.current += content;

    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    // Flush buffer after a short delay to batch updates
    flushTimeoutRef.current = setTimeout(() => {
      if (bufferRef.current) {
        onFlush(bufferRef.current);
        bufferRef.current = '';
      }
    }, 50); // 50ms batching delay
  }, []);

  const flushBuffer = useCallback((onFlush: (buffered: string) => void) => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    if (bufferRef.current) {
      onFlush(bufferRef.current);
      bufferRef.current = '';
    }
  }, []);

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  return { bufferContent, flushBuffer };
}