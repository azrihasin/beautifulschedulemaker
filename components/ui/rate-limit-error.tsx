"use client";

import React from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RateLimitErrorProps {
  tokensUsed: number;
  tokensRemaining: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function RateLimitError({
  tokensUsed,
  tokensRemaining,
  requestsUsed,
  requestsRemaining,
  resetTime,
  onRetry,
  onDismiss,
  className
}: RateLimitErrorProps) {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const timeUntilReset = resetDate.getTime() - now.getTime();
  const hoursUntilReset = Math.ceil(timeUntilReset / (1000 * 60 * 60));
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isTokenLimit = tokensRemaining === 0;
  const isRequestLimit = requestsRemaining === 0;

  return (
    <Alert className={`border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Daily Limit Reached
      </AlertTitle>
      <AlertDescription className="space-y-3 text-amber-700 dark:text-amber-300">
        <p>
          {isTokenLimit && isRequestLimit
            ? "You've reached both your daily token and request limits."
            : isTokenLimit
            ? "You've reached your daily token limit."
            : "You've reached your daily request limit."}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span className="font-medium">Tokens</span>
            </div>
            <div className="text-xs">
              {tokensUsed.toLocaleString()} / {(tokensUsed + tokensRemaining).toLocaleString()} used
            </div>
            <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
              <div 
                className="bg-amber-500 dark:bg-amber-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (tokensUsed / (tokensUsed + tokensRemaining)) * 100)}%` 
                }}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">Requests</span>
            </div>
            <div className="text-xs">
              {requestsUsed} / {requestsUsed + requestsRemaining} used
            </div>
            <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
              <div 
                className="bg-amber-500 dark:bg-amber-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (requestsUsed / (requestsUsed + requestsRemaining)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">Your limits will reset:</p>
          <p>
            {hoursUntilReset <= 1 
              ? `In less than an hour (${formatTime(resetDate)})`
              : `In ${hoursUntilReset} hours at ${formatTime(resetDate)}`
            }
          </p>
        </div>
        
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
              >
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface RateLimitWarningProps {
  tokensUsed: number;
  tokensTotal: number;
  percentage: number;
  onDismiss?: () => void;
  className?: string;
}

export function RateLimitWarning({
  tokensUsed,
  tokensTotal,
  percentage,
  onDismiss,
  className
}: RateLimitWarningProps) {
  return (
    <Alert className={`border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 ${className}`}>
      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Approaching Daily Limit
      </AlertTitle>
      <AlertDescription className="space-y-2 text-yellow-700 dark:text-yellow-300">
        <p>
          You've used {percentage}% of your daily token limit ({tokensUsed.toLocaleString()} / {tokensTotal.toLocaleString()} tokens).
        </p>
        
        <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
          <div 
            className="bg-yellow-500 dark:bg-yellow-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        
        <p className="text-sm">
          Consider saving your work and planning your remaining requests carefully.
        </p>
        
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/20 mt-2"
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}