'use client'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'

export default function AppShell({ children }: { children: React.ReactNode }) {
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
