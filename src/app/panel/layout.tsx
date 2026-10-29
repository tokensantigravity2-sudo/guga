import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'GUGA · CRM Imprenta',
  description: 'Sistema de gestión para GUGA Imprenta — Pedidos, Stock, Clientes y más.',
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
