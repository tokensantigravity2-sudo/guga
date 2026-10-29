import type { Metadata } from 'next'
import TiendaGate from '@/components/TiendaGate'

export const metadata: Metadata = {
  title: 'GUGA Print · Tienda online',
  description: 'Tienda online de GUGA Print: tarjetas, folletos, talonarios, stickers, banners y más.',
}

export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      <TiendaGate>{children}</TiendaGate>
    </div>
  )
}
