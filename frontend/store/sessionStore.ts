// Session Store

import { create } from 'zustand'
import { Session, Interaction, AiSuggestion, RagContext } from '@/types'

interface SessionState {
  currentSession: Session | null
  sessions: Session[]
  interactions: Interaction[]
  latestSuggestion: AiSuggestion | null
  latestContexts: RagContext[]
  isProcessing: boolean

  setCurrentSession: (session: Session | null) => void
  setSessions: (sessions: Session[]) => void
  addInteraction: (interaction: Interaction) => void
  setInteractions: (interactions: Interaction[]) => void
  setLatestSuggestion: (suggestion: AiSuggestion | null) => void
  setLatestContexts: (contexts: RagContext[]) => void
  setIsProcessing: (isProcessing: boolean) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  sessions: [],
  interactions: [],
  latestSuggestion: null,
  latestContexts: [],
  isProcessing: false,

  setCurrentSession: (session) => set({ currentSession: session }),
  setSessions: (sessions) => set({ sessions }),
  addInteraction: (interaction) =>
    set((state) => ({
      interactions: [interaction, ...state.interactions],
    })),
  setInteractions: (interactions) => set({ interactions }),
  setLatestSuggestion: (suggestion) => set({ latestSuggestion: suggestion }),
  setLatestContexts: (contexts) => set({ latestContexts: contexts }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  clearSession: () =>
    set({
      currentSession: null,
      interactions: [],
      latestSuggestion: null,
      latestContexts: [],
      isProcessing: false,
    }),
}))
