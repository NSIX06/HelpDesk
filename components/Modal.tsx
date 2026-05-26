'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Panel */}
        <div className={cn(
          'relative w-full rounded-2xl shadow-2xl',
          'bg-slate-900 border border-white/[0.08]',
          'ring-1 ring-violet-500/10',
          sizeClass
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Body */}
          <div className="p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
