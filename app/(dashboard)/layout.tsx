import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* pt-14 on mobile = space for fixed top bar; lg:pt-0 = desktop has no top bar */}
      <main className="flex-1 pt-14 lg:pt-0 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
