'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card'
import { Badge } from '@/components/shared/Badge'
import { formatDate } from '@/lib/utils'
import { MessageSquare, Mic } from 'lucide-react'

export function TranscriptStream() {
  const { interactions } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [interactions])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Live Transcript
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-4 pr-2"
        >
          {interactions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No interactions yet. Start by typing or recording audio.</p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-slide-up"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={interaction.type === 'audio' ? 'secondary' : 'default'}>
                    {interaction.type === 'audio' ? (
                      <Mic className="h-3 w-3 mr-1" />
                    ) : (
                      <MessageSquare className="h-3 w-3 mr-1" />
                    )}
                    {interaction.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(interaction.timestamp)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{interaction.inputText}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
