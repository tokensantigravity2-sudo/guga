'use client'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicStore = pathname.startsWith('/tienda') || pathname.startsWith('/store')

  if (isPublicStore) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: '#f8fafc',
      }}>
        {children}
      </div>
    )
  }

  return (
    <AuthGate>
      <Sidebar />
      <div style={{
        marginLeft: 230,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-main)',
      }}>
        {children}
      </div>
    </AuthGate>
  )
}

