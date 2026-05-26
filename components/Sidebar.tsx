'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Ticket, Users, Building2, Tag,
  LogOut, ChevronRight, UserCircle, Menu, X
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Chamados', icon: Ticket },
]

const adminItems = [
  { href: '/users', label: 'Usuários', icon: Users },
  { href: '/departments', label: 'Departamentos', icon: Building2 },
  { href: '/categories', label: 'Categorias', icon: Tag },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdmin = user?.role === 'admin'
  const isTech = user?.role === 'technician'
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg shrink-0">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-lg leading-none">HelpDesk</span>
          <p className="text-gray-400 text-xs mt-0.5">Central de Chamados</p>
        </div>
        {/* Close button — only on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-gray-500 text-xs font-semibold uppercase px-3 mb-2 tracking-wider">
          Menu
        </p>
        {navItems.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {(isAdmin || isTech) && (
          <>
            <p className="text-gray-500 text-xs font-semibold uppercase px-3 mt-5 mb-2 tracking-wider">
              Administração
            </p>
            {adminItems.map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-full text-white text-sm font-semibold shrink-0">
            {user?.name ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>

        <div className="mt-1 space-y-0.5">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition"
          >
            <UserCircle className="w-4 h-4" />
            Meu Perfil
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">HelpDesk</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Desktop sidebar (always visible) ──────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 min-h-screen fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar (drawer) ────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-gray-900 z-50 flex flex-col transition-transform duration-300 ease-in-out',
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
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition group',
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
    </Link>
  )
}
