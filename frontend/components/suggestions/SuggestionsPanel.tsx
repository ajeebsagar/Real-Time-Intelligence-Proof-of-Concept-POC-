'use client'

import { useSessionStore } from '@/store/sessionStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card'
import { Badge } from '@/components/shared/Badge'
import { Sparkles, TrendingUp } from 'lucide-react'

export function SuggestionsPanel() {
  const { latestSuggestion, isProcessing } = useSessionStore()

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isProcessing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Generating AI suggestion...
              </p>
            </div>
          </div>
        ) : latestSuggestion ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {latestSuggestion.model}
              </Badge>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {(latestSuggestion.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getConfidenceColor(
                  latestSuggestion.confidence
                )}`}
                style={{ width: `${latestSuggestion.confidence * 100}%` }}
              />
            </div>

            {/* Suggestion Content */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {latestSuggestion.content}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">
              AI suggestions will appear here after processing your input.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
