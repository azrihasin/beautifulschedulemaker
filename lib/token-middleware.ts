/**
 * Middleware for token-based rate limiting in API routes
 * Provides easy integration with existing API endpoints
 */

import { tokenRateLimiter, createTokenLimitResponse, type TokenRateLimitResult } from './token-rate-limiter';

interface TokenMiddlewareOptions {
  estimatedTokens?: number;
  skipLimitCheck?: boolean;
  onWarning?: (result: TokenRateLimitResult) => void;
}

interface TokenMiddlewareResult {
  allowed: boolean;
  response?: Response;
  usage: TokenRateLimitResult;
  recordUsage: (actualTokens: number) => Promise<void>;
}

/**
 * Middleware function to check token limits before processing API requests
 * 
 * @param req - The incoming request
 * @param options - Configuration options for the middleware
 * @returns Promise<TokenMiddlewareResult> - Result indicating if request should proceed
 * 
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   const tokenCheck = await withTokenLimit(req, { estimatedTokens: 500 });
 *   
 *   if (!tokenCheck.allowed) {
 *     return tokenCheck.response!;
 *   }
 *   
 *   // Process the request...
 *   const actualTokens = await processAIRequest();
 *   
 *   // Record actual usage
 *   await tokenCheck.recordUsage(actualTokens);
 *   
 *   return new Response(result);
 * }
 * ```
 */
export async function withTokenLimit(
  req: Request, 
  options: TokenMiddlewareOptions = {}
): Promise<TokenMiddlewareResult> {
  const { estimatedTokens = 0, skipLimitCheck = false, onWarning } = options;
  
  // Check current usage and limits
  const usage = await tokenRateLimiter.checkLimit(req, estimatedTokens);
  
  // Handle warning threshold
  if (usage.warningTriggered && onWarning) {
    onWarning(usage);
  }
  
  // Skip limit check if requested (useful for admin endpoints)
  if (skipLimitCheck) {
    return {
      allowed: true,
      usage,
      recordUsage: async (actualTokens: number) => {
        await tokenRateLimiter.recordUsage(req, actualTokens);
      }
    };
  }
  
  // Check if request is allowed
  if (!usage.allowed) {
    return {
      allowed: false,
      response: createTokenLimitResponse(usage),
      usage,
      recordUsage: async () => {} // No-op for rejected requests
    };
  }
  
  return {
    allowed: true,
    usage,
    recordUsage: async (actualTokens: number) => {
      await tokenRateLimiter.recordUsage(req, actualTokens);
    }
  };
}

/**
 * Higher-order function that wraps an API handler with token limiting
 * 
 * @param handler - The original API handler function
 * @param options - Token middleware options
 * @returns Wrapped handler with token limiting
 * 
 * @example
 * ```typescript
 * const originalHandler = async (req: Request) => {
 *   // Your API logic here
 *   return new Response('Success');
 * };
 * 
 * export const POST = withTokenLimitWrapper(originalHandler, {
 *   estimatedTokens: 1000
 * });
 * ```
 */
export function withTokenLimitWrapper(
  handler: (req: Request, usage: TokenRateLimitResult) => Promise<Response>,
  options: TokenMiddlewareOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    const tokenCheck = await withTokenLimit(req, options);
    
    if (!tokenCheck.allowed) {
      return tokenCheck.response!;
    }
    
    try {
      // Call the original handler with usage info
      const response = await handler(req, tokenCheck.usage);
      
      // Try to extract token usage from response headers or estimate
      const actualTokens = extractTokenUsageFromResponse(response) || options.estimatedTokens || 0;
      
      // Record actual usage
      if (actualTokens > 0) {
        await tokenCheck.recordUsage(actualTokens);
      }
      
      // Add usage headers to response
      return addUsageHeaders(response, tokenCheck.usage);
    } catch (error) {
      console.error('Error in token-limited handler:', error);
      throw error;
    }
  };
}

/**
 * Extract token usage from AI SDK response headers or metadata
 */
function extractTokenUsageFromResponse(response: Response): number | null {
  // Check for common AI SDK token usage headers
  const tokenHeader = response.headers.get('x-ai-tokens-used') || 
                     response.headers.get('x-tokens-consumed');
  
  if (tokenHeader) {
    const tokens = parseInt(tokenHeader, 10);
    return isNaN(tokens) ? null : tokens;
  }
  
  return null;
}

/**
 * Add rate limit usage headers to response
 */
function addUsageHeaders(response: Response, usage: TokenRateLimitResult): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Tokens-Used', usage.tokensUsed.toString());
  headers.set('X-RateLimit-Tokens-Remaining', usage.tokensRemaining.toString());
  headers.set('X-RateLimit-Requests-Used', usage.requestsUsed.toString());
  headers.set('X-RateLimit-Requests-Remaining', usage.requestsRemaining.toString());
  headers.set('X-RateLimit-Reset', new Date(usage.resetTime).toISOString());
  
  if (usage.warningTriggered) {
    headers.set('X-RateLimit-Warning', 'true');
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Utility function to get current user usage without checking limits
 * Useful for dashboard/status endpoints
 */
export async function getUserTokenUsage(req: Request): Promise<TokenRateLimitResult | null> {
  return await tokenRateLimiter.getUserUsage(req);
}

/**
 * Utility function to manually record token usage
 * Useful when you need to record usage outside of the middleware
 */
export async function recordTokenUsage(req: Request, tokens: number): Promise<void> {
  await tokenRateLimiter.recordUsage(req, tokens);
}

// Export types
export type { TokenMiddlewareOptions, TokenMiddlewareResult };