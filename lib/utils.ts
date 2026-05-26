import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const statusLabels: Record<string, string> = {
  new:         'Novo',
  in_progress: 'Em Andamento',
  pending:     'Pendente',
  resolved:    'Resolvido',
  closed:      'Fechado',
}

// Dark-theme badge colors — translucent pill with ring
export const statusColors: Record<string, string> = {
  new:         'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
  in_progress: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30',
  pending:     'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  resolved:    'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  closed:      'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/40',
}

export const priorityLabels: Record<string, string> = {
  low:      'Baixa',
  medium:   'Média',
  high:     'Alta',
  critical: 'Crítica',
}

export const priorityColors: Record<string, string> = {
  low:      'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  medium:   'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
  high:     'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
  critical: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
}

export const typeLabels: Record<string, string> = {
  incident: 'Incidente',
  request:  'Requisição',
  problem:  'Problema',
  change:   'Mudança',
}

export const roleLabels: Record<string, string> = {
  admin:       'Administrador',
  technician:  'Técnico',
  user:        'Usuário',
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes, unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++ }
  return `${size.toFixed(1)} ${units[unit]}`
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
