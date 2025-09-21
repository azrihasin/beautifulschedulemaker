"use client"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Settings,
  XCircle,
  Play,
  RefreshCw,
} from "lucide-react"
import { useState, useCallback } from "react"

export type ToolPart = {
  type: string
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
  onExecute?: (toolName: string, args: Record<string, unknown>) => Promise<void>
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
}

const Tool = ({ toolPart, defaultOpen = false, className }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)

  const { state, input, output, toolCallId, onExecute } = toolPart

  const handleExecute = useCallback(async () => {
    if (!input || !onExecute) return
    
    setIsExecuting(true)
    setExecutionError(null)
    
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName: toolPart.type,
          args: input
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Tool execution failed')
      }
      
      setExecutionResult(result)
      await onExecute(toolPart.type, input)
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsExecuting(false)
    }
  }, [input, onExecute, toolPart.type])

  const displayOutput = executionResult || output
  const displayError = executionError || (state === 'output-error' ? toolPart.errorText : null)
  const isLoading = isExecuting || state === 'input-streaming'

  const getStateIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    
    if (displayError) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    
    if (displayOutput) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    
    switch (state) {
      case "input-streaming":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "input-available":
        return <Settings className="h-4 w-4 text-orange-500" />
      case "output-available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "output-error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Settings className="text-muted-foreground h-4 w-4" />
    }
  }

  const getStateBadge = () => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    
    if (isLoading) {
      return (
        <span
          className={cn(
            baseClasses,
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          )}
        >
          Processing
        </span>
      )
    }
    
    if (displayError) {
      return (
        <span
          className={cn(
            baseClasses,
            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}
        >
          Error
        </span>
      )
    }
    
    if (displayOutput) {
      return (
        <span
          className={cn(
            baseClasses,
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}
        >
          Completed
        </span>
      )
    }
    
    switch (state) {
      case "input-streaming":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            Processing
          </span>
        )
      case "input-available":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            )}
          >
            Ready
          </span>
        )
      case "output-available":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            )}
          >
            Completed
          </span>
        )
      case "output-error":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            Error
          </span>
        )
      default:
        return (
          <span
            className={cn(
              baseClasses,
              "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            )}
          >
            Pending
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "string") return value
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div
      className={cn(
        "border-border mt-3 overflow-hidden rounded-lg border shadow-sm bg-card",
        isLoading && "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
        displayError && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
        displayOutput && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-transparent h-auto w-full flex items-center justify-between rounded-b-none px-3 py-2 font-normal">
          <div className="flex items-center gap-2">
            {getStateIcon()}
            <span className="font-mono text-sm font-medium">
              {toolPart.type}
            </span>
            {getStateBadge()}
          </div>
          <div className="flex items-center gap-2">
            {input && !displayOutput && !isLoading && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExecute()
                }}
                disabled={isExecuting}
                className="h-6 px-2 text-xs"
              >
                {isExecuting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Run
              </Button>
            )}
            {displayError && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setExecutionError(null)
                  setExecutionResult(null)
                }}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent
          className={cn(
            "border-border border-t",
            "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden"
          )}
        >
          <div className="bg-background space-y-3 p-3">
            {input && Object.keys(input).length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Input
                </h4>
                <div className="bg-muted/30 rounded border p-2 font-mono text-sm">
                  {Object.entries(input).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span>{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayOutput && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Output
                </h4>
                <div className="bg-muted/30 max-h-60 overflow-auto rounded border p-2 font-mono text-sm">
                  <pre className="whitespace-pre-wrap">
                    {formatValue(displayOutput)}
                  </pre>
                </div>
              </div>
            )}

            {displayError && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-red-500">Error</h4>
                <div className="bg-red-50 rounded border border-red-200 p-2 text-sm dark:border-red-950 dark:bg-red-900/20">
                  {displayError}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing tool call...
              </div>
            )}

            {toolCallId && (
              <div className="text-muted-foreground border-t border-blue-200 pt-2 text-xs">
                <span className="font-mono">Call ID: {toolCallId}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { Tool }
