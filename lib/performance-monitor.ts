/**
 * Performance monitoring utilities for production optimization
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  // Record a performance metric
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Record API response time
  recordApiResponseTime(endpoint: string, duration: number, success: boolean) {
    this.recordMetric('api_response_time', duration, {
      endpoint,
      success,
      type: 'api_call'
    });
  }

  // Record cache hit/miss
  recordCacheEvent(hit: boolean, key?: string) {
    this.recordMetric('cache_event', hit ? 1 : 0, {
      hit,
      key,
      type: 'cache'
    });
  }

  // Record user interaction
  recordUserInteraction(action: string, duration?: number) {
    this.recordMetric('user_interaction', duration || 0, {
      action,
      type: 'user'
    });
  }

  // Get performance report
  getReport(timeWindow?: number): PerformanceReport {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    
    // Calculate summary statistics
    const apiMetrics = relevantMetrics.filter(m => m.name === 'api_response_time');
    const cacheMetrics = relevantMetrics.filter(m => m.name === 'cache_event');
    
    const averageResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;
    
    const totalRequests = apiMetrics.length;
    const errorCount = apiMetrics.filter(m => !m.metadata?.success).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    
    const cacheHits = cacheMetrics.filter(m => m.value === 1).length;
    const cacheHitRate = cacheMetrics.length > 0 ? cacheHits / cacheMetrics.length : 0;

    return {
      metrics: relevantMetrics,
      summary: {
        averageResponseTime,
        totalRequests,
        errorRate,
        cacheHitRate
      }
    };
  }

  // Clear old metrics
  clearOldMetrics(olderThan: number = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - olderThan;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Get real-time performance stats
  getRealTimeStats() {
    const lastMinute = 60 * 1000;
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - m.timestamp <= lastMinute
    );

    const apiCalls = recentMetrics.filter(m => m.name === 'api_response_time');
    const avgResponseTime = apiCalls.length > 0
      ? apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length
      : 0;

    return {
      requestsPerMinute: apiCalls.length,
      averageResponseTime: avgResponseTime,
      activeUsers: new Set(recentMetrics.map(m => m.metadata?.userId)).size,
      timestamp: Date.now()
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance measurement decorator
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  metricName: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = performance.now() - start;
            performanceMonitor.recordMetric(metricName, duration, { success: true });
            return value;
          })
          .catch((error) => {
            const duration = performance.now() - start;
            performanceMonitor.recordMetric(metricName, duration, { success: false, error: error.message });
            throw error;
          });
      } else {
        const duration = performance.now() - start;
        performanceMonitor.recordMetric(metricName, duration, { success: true });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(metricName, duration, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }) as T;
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const recordInteraction = (action: string) => {
    performanceMonitor.recordUserInteraction(action);
  };

  const measureAsync = async <T>(
    operation: () => Promise<T>,
    metricName: string
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(metricName, duration, { success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(metricName, duration, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  };

  return {
    recordInteraction,
    measureAsync,
    getStats: () => performanceMonitor.getRealTimeStats()
  };
}

// Browser performance API integration
export function recordWebVitals() {
  if (typeof window === 'undefined') return;

  // Record Core Web Vitals
  if ('web-vital' in window) {
    // This would integrate with web-vitals library if available
    // For now, we'll use basic performance API
  }

  // Record basic performance metrics
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      performanceMonitor.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
      performanceMonitor.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      performanceMonitor.recordMetric('first_paint', navigation.responseEnd - navigation.fetchStart);
    }
  });

  // Record resource loading times
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        performanceMonitor.recordMetric('resource_load_time', resourceEntry.duration, {
          resource: resourceEntry.name,
          type: 'resource'
        });
      }
    }
  });

  observer.observe({ entryTypes: ['resource'] });
}