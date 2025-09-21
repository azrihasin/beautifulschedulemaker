"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from './markdown-renderer';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  streamingSpeed?: number; // characters per interval
  streamingInterval?: number; // milliseconds between updates
  onStreamingComplete?: () => void;
  className?: string;
}

export function StreamingText({
  content,
  isStreaming = false,
  streamingSpeed = 3,
  streamingInterval = 50,
  onStreamingComplete,
  className
}: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // If not streaming or content is empty, show full content immediately
    if (!isStreaming || !content) {
      setDisplayedContent(content);
      setIsCurrentlyStreaming(false);
      return;
    }

    // If content changed and we're streaming, restart the streaming
    if (content !== displayedContent) {
      setIsCurrentlyStreaming(true);
      indexRef.current = displayedContent.length; // Start from where we left off
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start streaming the new content
      intervalRef.current = setInterval(() => {
        const currentIndex = indexRef.current;
        const nextIndex = Math.min(currentIndex + streamingSpeed, content.length);
        
        setDisplayedContent(content.slice(0, nextIndex));
        indexRef.current = nextIndex;

        // Check if streaming is complete
        if (nextIndex >= content.length) {
          setIsCurrentlyStreaming(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onStreamingComplete?.();
        }
      }, streamingInterval);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content, isStreaming, streamingSpeed, streamingInterval, onStreamingComplete]);

  // Show full content immediately if not streaming
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      setIsCurrentlyStreaming(false);
    }
  }, [isStreaming, content]);

  return (
    <div className={className}>
      <MarkdownRenderer>{displayedContent}</MarkdownRenderer>
      {isCurrentlyStreaming && (
        <span className="inline-block w-2 h-5 bg-current animate-pulse ml-1" />
      )}
    </div>
  );
}

export default StreamingText;