/**
 * Response caching for common course parsing patterns to improve performance
 */

interface CacheEntry {
  response: any;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest() {
    if (this.cache.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private generateKey(input: string): string {
    // Normalize input for consistent caching
    const normalized = input
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove special characters
    
    // Create hash-like key (simple implementation)
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `cache_${Math.abs(hash)}`;
  }

  get(input: string): any | null {
    const key = this.generateKey(input);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.response;
  }

  set(input: string, response: any, ttl?: number): void {
    const key = this.generateKey(input);
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      response: JSON.parse(JSON.stringify(response)), // Deep clone
      timestamp: now,
      ttl: entryTtl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }
}

import { config } from './production-config';

// Create cache instance for course parsing responses
export const courseParsingCache = new ResponseCache({
  maxSize: config.cache.maxSize,
  defaultTtl: config.cache.defaultTtl,
});

// Common course parsing patterns that benefit from caching
export const CACHEABLE_PATTERNS = [
  /add\s+[a-z]{2,4}\s*\d{3,4}/i, // Course code patterns
  /\d{1,2}:\d{2}\s*(am|pm)/i, // Time patterns
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, // Day patterns
  /(mon|tue|wed|thu|fri|sat|sun)/i, // Day abbreviations
];

export function isCacheable(input: string): boolean {
  return CACHEABLE_PATTERNS.some(pattern => pattern.test(input));
}

export function getCacheKey(input: string): string {
  // Extract key components for consistent caching
  const courseCodeMatch = input.match(/([a-z]{2,4}\s*\d{3,4})/i);
  const timeMatch = input.match(/(\d{1,2}:\d{2}\s*(am|pm)?)/i);
  const dayMatch = input.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i);
  
  const components = [
    courseCodeMatch?.[1]?.toLowerCase().replace(/\s+/g, ''),
    timeMatch?.[1]?.toLowerCase(),
    dayMatch?.[1]?.toLowerCase()
  ].filter(Boolean);
  
  return components.join('_');
}