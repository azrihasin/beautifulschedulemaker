import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface TypingAnimationProps {
  text: string;
  isTyping: boolean;
  className?: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
}

export function TypingAnimation({ 
  text, 
  isTyping, 
  className, 
  speed = 50,
  onComplete 
}: TypingAnimationProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // Reset when text changes or typing starts
  useEffect(() => {
    if (isTyping) {
      setDisplayText('');
      setCurrentIndex(0);
    } else {
      setDisplayText(text);
      setCurrentIndex(text.length);
    }
  }, [text, isTyping]);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, isTyping, speed, onComplete]);

  // Cursor blinking effect
  useEffect(() => {
    if (!isTyping) {
      setShowCursor(false);
      return;
    }

    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorTimer);
  }, [isTyping]);

  return (
    <span className={cn('inline-block', className)}>
      {displayText}
      {isTyping && (
        <span 
          className={cn(
            'inline-block w-0.5 h-4 bg-current ml-0.5 transition-opacity duration-100',
            showCursor ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </span>
  );
}