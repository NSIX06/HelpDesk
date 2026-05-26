'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Ticket, Clock, CheckCircle2, AlertTriangle, ChevronRight, RefreshCw, Plus, Zap
} from 'lucide-react'
import { statusLabels, statusColors, priorityLabels, priorityColors, formatDate } from '@/lib/utils'
import { Badge } from '@/components/Badge'

interface DashboardData {
  stats: Record<string, number>
  priorityStats: Array<{ priority: string; count: string }>
  recentTickets: any[]
  myAssignedTickets: any[]
}

const STATUS_BAR_COLORS: Record<string, string> = {
  new:         'bg-violet-500',
  in_progress: 'bg-cyan-500',
  pending:     'bg-amber-500',
  resolved:    'bg-emerald-500',
  closed:      'bg-slate-600',
}

function StatCard({ label, value, icon: Icon, gradient, glow }: {
  label: string; value: number; icon: any; gradient: string; glow: string
}) {
  return (
    <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all duration-200">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${gradient} ${glow} shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {value}
        </p>
        <p className="text-sm text-slate-500 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/dashboard')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030712]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-slate-500 text-sm mb-1">Bem-vindo de volta,</p>
          <h1
            className="text-2xl font-bold text-slate-100"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {user?.name?.split(' ')[0]} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] px-3 py-2 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <Link
            href="/tickets/new"
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-glow-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Chamado</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Total" value={stats.total || 0} icon={Ticket}
          gradient="bg-gradient-to-br from-violet-600 to-purple-700" glow="shadow-glow-primary" />
        <StatCard label="Novos" value={stats.new || 0} icon={AlertTriangle}
          gradient="bg-gradient-to-br from-blue-600 to-blue-700" glow="" />
        <StatCard label="Em Andamento" value={stats.in_progress || 0} icon={Clock}
          gradient="bg-gradient-to-br from-cyan-500 to-cyan-700" glow="shadow-glow-secondary" />
        <StatCard label="Resolvidos" value={(stats.resolved || 0) + (stats.closed || 0)} icon={CheckCircle2}
          gradient="bg-gradient-to-br from-emerald-600 to-emerald-700" glow="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-bold text-slate-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Chamados Recentes
            </h2>
            <Link
              href="/tickets"
              className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {!data?.recentTickets?.length && (
              <div className="py-10 text-center text-slate-600 text-sm">Nenhum chamado encontrado</div>
            )}
            {data?.recentTickets?.map((t: any) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                <span className="text-slate-600 text-xs font-mono w-10 shrink-0">#{t.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate group-hover:text-violet-300 transition-colors">
                    {t.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatDate(t.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={priorityLabels[t.priority] || t.priority} className={priorityColors[t.priority]} />
                  <Badge label={statusLabels[t.status] || t.status} className={statusColors[t.status]} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
            <h2 className="font-bold text-slate-100 text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Status
            </h2>
            <div className="space-y-3">
              {Object.entries(statusLabels).map(([key, label]) => {
                const count = stats[key] || 0
                const total = stats.total || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-semibold text-slate-300">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_BAR_COLORS[key] || 'bg-slate-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
            <h2 className="font-bold text-slate-100 text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Por Prioridade
            </h2>
            <div className="space-y-2.5">
              {data?.priorityStats?.map((p: any) => (
                <div key={p.priority} className="flex items-center justify-between">
                  <Badge label={priorityLabels[p.priority] || p.priority} className={priorityColors[p.priority]} />
                  <span className="text-sm font-bold text-slate-300">{p.count}</span>
                </div>
              ))}
              {!data?.priorityStats?.length && (
                <p className="text-sm text-slate-600 text-center py-2">Nenhum chamado aberto</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My assigned tickets */}
      {(data?.myAssignedTickets?.length ?? 0) > 0 && (
        <div className="mt-4 sm:mt-6 bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
            <Zap className="w-4 h-4 text-violet-400" />
            <h2 className="font-bold text-slate-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Atribuídos a Mim
            </h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data?.myAssignedTickets?.map((t: any) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                <span className="text-slate-600 text-xs font-mono w-10 shrink-0">#{t.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate group-hover:text-violet-300 transition-colors">
                    {t.title}
                  </p>
                  <p className="text-xs text-slate-600">{t.requester_name}</p>
                </div>
                <Badge label={statusLabels[t.status] || t.status} className={statusColors[t.status]} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
