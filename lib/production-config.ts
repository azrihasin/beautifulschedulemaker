/**
 * Production configuration for performance optimizations
 */

export interface ProductionConfig {
  rateLimit: {
    maxRequests: number;
    windowMs: number;
    enabled: boolean;
  };
  cache: {
    maxSize: number;
    defaultTtl: number;
    enabled: boolean;
  };
  chat: {
    maxMessages: number;
    compressionThreshold: number;
    virtualScrollThreshold: number;
    inputThrottleMs: number;
    streamingBufferMs: number;
  };
  performance: {
    monitoring: boolean;
    maxMetrics: number;
    reportingInterval: number;
  };
  ai: {
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
}

const developmentConfig: ProductionConfig = {
  rateLimit: {
    maxRequests: 100, // More lenient for development
    windowMs: 15 * 60 * 1000, // 15 minutes
    enabled: false // Disabled in development
  },
  cache: {
    maxSize: 50, // Smaller cache for development
    defaultTtl: 10 * 60 * 1000, // 10 minutes
    enabled: true
  },
  chat: {
    maxMessages: 100, // Keep more messages in development
    compressionThreshold: 50,
    virtualScrollThreshold: 200,
    inputThrottleMs: 500, // Shorter throttle for development
    streamingBufferMs: 100
  },
  performance: {
    monitoring: true, // Enable for debugging
    maxMetrics: 500,
    reportingInterval: 60000 // 1 minute
  },
  ai: {
    maxTokens: 3000, // Higher limit for development
    temperature: 0.1,
    timeout: 60000 // 60 seconds
  }
};

const productionConfig: ProductionConfig = {
  rateLimit: {
    maxRequests: 30, // Stricter rate limiting
    windowMs: 15 * 60 * 1000, // 15 minutes
    enabled: true
  },
  cache: {
    maxSize: 200, // Larger cache for production
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    enabled: true
  },
  chat: {
    maxMessages: 30, // Optimize memory usage
    compressionThreshold: 15,
    virtualScrollThreshold: 50,
    inputThrottleMs: 1500, // Prevent spam
    streamingBufferMs: 50
  },
  performance: {
    monitoring: true,
    maxMetrics: 1000,
    reportingInterval: 5 * 60 * 1000 // 5 minutes
  },
  ai: {
    maxTokens: 2000, // Optimize costs
    temperature: 0.1,
    timeout: 30000 // 30 seconds
  }
};

const testConfig: ProductionConfig = {
  rateLimit: {
    maxRequests: 1000, // Very lenient for testing
    windowMs: 60 * 1000, // 1 minute
    enabled: false
  },
  cache: {
    maxSize: 10, // Small cache for testing
    defaultTtl: 1000, // 1 second for quick expiry tests
    enabled: true
  },
  chat: {
    maxMessages: 10,
    compressionThreshold: 5,
    virtualScrollThreshold: 20,
    inputThrottleMs: 100,
    streamingBufferMs: 10
  },
  performance: {
    monitoring: false, // Disabled for cleaner test output
    maxMetrics: 100,
    reportingInterval: 1000
  },
  ai: {
    maxTokens: 1000,
    temperature: 0,
    timeout: 5000
  }
};

function getEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

export function getProductionConfig(): ProductionConfig {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    default:
      return developmentConfig;
  }
}

// Environment-specific feature flags
export const featureFlags = {
  enableRateLimit: getProductionConfig().rateLimit.enabled,
  enableCache: getProductionConfig().cache.enabled,
  enablePerformanceMonitoring: getProductionConfig().performance.monitoring,
  enableVirtualScrolling: true,
  enableInputThrottling: true,
  enableStreamingOptimization: true,
  enableErrorRetry: true,
  enableConnectionStatus: true
};

// Performance thresholds for alerts/warnings
export const performanceThresholds = {
  maxResponseTime: 5000, // 5 seconds
  maxCacheSize: 500,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  minCacheHitRate: 0.3, // 30%
  maxErrorRate: 0.1 // 10%
};

// Export current config
export const config = getProductionConfig();