'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pedido } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import {
  Truck, Search, ArrowLeft, Package, Clock,
  CheckCircle2, MapPin, Phone, X,
  ShoppingCart, User
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import WhatsAppWidget from '@/components/WhatsAppWidget'

export default function TiendaPedidosPage() {
  const [trackQuery, setTrackQuery] = useState('')
  const [trackedOrders, setTrackedOrders] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ nombre: '', telefono: '' })

  const STORE_PHONE = '59899123456'

  useEffect(() => {
    const saved = localStorage.getItem('guga_store_customer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomerInfo(parsed)
        if (parsed.telefono) {
          setTrackQuery(parsed.telefono)
        }
      } catch (e) {
        console.error(e)
      }
    }

    // Auto-load recent local orders
    const localOrders = localStorage.getItem('guga_my_orders')
    if (localOrders) {
      try {
        const parsed = JSON.parse(localOrders)
        if (parsed.length > 0 && parsed[0].numero) {
          // Auto-search with first order number
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!trackQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    const q = trackQuery.trim()

    try {
      let query = supabase.from('pedidos').select('*')
      if (q.toUpperCase().startsWith('ECO-') || q.toUpperCase().startsWith('P-')) {
        query = query.eq('numero', q.toUpperCase())
      } else {
        query = query.or(`cliente_telefono.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
      }

      const { data, error } = await query
        .eq('origen', 'ecommerce')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTrackedOrders(data || [])
    } catch (err: any) {
      console.error('Error tracking orders:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusInfo = (estado?: string) => {
    switch (estado) {
      case 'presupuesto':
        return { label: 'Recibido', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', icon: '📋', step: 1 }
      case 'aprobado':
        return { label: 'Aprobado', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.10)', icon: '✅', step: 2 }
      case 'en_produccion':
      case 'preparando':
        return { label: 'En Producción', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.10)', icon: '🖨️', step: 3 }
      case 'terminado':
      case 'listo':
        return { label: 'Listo para Entrega', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.10)', icon: '📦', step: 4 }
      case 'entregado':
        return { label: 'Entregado', color: '#475569', bg: 'rgba(71, 85, 105, 0.08)', icon: '🏠', step: 5 }
      default:
        return { label: 'Pendiente', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.10)', icon: '⏳', step: 0 }
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-UY', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch { return dateStr }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/tienda" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <img src="/logo.png" alt="GUGA Imprenta" style={{ maxHeight: '40px', objectFit: 'contain' }} />
            </a>

            <div style={{ height: '28px', width: '1px', backgroundColor: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316' }}>
              <Truck size={20} />
              <h1 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Mis Pedidos</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/tienda"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(20, 155, 142, 0.25)'
              }}
            >
              <ArrowLeft size={15} />
              <span>Volver a la Tienda</span>
            </a>

            <a
              href="/tienda/cuenta"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1.5px solid #e2e8f0',
                color: '#475569',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <User size={15} />
              <span>Mi Cuenta</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        {/* HERO SECTION */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 4px 16px rgba(249, 115, 22, 0.25)'
          }}>
            <Package size={32} color="white" />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Seguimiento de Pedidos
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
            Consultá el estado de tus pedidos ingresando tu teléfono, nombre o número de orden.
          </p>
        </div>

        {/* SEARCH BOX */}
        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '28px',
            backgroundColor: '#ffffff',
            padding: '6px',
            borderRadius: '999px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} />
            <input
              type="text"
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              placeholder="Teléfono, nombre o Nº de pedido (ECO-...)"
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: 500,
                outline: 'none',
                color: '#0f172a'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.30)',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            <Search size={16} />
            <span>{isLoading ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {/* RESULTS */}
        {trackedOrders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
              {trackedOrders.length} pedido{trackedOrders.length > 1 ? 's' : ''} encontrado{trackedOrders.length > 1 ? 's' : ''}
            </div>

            {trackedOrders.map((pd) => {
              const status = getStatusInfo(pd.estado || '')

              return (
                <div
                  key={pd.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  {/* Order Header */}
                  <div style={{
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{status.icon}</span>

                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          {pd.numero}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {formatDate(pd.created_at || '')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: status.color,
                        backgroundColor: status.bg,
                        padding: '5px 12px',
                        borderRadius: '999px',
                        letterSpacing: '0.02em'
                      }}>
                        {status.label}
                      </span>

                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                        {formatCurrency(pd.total)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar (visual pipeline) */}
                  <div style={{ padding: '16px 20px', backgroundColor: '#fafbfc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '6px' }}>
                      {['Recibido', 'Aprobado', 'En Producción', 'Listo', 'Entregado'].map((step, i) => {
                        const isActive = i < status.step
                        const isCurrent = i === status.step - 1
                        return (
                          <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#149b8e' : isCurrent ? '#f59e0b' : '#e2e8f0',
                              border: isCurrent ? '2px solid #f59e0b' : 'none',
                              boxShadow: isCurrent ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
                              flexShrink: 0,
                              transition: 'all 0.3s'
                            }} />
                            {i < 4 && (
                              <div style={{
                                flex: 1,
                                height: '3px',
                                backgroundColor: isActive ? '#149b8e' : '#e2e8f0',
                                transition: 'all 0.3s'
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {['Recibido', 'Aprobado', 'Producción', 'Listo', 'Entregado'].map((step, i) => (
                        <span key={step} style={{
                          fontSize: '10px',
                          color: i < status.step ? '#149b8e' : '#94a3b8',
                          fontWeight: i < status.step ? 700 : 500,
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <Phone size={14} color="#149b8e" />
                        <span>{pd.cliente_telefono || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <MapPin size={14} color="#f97316" />
                        <span>{pd.cliente_direccion || 'Retiro en Local'}</span>
                      </div>
                    </div>

                    {/* Items */}
                    {pd.items && pd.items.length > 0 && (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '12px',
                        border: '1px solid #f1f5f9'
                      }}>
                        {pd.items.map((it: any, idx: number) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '4px 0',
                            fontSize: '13px',
                            color: '#334155',
                            borderBottom: idx < pd.items.length - 1 ? '1px solid #f1f5f9' : 'none'
                          }}>
                            <span>• {it.nombre} <span style={{ color: '#94a3b8' }}>x{it.cantidad}</span></span>
                            <span style={{ fontWeight: 700 }}>{formatCurrency(it.subtotal || it.precio_unitario * it.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* WhatsApp Inquiry Button */}
                    <a
                      href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(`Hola GUGA, consulto por el estado de mi pedido ${pd.numero}. Gracias!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '14px',
                        backgroundColor: '#25d366',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
                      }}
                    >
                      <WhatsAppIcon size={18} color="white" />
                      <span>Consultar por WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        ) : hasSearched ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <Package size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              No encontramos pedidos
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '16px' }}>
              Probá con otro teléfono, nombre o número de pedido.
            </p>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1'
          }}>
            <Truck size={48} style={{ color: '#f97316', margin: '0 auto 12px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Buscá tus pedidos
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Ingresá tu teléfono, nombre o número de pedido para ver el estado en tiempo real.
            </p>
          </div>
        )}

      </main>

      {/* INTERACTIVE WHATSAPP WIDGET */}
      <WhatsAppWidget phone={STORE_PHONE} defaultMessage="Hola GUGA Imprenta, tengo una consulta sobre el estado de un pedido." />
    </div>
  )
}
