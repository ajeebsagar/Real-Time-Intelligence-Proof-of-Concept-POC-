'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useSessionStore } from '@/store/sessionStore'
import { useDocumentStore } from '@/store/documentStore'
import { Button } from '@/components/shared/Button'
import { Badge } from '@/components/shared/Badge'
import { wsService } from '@/services/websocket'
import { apiService } from '@/services/api'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { currentSession, clearSession } = useSessionStore()
  const setDocuments = useDocumentStore((s) => s.setDocuments)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    return wsService.onConnectionChange(setIsConnected)
  }, [])

  const handleLogout = () => {
    apiService.logout()
    wsService.disconnect()
    clearSession()
    setDocuments([])
    logout()
    router.replace('/login')
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold gradient-text">
              Real-Time Intelligence Co-pilot
            </h1>
            {currentSession && (
              <Badge variant="secondary" className="text-xs">
                {currentSession.title}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 pulse-ring' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
