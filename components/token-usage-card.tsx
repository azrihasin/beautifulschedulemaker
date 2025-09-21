"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Clock, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenUsageData {
  tokensUsed: number;
  tokensRemaining: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: number;
  warningTriggered: boolean;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  usagePercentage: number;
}

interface TokenUsageCardProps {
  className?: string;
}

export function TokenUsageCard({ className }: TokenUsageCardProps) {
  const [usage, setUsage] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokenUsage();
  }, []);

  const fetchTokenUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/token-usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch token usage');
      }
      
      const data = await response.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatResetTime = (timestamp: number) => {
    const resetDate = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours <= 0) {
      return 'Resets soon';
    } else if (diffHours === 1) {
      return 'Resets in 1 hour';
    } else {
      return `Resets in ${diffHours} hours`;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Card className={cn('w-80', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-80', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Token Usage
          </CardTitle>
          {usage.warningTriggered && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warning
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Daily usage limits and statistics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Token Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Tokens</span>
            </div>
            <span className={cn('font-mono text-xs', getUsageColor(usage.usagePercentage))}>
              {usage.tokensUsed.toLocaleString()} / {usage.dailyTokenLimit.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={usage.usagePercentage} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usage.usagePercentage}% used</span>
            <span>{usage.tokensRemaining.toLocaleString()} remaining</span>
          </div>
        </div>

        <Separator />

        {/* Request Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Requests</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {usage.requestsUsed} / {usage.dailyRequestLimit}
            </span>
          </div>
          <Progress 
            value={(usage.requestsUsed / usage.dailyRequestLimit) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round((usage.requestsUsed / usage.dailyRequestLimit) * 100)}% used</span>
            <span>{usage.requestsRemaining} remaining</span>
          </div>
        </div>

        <Separator />

        {/* Reset Time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Limits reset</span>
          </div>
          <span className="font-medium">
            {formatResetTime(usage.resetTime)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}