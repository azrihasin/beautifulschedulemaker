/**
 * Token-based rate limiter for AI API calls to prevent abuse and manage costs
 * Tracks daily token usage per authenticated user
 */

import { createClient } from '@/lib/supabase/server';

interface TokenUsageEntry {
  userId: string;
  date: string; // YYYY-MM-DD format
  tokensUsed: number;
  requestCount: number;
  lastUpdated: number;
}

interface TokenRateLimitConfig {
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  warningThreshold: number; // Percentage (e.g., 0.8 for 80%)
}

interface TokenRateLimitResult {
  allowed: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: number; // Timestamp when limits reset (next day)
  warningTriggered: boolean;
  message?: string;
}

class TokenRateLimiter {
  private config: TokenRateLimitConfig;
  private cache = new Map<string, TokenUsageEntry>();

  constructor(config: TokenRateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private cleanup() {
    const today = this.getTodayString();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.date !== today) {
        this.cache.delete(key);
      }
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getResetTime(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private async getUserIdFromRequest(req: Request): Promise<string | null> {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }
      
      return user.id;
    } catch (error) {
      console.error('Error getting user from request:', error);
      return null;
    }
  }

  private async loadUsageFromDatabase(userId: string, date: string): Promise<TokenUsageEntry | null> {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('user_token_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', date)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading token usage:', error);
        return null;
      }

      if (!data) {
        return {
          userId,
          date,
          tokensUsed: 0,
          requestCount: 0,
          lastUpdated: Date.now()
        };
      }

      return {
        userId,
        date,
        tokensUsed: data.tokens_used || 0,
        requestCount: data.request_count || 0,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error loading usage from database:', error);
      return {
        userId,
        date,
        tokensUsed: 0,
        requestCount: 0,
        lastUpdated: Date.now()
      };
    }
  }

  private async saveUsageToDatabase(entry: TokenUsageEntry): Promise<void> {
    try {
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('user_token_usage')
        .upsert({
          user_id: entry.userId,
          usage_date: entry.date,
          tokens_used: entry.tokensUsed,
          request_count: entry.requestCount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,usage_date'
        });

      if (error) {
        console.error('Error saving token usage:', error);
      }
    } catch (error) {
      console.error('Error saving usage to database:', error);
    }
  }

  private async getOrCreateUsageEntry(userId: string): Promise<TokenUsageEntry> {
    const today = this.getTodayString();
    const cacheKey = `${userId}:${today}`;
    
    let entry = this.cache.get(cacheKey);
    
    if (!entry || entry.date !== today) {
      // Load from database or create new entry
      entry = await this.loadUsageFromDatabase(userId, today);
      if (!entry) {
        entry = {
          userId,
          date: today,
          tokensUsed: 0,
          requestCount: 0,
          lastUpdated: Date.now()
        };
      }
      this.cache.set(cacheKey, entry);
    }
    
    return entry;
  }

  async checkLimit(req: Request, estimatedTokens: number = 0): Promise<TokenRateLimitResult> {
    const userId = await this.getUserIdFromRequest(req);
    
    if (!userId) {
      // For unauthenticated users, fall back to IP-based limiting
      return {
        allowed: false,
        tokensUsed: 0,
        tokensRemaining: 0,
        requestsUsed: 0,
        requestsRemaining: 0,
        resetTime: this.getResetTime(),
        warningTriggered: false,
        message: 'Authentication required for API access'
      };
    }

    const entry = await this.getOrCreateUsageEntry(userId);
    const resetTime = this.getResetTime();
    
    // Check if adding estimated tokens would exceed limits
    const projectedTokens = entry.tokensUsed + estimatedTokens;
    const projectedRequests = entry.requestCount + 1;
    
    const tokensRemaining = Math.max(0, this.config.dailyTokenLimit - entry.tokensUsed);
    const requestsRemaining = Math.max(0, this.config.dailyRequestLimit - entry.requestCount);
    
    // Check limits
    const tokenLimitExceeded = projectedTokens > this.config.dailyTokenLimit;
    const requestLimitExceeded = projectedRequests > this.config.dailyRequestLimit;
    
    // Check warning threshold
    const warningTriggered = (entry.tokensUsed / this.config.dailyTokenLimit) >= this.config.warningThreshold;
    
    let message: string | undefined;
    
    if (tokenLimitExceeded) {
      message = `Daily token limit exceeded. You have used ${entry.tokensUsed}/${this.config.dailyTokenLimit} tokens today. Limit resets at midnight.`;
    } else if (requestLimitExceeded) {
      message = `Daily request limit exceeded. You have made ${entry.requestCount}/${this.config.dailyRequestLimit} requests today. Limit resets at midnight.`;
    } else if (warningTriggered && estimatedTokens > 0) {
      const percentage = Math.round((entry.tokensUsed / this.config.dailyTokenLimit) * 100);
      message = `Warning: You have used ${percentage}% of your daily token limit (${entry.tokensUsed}/${this.config.dailyTokenLimit} tokens).`;
    }
    
    return {
      allowed: !tokenLimitExceeded && !requestLimitExceeded,
      tokensUsed: entry.tokensUsed,
      tokensRemaining,
      requestsUsed: entry.requestCount,
      requestsRemaining,
      resetTime,
      warningTriggered,
      message
    };
  }

  async recordUsage(req: Request, tokensUsed: number): Promise<void> {
    const userId = await this.getUserIdFromRequest(req);
    
    if (!userId) {
      return; // Can't record usage for unauthenticated users
    }

    const entry = await this.getOrCreateUsageEntry(userId);
    
    // Update usage
    entry.tokensUsed += tokensUsed;
    entry.requestCount += 1;
    entry.lastUpdated = Date.now();
    
    // Update cache
    const today = this.getTodayString();
    const cacheKey = `${userId}:${today}`;
    this.cache.set(cacheKey, entry);
    
    // Save to database (async, don't wait)
    this.saveUsageToDatabase(entry).catch(error => {
      console.error('Failed to save token usage to database:', error);
    });
  }

  async getUserUsage(req: Request): Promise<TokenRateLimitResult | null> {
    const userId = await this.getUserIdFromRequest(req);
    
    if (!userId) {
      return null;
    }

    const entry = await this.getOrCreateUsageEntry(userId);
    const resetTime = this.getResetTime();
    
    const tokensRemaining = Math.max(0, this.config.dailyTokenLimit - entry.tokensUsed);
    const requestsRemaining = Math.max(0, this.config.dailyRequestLimit - entry.requestCount);
    const warningTriggered = (entry.tokensUsed / this.config.dailyTokenLimit) >= this.config.warningThreshold;
    
    return {
      allowed: true,
      tokensUsed: entry.tokensUsed,
      tokensRemaining,
      requestsUsed: entry.requestCount,
      requestsRemaining,
      resetTime,
      warningTriggered
    };
  }
}

// Default configuration
const defaultConfig: TokenRateLimitConfig = {
  dailyTokenLimit: 1000000, // 10k tokens per day
  dailyRequestLimit: 1000,  // 100 requests per day
  warningThreshold: 0.8    // Warn at 80% usage
};
// Export singleton instance
export const tokenRateLimiter = new TokenRateLimiter(defaultConfig);

// Export utility functions
export function createTokenLimitResponse(result: TokenRateLimitResult) {
  const resetDate = new Date(result.resetTime);
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: result.message || 'Daily limit exceeded. Please try again tomorrow.',
      details: {
        tokensUsed: result.tokensUsed,
        tokensRemaining: result.tokensRemaining,
        requestsUsed: result.requestsUsed,
        requestsRemaining: result.requestsRemaining,
        resetTime: resetDate.toISOString()
      }
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Tokens-Used': result.tokensUsed.toString(),
        'X-RateLimit-Tokens-Remaining': result.tokensRemaining.toString(),
        'X-RateLimit-Requests-Used': result.requestsUsed.toString(),
        'X-RateLimit-Requests-Remaining': result.requestsRemaining.toString(),
        'X-RateLimit-Reset': resetDate.toISOString()
      }
    }
  );
}

// Export types
export type { TokenRateLimitConfig, TokenRateLimitResult, TokenUsageEntry };
