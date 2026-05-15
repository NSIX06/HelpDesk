'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Ticket, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: number
  type: string
  title: string
  message: string | null
  read: boolean
  created_at: string
  ticket_id: number | null
  ticket_title: string | null
}

const typeColors: Record<string, string> = {
  new_comment: 'bg-blue-500',
  status_changed: 'bg-green-500',
  assigned: 'bg-purple-500',
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?count=true')
      if (res.ok) {
        const data = await res.json()
        setCount(data.count || 0)
      }
    } catch {}
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    loadCount()
    const interval = setInterval(loadCount, 30000)
    return () => clearInterval(interval)
  }, [loadCount])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen(o => !o)
    if (!open) {
      await loadNotifications()
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleNotificationClick(n: Notification) {
    // Mark as read
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [n.id] }),
    })
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    setCount(prev => Math.max(0, prev - (n.read ? 0 : 1)))

    if (n.ticket_id) {
      setOpen(false)
      router.push(`/tickets/${n.ticket_id}`)
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">
              Notificações
              {count > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {count}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar tudo
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma notificação
              </div>
            )}
            {!loading && notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition border-b border-gray-50',
                  !n.read && 'bg-blue-50/40'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5',
                  typeColors[n.type] || 'bg-gray-400',
                  'text-white'
                )}>
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', n.read ? 'text-gray-600' : 'text-gray-900 font-medium')}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">{formatDate(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
