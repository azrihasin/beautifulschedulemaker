"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { AlertCircle, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'error' | 'rate-limited';
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          text: 'Connected'
        };
      case 'connecting':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          text: 'Connecting...'
        };
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          text: 'Connection Error'
        };
      case 'rate-limited':
        return {
          icon: AlertCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          text: 'Rate Limited'
        };
      default:
        return {
          icon: Wifi,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium",
      config.bgColor,
      config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
    </div>
  );
}

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>AI is thinking...</span>
    </div>
  );
}

interface StreamingIndicatorProps {
  className?: string;
}

export function StreamingIndicator({ className }: StreamingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
      <span>Processing your request...</span>
    </div>
  );
}

interface RetryButtonProps {
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
}

export function RetryButton({ onRetry, isRetrying, className }: RetryButtonProps) {
  return (
    <Button
      onClick={onRetry}
      disabled={isRetrying}
      variant="outline"
      size="sm"
      className={cn("flex items-center gap-2", className)}
    >
      <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
      {isRetrying ? 'Retrying...' : 'Retry'}
    </Button>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 rounded-md h-4"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  className?: string;
}

export function ErrorBoundaryFallback({ error, resetError, className }: ErrorBoundaryFallbackProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg",
      className
    )}>
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-red-600 mb-4 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={resetError} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}