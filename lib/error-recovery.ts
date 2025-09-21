/**
 * Enhanced error recovery utilities for AI SDK v5 integration
 * Provides fallback strategies for interrupted streaming responses and comprehensive error handling
 */

// Error recovery configuration
export interface ErrorRecoveryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
  timeoutMs: number;
  enableFallback: boolean;
}

export const DEFAULT_ERROR_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitterFactor: 0.1,
  timeoutMs: 30000,
  enableFallback: true
};

// Enhanced error types for comprehensive error handling
export interface EnhancedError {
  type: 'network' | 'validation' | 'rate_limit' | 'tool_execution' | 'streaming' | 'timeout' | 'unknown';
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number;
  context?: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Streaming interruption recovery state
export interface StreamingRecoveryState {
  messageId: string;
  partialContent: string;
  toolCalls: any[];
  lastUpdateTime: number;
  retryCount: number;
  recoveryStrategy: 'resume' | 'restart' | 'fallback';
}

/**
 * Enhanced error classifier with AI SDK v5 specific error types
 */
export function classifyError(error: any): EnhancedError {
  const timestamp = new Date().toISOString();
  
  // Network-related errors
  if (error.name === 'AbortError' || error.message?.includes('aborted')) {
    return {
      type: 'network',
      message: 'Request was cancelled or aborted',
      retryable: false,
      timestamp,
      severity: 'low'
    };
  }
  
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
      retryable: true,
      timestamp,
      severity: 'medium',
      context: { timeoutType: 'request' }
    };
  }
  
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      retryable: true,
      timestamp,
      severity: 'medium'
    };
  }
  
  // HTTP status-based errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          type: 'validation',
          message: 'Invalid request. Please check your input and try again.',
          code: 'BAD_REQUEST',
          retryable: false,
          timestamp,
          severity: 'low'
        };
      case 429:
        return {
          type: 'rate_limit',
          message: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMITED',
          retryable: true,
          retryAfter: parseInt(error.headers?.['retry-after']) || 60,
          timestamp,
          severity: 'medium'
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'network',
          message: 'Server error. Please try again.',
          code: `HTTP_${error.status}`,
          retryable: true,
          timestamp,
          severity: 'high'
        };
    }
  }
  
  // AI SDK v5 specific errors
  if (error.type === 'ai.streamingError') {
    return {
      type: 'streaming',
      message: 'Streaming connection was interrupted. Please try again.',
      code: 'STREAMING_INTERRUPTED',
      retryable: true,
      timestamp,
      severity: 'medium',
      context: { streamingError: true }
    };
  }
  
  if (error.type === 'ai.toolExecutionError') {
    return {
      type: 'tool_execution',
      message: 'Course action failed to execute. Please try again.',
      code: 'TOOL_EXECUTION_FAILED',
      retryable: true,
      timestamp,
      severity: 'medium',
      context: { toolName: error.toolName, toolArgs: error.args }
    };
  }
  
  // Validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return {
      type: 'validation',
      message: error.message || 'Input validation failed',
      retryable: false,
      timestamp,
      severity: 'low'
    };
  }
  
  // Default unknown error
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    retryable: true,
    timestamp,
    severity: 'high',
    context: { originalError: error }
  };
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  retryCount: number, 
  config: ErrorRecoveryConfig = DEFAULT_ERROR_RECOVERY_CONFIG
): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * config.jitterFactor * exponentialDelay;
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Enhanced retry mechanism with comprehensive error handling
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: ErrorRecoveryConfig = DEFAULT_ERROR_RECOVERY_CONFIG,
  onRetry?: (error: EnhancedError, retryCount: number, delay: number) => void
): Promise<T> {
  let lastError: EnhancedError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), config.timeoutMs);
      });
      
      const operationPromise = operation();
      return await Promise.race([operationPromise, timeoutPromise]);
      
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Calculate delay and notify callback
      const delay = calculateRetryDelay(attempt, config);
      if (onRetry) {
        onRetry(lastError, attempt + 1, delay);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Streaming recovery manager for handling interrupted streaming responses
 */
export class StreamingRecoveryManager {
  private recoveryStates = new Map<string, StreamingRecoveryState>();
  private config: ErrorRecoveryConfig;
  
  constructor(config: ErrorRecoveryConfig = DEFAULT_ERROR_RECOVERY_CONFIG) {
    this.config = config;
  }
  
  /**
   * Save streaming state for potential recovery
   */
  saveStreamingState(
    messageId: string,
    partialContent: string,
    toolCalls: any[] = [],
    recoveryStrategy: 'resume' | 'restart' | 'fallback' = 'resume'
  ): void {
    this.recoveryStates.set(messageId, {
      messageId,
      partialContent,
      toolCalls,
      lastUpdateTime: Date.now(),
      retryCount: 0,
      recoveryStrategy
    });
  }
  
  /**
   * Attempt to recover interrupted streaming
   */
  async recoverStreaming(
    messageId: string,
    restartCallback: () => Promise<void>,
    resumeCallback?: (state: StreamingRecoveryState) => Promise<void>
  ): Promise<boolean> {
    const state = this.recoveryStates.get(messageId);
    if (!state) {
      return false;
    }
    
    try {
      switch (state.recoveryStrategy) {
        case 'resume':
          if (resumeCallback && state.partialContent) {
            await resumeCallback(state);
            return true;
          }
          // Fall through to restart if resume not available
          
        case 'restart':
          await restartCallback();
          return true;
          
        case 'fallback':
          // Provide fallback response based on partial content
          if (state.partialContent) {
            console.log('Using fallback response for interrupted streaming');
            return true;
          }
          break;
      }
    } catch (recoveryError) {
      console.error('Streaming recovery failed:', recoveryError);
    }
    
    return false;
  }
  
  /**
   * Clean up old recovery states
   */
  cleanup(maxAge: number = 300000): void { // 5 minutes default
    const now = Date.now();
    for (const [messageId, state] of this.recoveryStates.entries()) {
      if (now - state.lastUpdateTime > maxAge) {
        this.recoveryStates.delete(messageId);
      }
    }
  }
  
  /**
   * Get recovery state for debugging
   */
  getRecoveryState(messageId: string): StreamingRecoveryState | undefined {
    return this.recoveryStates.get(messageId);
  }
}

/**
 * Graceful degradation strategies for different error scenarios
 */
export class GracefulDegradationManager {
  private fallbackStrategies = new Map<string, () => Promise<any>>();
  
  /**
   * Register a fallback strategy for a specific operation
   */
  registerFallback(operationType: string, fallbackFn: () => Promise<any>): void {
    this.fallbackStrategies.set(operationType, fallbackFn);
  }
  
  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    operationType: string,
    primaryOperation: () => Promise<T>,
    config: ErrorRecoveryConfig = DEFAULT_ERROR_RECOVERY_CONFIG
  ): Promise<T> {
    try {
      return await retryWithBackoff(primaryOperation, config);
    } catch (error) {
      const enhancedError = classifyError(error);
      
      // Try fallback strategy if available and error is severe
      if (config.enableFallback && enhancedError.severity === 'high' || enhancedError.severity === 'critical') {
        const fallback = this.fallbackStrategies.get(operationType);
        if (fallback) {
          console.log(`Executing fallback strategy for ${operationType}`);
          try {
            return await fallback();
          } catch (fallbackError) {
            console.error('Fallback strategy failed:', fallbackError);
          }
        }
      }
      
      throw enhancedError;
    }
  }
}

// Global instances for use throughout the application
export const streamingRecoveryManager = new StreamingRecoveryManager();
export const gracefulDegradationManager = new GracefulDegradationManager();

// Cleanup interval for recovery states
setInterval(() => {
  streamingRecoveryManager.cleanup();
}, 60000); // Clean up every minute