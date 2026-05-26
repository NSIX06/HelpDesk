'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Ticket, Users, Building2, Tag,
  LogOut, ChevronRight, UserCircle, Menu, X, Zap
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets',   label: 'Chamados',   icon: Ticket },
]

const adminItems = [
  { href: '/users',       label: 'Usuários',       icon: Users },
  { href: '/departments', label: 'Departamentos',  icon: Building2 },
  { href: '/categories',  label: 'Categorias',     icon: Tag },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdmin = user?.role === 'admin'
  const isTech = user?.role === 'technician'
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-glow-primary shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-white font-bold text-lg leading-none"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            HelpDesk
          </span>
          <p className="text-slate-500 text-xs mt-0.5">Central de Chamados</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="text-slate-600 text-[10px] font-bold uppercase px-3 mb-2 tracking-widest">
          Menu
        </p>
        {navItems.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {(isAdmin || isTech) && (
          <>
            <p className="text-slate-600 text-[10px] font-bold uppercase px-3 mt-5 mb-2 tracking-widest">
              Administração
            </p>
            {adminItems.map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white text-sm font-bold shrink-0">
            {user?.name ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>

        <div className="mt-1 space-y-0.5">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] rounded-xl text-sm transition-all"
          >
            <UserCircle className="w-4 h-4" /> Meu Perfil
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#030712] border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            HelpDesk
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#030712] min-h-screen fixed left-0 top-0 z-30 border-r border-white/[0.06]">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col',
          'bg-[#030712] border-r border-white/[0.06]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

function NavLink({ item, pathname }: { item: { href: string; label: string; icon: any }; pathname: string }) {
  const Icon = item.icon
  const active = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
        active
          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-primary'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
      )}
    >
      <Icon className={cn('w-4.5 h-4.5 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
    </Link>
  )
}
