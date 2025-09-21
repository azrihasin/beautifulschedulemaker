import { NextRequest, NextResponse } from 'next/server';
import { getUserTokenUsage } from '@/lib/token-middleware';

export async function GET(req: NextRequest) {
  try {
    const usage = await getUserTokenUsage(req);
    
    if (!usage) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      tokensUsed: usage.tokensUsed,
      tokensRemaining: usage.tokensRemaining,
      requestsUsed: usage.requestsUsed,
      requestsRemaining: usage.requestsRemaining,
      resetTime: usage.resetTime,
      warningTriggered: usage.warningTriggered,
      dailyTokenLimit: usage.tokensUsed + usage.tokensRemaining,
      dailyRequestLimit: usage.requestsUsed + usage.requestsRemaining,
      usagePercentage: Math.round((usage.tokensUsed / (usage.tokensUsed + usage.tokensRemaining)) * 100)
    });
  } catch (error) {
    console.error('Token usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}