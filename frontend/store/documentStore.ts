// Document Store

import { create } from 'zustand'
import { Document } from '@/types'

interface DocumentState {
  documents: Document[]
  isUploading: boolean
  uploadProgress: number

  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  setIsUploading: (isUploading: boolean) => void
  setUploadProgress: (progress: number) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  isUploading: false,
  uploadProgress: 0,

  setDocuments: (documents) => set({ documents }),
  addDocument: (document) =>
    set((state) => ({
      documents: [document, ...state.documents],
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    })),
  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}))
