import { useEffect, useRef, useState } from 'react'
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react'
import { useAppNotifications, AppNotification } from '../context/AppNotificationContext'
import { useLanguage } from '../context/LanguageContext'

const TYPE_ICON: Record<string, string> = {
  new_message: '💬',
  order_created: '🛍️',
  order_time_proposed: '📅',
  order_time_confirmed: '✅',
  order_completed: '🎉',
  order_cancelled: '❌',
  report_resolved: '🔔',
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useAppNotifications()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60_000) return t.notifJustNow
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} ${t.notifMinAgo}`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ${t.notifHourAgo}`
    return new Date(iso).toLocaleDateString(t.notifDateLocale)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (n: AppNotification) => {
    if (!n.isRead) markAsRead(n.id)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex flex-col items-center gap-0.5 text-white hover:text-yellow-200 transition-colors"
        aria-label={t.notificationsBell}
      >
        <div className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-yellow-400 text-[10px] font-bold text-gray-900 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] hidden sm:block">{t.notificationsBell}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold text-gray-900 text-sm">{t.notificationsBell}</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  title={t.notificationsMarkAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.notificationsMarkAllRead}</span>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                {t.notificationsEmpty}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-gray-900 truncate ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors mt-1"
                    title={t.notificationsDeleteTitle}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
