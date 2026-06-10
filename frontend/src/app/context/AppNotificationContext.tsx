import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '../../utils/api'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

interface AppNotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const AppNotificationContext = createContext<AppNotificationContextValue | undefined>(undefined)

const API_BASE = () => getApiUrl('/api/notifications')

export const AppNotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const getToken = () => localStorage.getItem('token')

  const fetchNotifications = useCallback(async () => {
    const token = getToken()
    if (!token) return

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE()}?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setNotifications(
          (data.data.notifications as AppNotification[]).map((n: AppNotification) => ({
            ...n,
            id: (n as unknown as { _id?: string })._id || n.id,
          }))
        )
        setUnreadCount(data.data.unreadCount ?? 0)
      }
    } catch {
      // network error — keep previous state
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_BASE()}/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_BASE()}/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_BASE()}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id)
        if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1))
        return prev.filter((n) => n.id !== id)
      })
    } catch { /* ignore */ }
  }, [])

  // Connect socket and listen for real-time notifications
  useEffect(() => {
    const token = getToken()
    if (!token) return

    fetchNotifications()

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 3,
    })
    socketRef.current = socket

    socket.on('notification:new', (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50))
      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppNotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification }}
    >
      {children}
    </AppNotificationContext.Provider>
  )
}

export const useAppNotifications = () => {
  const ctx = useContext(AppNotificationContext)
  if (!ctx) throw new Error('useAppNotifications must be used within AppNotificationProvider')
  return ctx
}
