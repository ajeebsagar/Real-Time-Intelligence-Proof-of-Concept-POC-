'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSessionStore } from '@/store/sessionStore'
import { useDocumentStore } from '@/store/documentStore'
import { apiService } from '@/services/api'
import { wsService, SocketEvents } from '@/services/websocket'
import { Header } from '@/components/dashboard/Header'
import { TranscriptStream } from '@/components/transcript/TranscriptStream'
import { SuggestionsPanel } from '@/components/suggestions/SuggestionsPanel'
import { ContextPanel } from '@/components/suggestions/ContextPanel'
import { DocumentUpload } from '@/components/uploads/DocumentUpload'
import { InputPanel } from '@/components/dashboard/InputPanel'
import { Button } from '@/components/shared/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const {
    currentSession,
    setCurrentSession,
    addInteraction,
    setLatestSuggestion,
    setLatestContexts,
    setIsProcessing,
  } = useSessionStore()
  const { setDocuments } = useDocumentStore()
  const [loading, setLoading] = useState(true)

  // Auth guard — wait for store hydration before deciding.
  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  // One-time initialization (docs + WS listeners).
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user) return

    let cancelled = false

    const onTranscript = (data: any) => {
      // Append the partial transcript as a "live" interaction at the head.
      if (data?.text) {
        addInteraction({
          id: `transcript_${Date.now()}`,
          sessionId: currentSession?.id ?? '',
          userId: user.id,
          type: 'audio',
          inputText: data.text,
          timestamp: data.timestamp ?? new Date().toISOString(),
        } as any)
      }
    }
    const onSuggestion = (data: any) => {
      setLatestSuggestion(data)
      setIsProcessing(false)
    }
    const onContexts = (data: any) => setLatestContexts(data?.contexts ?? [])
    const onInteractionSaved = (data: any) => {
      if (data?.interactionId) {
        // Best-effort: refresh history so the persisted entry replaces transient state.
        const sid = currentSession?.id
        if (sid) {
          apiService.getInteractionHistory(sid, 50).then((res) => {
            if (cancelled || !res?.success) return
            useSessionStore.getState().setInteractions(res.data || [])
          }).catch(() => {})
        }
      }
    }
    const onError = (data: any) => {
      console.error('WS error:', data)
      setIsProcessing(false)
    }
    const onDocumentStatus = (data: any) => {
      if (data?.documentId && data?.status) {
        useDocumentStore
          .getState()
          .updateDocument(data.documentId, { status: data.status } as any)
      }
    }

    wsService.on(SocketEvents.TRANSCRIPT_CHUNK, onTranscript)
    wsService.on(SocketEvents.AI_SUGGESTION, onSuggestion)
    wsService.on(SocketEvents.RAG_CONTEXT, onContexts)
    wsService.on(SocketEvents.INTERACTION_SAVED, onInteractionSaved)
    wsService.on(SocketEvents.DOCUMENT_STATUS, onDocumentStatus)
    wsService.on(SocketEvents.ERROR, onError)

    // Connect WebSocket (idempotent — internal guard handles reconnect/auth update).
    wsService.connect(user.id, currentSession?.id)

    apiService
      .getDocuments()
      .then((res) => {
        if (cancelled) return
        if (res.success) setDocuments(res.data || [])
      })
      .catch((err) => console.error('Failed to load documents:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      wsService.off(SocketEvents.TRANSCRIPT_CHUNK, onTranscript)
      wsService.off(SocketEvents.AI_SUGGESTION, onSuggestion)
      wsService.off(SocketEvents.RAG_CONTEXT, onContexts)
      wsService.off(SocketEvents.INTERACTION_SAVED, onInteractionSaved)
      wsService.off(SocketEvents.DOCUMENT_STATUS, onDocumentStatus)
      wsService.off(SocketEvents.ERROR, onError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, user?.id])

  // Re-authenticate the socket whenever the active session changes.
  useEffect(() => {
    if (!user?.id) return
    wsService.connect(user.id, currentSession?.id)
    // Load history for the new session.
    if (currentSession?.id) {
      apiService
        .getInteractionHistory(currentSession.id, 50)
        .then((res) => {
          if (res?.success) {
            useSessionStore.getState().setInteractions(res.data || [])
          }
        })
        .catch(() => {})
    }
  }, [currentSession?.id, user?.id])

  const handleCreateSession = async () => {
    try {
      const response = await apiService.createSession(
        `Session ${new Date().toLocaleString()}`
      )
      if (response.success && response.data) {
        setCurrentSession(response.data)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  if (!hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1800px] mx-auto px-4 py-4">
        {!currentSession ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Welcome to Real-Time Intelligence Co-pilot</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Start a new session to begin receiving AI-powered insights during your
                consultations.
              </p>
              <Button onClick={handleCreateSession} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Start New Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-100px)]">
            {/* Left Column - Transcript + Input */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
              <div className="flex-1 min-h-0">
                <TranscriptStream />
              </div>
              <div className="flex-shrink-0">
                <InputPanel />
              </div>
            </div>

            {/* Middle Column - AI Suggestions */}
            <div className="col-span-12 lg:col-span-4 min-h-0">
              <SuggestionsPanel />
            </div>

            {/* Right Column - Context & Documents */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
              <div className="flex-1 min-h-0">
                <ContextPanel />
              </div>
              <div className="flex-1 min-h-0">
                <DocumentUpload />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
