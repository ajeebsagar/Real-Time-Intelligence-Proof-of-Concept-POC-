'use client'

import { useSessionStore } from '@/store/sessionStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card'
import { Badge } from '@/components/shared/Badge'
import { FileText, TrendingUp } from 'lucide-react'

export function ContextPanel() {
  const { latestContexts } = useSessionStore()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Retrieved Context
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-3 pr-2">
          {latestContexts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-center">
                Relevant document context will appear here.
              </p>
            </div>
          ) : (
            latestContexts.map((context: any, index: number) => {
              const content = context.content ?? context.chunkContent ?? ''
              const score = context.score ?? context.relevanceScore ?? 0
              const key =
                context.id ??
                (context.metadata
                  ? `${context.metadata.documentId}_${context.metadata.chunkIndex}`
                  : `ctx_${index}`)
              return (
                <div
                  key={key}
                  className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors animate-slide-up"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      Context {index + 1}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {(score * 100).toFixed(1)}% relevant
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
                    {content}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
