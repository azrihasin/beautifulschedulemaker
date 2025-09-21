/**
 * AI SDK v5 Performance Monitoring and Telemetry
 * Provides enhanced monitoring for course management operations
 */

// Import experimental_telemetry with fallback for test environments
let experimental_telemetry: any;
try {
  const aiModule = require('ai');
  experimental_telemetry = aiModule.experimental_telemetry;
} catch (error) {
  // Fallback for test environments or when AI SDK is not available
  experimental_telemetry = {
    recordSpan: (name: string, fn: () => Promise<void>) => fn()
  };
}

// If experimental_telemetry is still undefined, provide a mock
if (!experimental_telemetry) {
  experimental_telemetry = {
    recordSpan: (name: string, fn: () => Promise<void>) => fn()
  };
}

export interface AISDKPerformanceMetrics {
  operationType: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokensUsed?: number;
  toolCallsExecuted: number;
  streamingEnabled: boolean;
  cacheHit: boolean;
  errorOccurred: boolean;
  errorType?: string;
}

export interface BulkOperationMetrics extends AISDKPerformanceMetrics {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  parallelProcessing: boolean;
}

class AISDKPerformanceMonitor {
  private metrics: AISDKPerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;

  /**
   * Record performance metrics for AI SDK v5 operations
   */
  recordMetrics(metrics: AISDKPerformanceMetrics): void {
    // Add timestamp and ensure we don't exceed max metrics
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift(); // Remove oldest metric
    }
    
    this.metrics.push({
      ...metrics,
      endTime: metrics.endTime || Date.now()
    });

    // Log to AI SDK v5 telemetry
    experimental_telemetry.recordSpan(`ai-sdk-${metrics.operationType}`, async () => {
      console.log('AI SDK v5 Performance:', {
        operation: metrics.operationType,
        duration: metrics.duration,
        tokensUsed: metrics.tokensUsed,
        toolCalls: metrics.toolCallsExecuted,
        streaming: metrics.streamingEnabled,
        cached: metrics.cacheHit,
        error: metrics.errorOccurred
      });
    });
  }

  /**
   * Record bulk operation metrics with parallel processing info
   */
  recordBulkMetrics(metrics: BulkOperationMetrics): void {
    this.recordMetrics(metrics);
    
    // Additional telemetry for bulk operations
    experimental_telemetry.recordSpan('bulk-operation-analysis', async () => {
      const successRate = metrics.totalItems > 0 ? metrics.successfulItems / metrics.totalItems : 0;
      console.log('Bulk Operation Analysis:', {
        totalItems: metrics.totalItems,
        successRate: successRate.toFixed(2),
        parallelProcessing: metrics.parallelProcessing,
        avgTimePerItem: metrics.totalItems > 0 ? metrics.duration / metrics.totalItems : 0
      });
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    averageTokensUsed: number;
    errorRate: number;
    cacheHitRate: number;
    streamingUsage: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        averageTokensUsed: 0,
        errorRate: 0,
        cacheHitRate: 0,
        streamingUsage: 0
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalTokens = this.metrics.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const errors = this.metrics.filter(m => m.errorOccurred).length;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const streamingOps = this.metrics.filter(m => m.streamingEnabled).length;

    return {
      totalOperations: this.metrics.length,
      averageDuration: totalDuration / this.metrics.length,
      averageTokensUsed: totalTokens / this.metrics.length,
      errorRate: errors / this.metrics.length,
      cacheHitRate: cacheHits / this.metrics.length,
      streamingUsage: streamingOps / this.metrics.length
    };
  }

  /**
   * Get recent performance trends
   */
  getRecentTrends(minutes: number = 5): {
    recentOperations: number;
    recentAverageDuration: number;
    recentErrorRate: number;
  } {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.endTime > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        recentOperations: 0,
        recentAverageDuration: 0,
        recentErrorRate: 0
      };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const errors = recentMetrics.filter(m => m.errorOccurred).length;

    return {
      recentOperations: recentMetrics.length,
      recentAverageDuration: totalDuration / recentMetrics.length,
      recentErrorRate: errors / recentMetrics.length
    };
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.endTime > cutoffTime);
  }
}

// Singleton instance for global performance monitoring
export const aiSDKPerformanceMonitor = new AISDKPerformanceMonitor();

/**
 * Helper function to measure AI SDK v5 operation performance
 */
export async function measureAISDKOperation<T>(
  operationType: string,
  operation: () => Promise<T>,
  options: {
    streamingEnabled?: boolean;
    cacheHit?: boolean;
    expectedToolCalls?: number;
  } = {}
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let errorOccurred = false;
  let errorType: string | undefined;

  try {
    result = await operation();
    return result;
  } catch (error) {
    errorOccurred = true;
    errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    throw error;
  } finally {
    const endTime = Date.now();
    const duration = endTime - startTime;

    aiSDKPerformanceMonitor.recordMetrics({
      operationType,
      startTime,
      endTime,
      duration,
      toolCallsExecuted: options.expectedToolCalls || 0,
      streamingEnabled: options.streamingEnabled || false,
      cacheHit: options.cacheHit || false,
      errorOccurred,
      errorType
    });
  }
}

/**
 * Helper function for bulk operations with parallel processing metrics
 */
export async function measureBulkAISDKOperation<T>(
  operationType: string,
  operation: () => Promise<T>,
  bulkOptions: {
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    parallelProcessing: boolean;
    streamingEnabled?: boolean;
    cacheHit?: boolean;
  }
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let errorOccurred = false;
  let errorType: string | undefined;

  try {
    result = await operation();
    return result;
  } catch (error) {
    errorOccurred = true;
    errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    throw error;
  } finally {
    const endTime = Date.now();
    const duration = endTime - startTime;

    aiSDKPerformanceMonitor.recordBulkMetrics({
      operationType,
      startTime,
      endTime,
      duration,
      totalItems: bulkOptions.totalItems,
      successfulItems: bulkOptions.successfulItems,
      failedItems: bulkOptions.failedItems,
      parallelProcessing: bulkOptions.parallelProcessing,
      toolCallsExecuted: 1, // Bulk operations typically use one tool call
      streamingEnabled: bulkOptions.streamingEnabled || false,
      cacheHit: bulkOptions.cacheHit || false,
      errorOccurred,
      errorType
    });
  }
}

/**
 * Performance thresholds for AI SDK v5 operations
 */
export const AI_SDK_PERFORMANCE_THRESHOLDS = {
  maxResponseTime: 5000, // 5 seconds
  maxTokensPerRequest: 4000,
  minCacheHitRate: 0.3, // 30%
  maxErrorRate: 0.1, // 10%
  maxBulkOperationTime: 10000, // 10 seconds for bulk operations
  maxParallelOperations: 10
};

/**
 * Check if performance metrics exceed thresholds
 */
export function checkPerformanceThresholds(): {
  withinThresholds: boolean;
  warnings: string[];
} {
  const stats = aiSDKPerformanceMonitor.getPerformanceStats();
  const warnings: string[] = [];

  if (stats.averageDuration > AI_SDK_PERFORMANCE_THRESHOLDS.maxResponseTime) {
    warnings.push(`Average response time (${stats.averageDuration}ms) exceeds threshold (${AI_SDK_PERFORMANCE_THRESHOLDS.maxResponseTime}ms)`);
  }

  if (stats.averageTokensUsed > AI_SDK_PERFORMANCE_THRESHOLDS.maxTokensPerRequest) {
    warnings.push(`Average tokens used (${stats.averageTokensUsed}) exceeds threshold (${AI_SDK_PERFORMANCE_THRESHOLDS.maxTokensPerRequest})`);
  }

  if (stats.cacheHitRate < AI_SDK_PERFORMANCE_THRESHOLDS.minCacheHitRate) {
    warnings.push(`Cache hit rate (${(stats.cacheHitRate * 100).toFixed(1)}%) below threshold (${AI_SDK_PERFORMANCE_THRESHOLDS.minCacheHitRate * 100}%)`);
  }

  if (stats.errorRate > AI_SDK_PERFORMANCE_THRESHOLDS.maxErrorRate) {
    warnings.push(`Error rate (${(stats.errorRate * 100).toFixed(1)}%) exceeds threshold (${AI_SDK_PERFORMANCE_THRESHOLDS.maxErrorRate * 100}%)`);
  }

  return {
    withinThresholds: warnings.length === 0,
    warnings
  };
}