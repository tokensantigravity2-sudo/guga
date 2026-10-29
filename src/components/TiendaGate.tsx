'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LOGO_URL } from '@/lib/helpers'
import CustomerAuthModal from '@/components/CustomerAuthModal'

const leerCliente = () => {
  try {
    const c = JSON.parse(localStorage.getItem('guga_store_customer') || 'null')
    return c && (c.nombre || c.telefono || c.email) ? c : null
  } catch {
    return null
  }
}

// La tienda solo se ve después de identificarse (Google o teléfono)
export default function TiendaGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<'cargando' | 'fuera' | 'dentro'>('cargando')

  useEffect(() => {
    const revisar = () => setEstado(leerCliente() ? 'dentro' : 'fuera')
    revisar()
    window.addEventListener('storage', revisar)

    // Al volver de Google queda una sesión de Supabase: se usa solo para identificar al cliente
    // y guardar su perfil, igual que el ingreso por teléfono
    let procesando = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (!user?.email || procesando) return
      procesando = true
      const email = user.email.toLowerCase()
      const nombreGoogle = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

      // Supabase no permite llamar a su cliente dentro de este callback: diferir
      setTimeout(async () => {
        await supabase.auth.signOut({ scope: 'local' })
        const { data: matched } = await supabase
          .from('clientes')
          .select('*')
          .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
          .limit(1)
        const client = matched?.[0]
        localStorage.setItem('guga_store_customer', JSON.stringify({
          id: client?.id,
          nombre: client?.nombre || nombreGoogle,
          telefono: client?.telefono || '',
          email,
          direccion: client?.direccion || '',
          rut: client?.rut || '',
          empresa: '',
        }))
        window.dispatchEvent(new Event('storage'))
      }, 0)
    })

    return () => {
      window.removeEventListener('storage', revisar)
      subscription.unsubscribe()
    }
  }, [])

  if (estado === 'cargando') return null
  if (estado === 'dentro') return <>{children}</>

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      padding: '24px',
      background: 'radial-gradient(circle at 80% 10%, rgba(20,155,142,0.18), transparent 45%), radial-gradient(circle at 10% 90%, rgba(249,115,22,0.15), transparent 45%), #f8fafc'
    }}>
      <img src={LOGO_URL} alt="GUGA Print" style={{ height: '64px', width: 'auto' }} />
      <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Tienda online</p>
      <CustomerAuthModal
        isOpen
        obligatorio
        onClose={() => {}}
        onSuccess={() => setEstado('dentro')}
      />
    </div>
  )
}
