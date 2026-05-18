'use client'

import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import { apiService } from '@/services/api'
import { Card, CardContent } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Send, Mic, Square, Loader2 } from 'lucide-react'

export function InputPanel() {
  const { currentSession, setIsProcessing } = useSessionStore()
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const pickMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    if (typeof MediaRecorder !== 'undefined') {
      for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) return type
      }
    }
    return ''
  }

  const handleSendText = async () => {
    if (!inputText.trim() || !currentSession) return

    setIsProcessing(true)
    try {
      await apiService.sendTextInput(currentSession.id, inputText)
      setInputText('')
      // isProcessing is cleared by the AI_SUGGESTION/ERROR websocket handler
      // once the backend finishes the RAG + LLM round-trip.
    } catch (error) {
      console.error('Failed to send input:', error)
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const startRecording = async () => {
    setRecordError(null)
    if (!currentSession) return

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordError('Audio recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stopStream()
        const chunks = audioChunksRef.current
        audioChunksRef.current = []
        if (chunks.length === 0) return

        const blobType = recorder.mimeType || 'audio/webm'
        const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunks, { type: blobType })
        const file = new File([blob], `recording_${Date.now()}.${extension}`, { type: blobType })

        setIsUploadingAudio(true)
        setIsProcessing(true)
        try {
          await apiService.sendAudioInput(currentSession.id, file)
          // Do NOT clear isProcessing here — the real work (Whisper + AI)
          // continues server-side. The dashboard's AI_SUGGESTION / ERROR
          // websocket handlers will clear it once results arrive.
        } catch (error: any) {
          console.error('Audio upload failed:', error)
          setRecordError(error?.response?.data?.error || error?.message || 'Failed to upload audio')
          setIsProcessing(false)
        } finally {
          setIsUploadingAudio(false)
        }
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setRecordError('Recording error occurred.')
        setIsRecording(false)
        stopStream()
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (error: any) {
      console.error('getUserMedia failed:', error)
      const msg =
        error?.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : error?.message || 'Could not access microphone.'
      setRecordError(msg)
      stopStream()
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    setIsRecording(false)
  }

  const handleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      void startRecording()
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={
              isRecording
                ? 'Recording… press stop when done'
                : 'Type your message or record audio...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!currentSession || isRecording || isUploadingAudio}
            className="flex-1"
          />
          <Button
            size="icon"
            variant={isRecording ? 'destructive' : 'outline'}
            onClick={handleRecording}
            disabled={!currentSession || isUploadingAudio}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isUploadingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={handleSendText}
            disabled={!inputText.trim() || !currentSession || isRecording || isUploadingAudio}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
        {recordError && (
          <p className="text-sm text-destructive" role="alert">
            {recordError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
