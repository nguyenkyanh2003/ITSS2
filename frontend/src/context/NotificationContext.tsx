import React, { createContext, useContext, useState, ReactNode } from 'react'

type NotificationType = 'info' | 'success' | 'error'

interface Notification {
  title: string
  message: string
  type: NotificationType
}

interface NotificationContextValue {
  showNotification: (title: string, message: string, type?: NotificationType) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px',
  maxWidth: '480px',
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 8,
}

const messageStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 16,
  color: '#333',
}

const closeBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [visible, setVisible] = useState(false)

  const showNotification = (title: string, message: string, type: NotificationType = 'info') => {
    setNotification({ title, message, type })
    setVisible(true)
  }

  const close = () => {
    setVisible(false)
    // clear after short delay to allow any exit animation if added
    setTimeout(() => setNotification(null), 150)
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {visible && notification && (
        <div style={overlayStyle} role="dialog" aria-modal="true" onClick={close}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={titleStyle}>{notification.title}</h3>
            <p style={messageStyle}>{notification.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={closeBtnStyle} onClick={close} aria-label="Close notification">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}

export default NotificationContext
