'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pedido } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import {
  Truck, Search, ArrowLeft, Package, Clock,
  CheckCircle2, MapPin, Phone, X,
  ShoppingCart, User, FileText, RotateCcw,
  Layers, Check, Eye, HelpCircle, MessageSquare,
  LogIn, LogOut, ChevronDown
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import WhatsAppWidget from '@/components/WhatsAppWidget'
import PresupuestoPDFModal from '@/components/PresupuestoPDFModal'
import CustomerAuthModal from '@/components/CustomerAuthModal'
import StoreHeader from '@/components/StoreHeader'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function TiendaPedidosPage() {
  const [trackQuery, setTrackQuery] = useState('')
  const [trackedOrders, setTrackedOrders] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedPdfOrder, setSelectedPdfOrder] = useState<Pedido | null>(null)

  // Auth Modal & User state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    id: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rut: '',
    empresa: ''
  })

  const STORE_PHONE = '59899724454'

  useEffect(() => {
    // Check URL parameters for direct tracking (e.g. ?q=ECO-12345)
    let initialQuery = ''
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const qParam = urlParams.get('q') || urlParams.get('numero') || urlParams.get('phone') || urlParams.get('telefono')
      if (qParam) {
        initialQuery = qParam.trim()
        setTrackQuery(initialQuery)
        fetchOrders(initialQuery)
      }
    }

    // Auto-load customer info if saved
    const saved = localStorage.getItem('guga_store_customer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomerInfo(prev => ({ ...prev, ...parsed }))
        if (!initialQuery && parsed.telefono) {
          initialQuery = parsed.telefono.trim()
          setTrackQuery(initialQuery)
          fetchOrders(initialQuery)
        }
      } catch (e) {
        console.error(e)
      }
    }

    // Fallback: auto-load recent local orders
    if (!initialQuery) {
      const localOrders = localStorage.getItem('guga_my_orders')
      if (localOrders) {
        try {
          const parsed = JSON.parse(localOrders)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].numero) {
            initialQuery = parsed[0].numero
            setTrackQuery(initialQuery)
            fetchOrders(initialQuery)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const fetchOrders = async (queryStr: string) => {
    if (!queryStr.trim()) return
    setIsLoading(true)
    setHasSearched(true)
    const q = queryStr.trim()
    const cleanDigits = q.replace(/\D/g, '')
    const qUpper = q.toUpperCase().replace('#', '').trim()

    try {
      // 1. If searching by Order Code (e.g. ECO-12345 or P-123)
      if (qUpper.startsWith('ECO-') || qUpper.startsWith('P-')) {
        const { data: directOrders, error: dirErr } = await supabase
          .from('pedidos')
          .select('*')
          .ilike('numero', `%${qUpper}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (!dirErr && directOrders && directOrders.length > 0) {
          setTrackedOrders(directOrders)
          setIsLoading(false)
          return
        }
      }

      // 2. Fetch recent orders and filter safely in JavaScript to avoid PostgREST query parsing crashes
      const { data: allPeds, error: pedsErr } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (pedsErr) {
        console.warn('Orders fetch notice:', pedsErr)
      }

      if (allPeds) {
        const qLower = q.toLowerCase()
        const filtered = allPeds.filter(p => {
          const pNum = (p.numero || '').toLowerCase()
          const pName = (p.cliente_nombre || '').toLowerCase()
          const pPhone = (p.cliente_telefono || '').replace(/\D/g, '')
          const pNotes = (p.notas || '').toLowerCase()

          const matchNum = pNum.includes(qLower)
          const matchName = pName.includes(qLower)
          const matchPhone = cleanDigits.length >= 4 && pPhone.includes(cleanDigits)
          const matchNotes = pNotes.includes(qLower) || (cleanDigits.length >= 6 && pNotes.includes(cleanDigits))

          return matchNum || matchName || matchPhone || matchNotes
        })

        setTrackedOrders(filtered)
      }
    } catch (err: any) {
      console.error('Safe order tracking handler:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrders(trackQuery)
  }

  const handleRepetirPedido = (pedido: Pedido) => {
    try {
      if (!pedido.items || pedido.items.length === 0) {
        toast.error('Este pedido no contiene productos')
        return
      }

      const itemsToAdd = pedido.items.map((it: any, idx: number) => {
        const unitPrice = Number(it.precio_unitario || it.precio || it.precio_base || 0)
        const qty = Number(it.cantidad || 1)
        const subtotal = Number(it.subtotal || unitPrice * qty)

        return {
          servicio: {
            id: it.servicio_id || it.producto_id || it.id || `reorder_${pedido.id}_${idx}`,
            nombre: it.nombre || 'Producto',
            precio: unitPrice,
            precio_base: unitPrice,
            categoria: it.categoria || 'Imprenta',
            imagen_url: it.imagen_url || '',
            unidad: it.unidad || 'unidad',
            disponible: true
          },
          cantidad: qty,
          subtotal: subtotal
        }
      })

      localStorage.setItem('guga_store_cart', JSON.stringify(itemsToAdd))
      localStorage.setItem('guga_cart_items', JSON.stringify(itemsToAdd))
      toast.success(`¡${itemsToAdd.length} producto(s) agregados al carrito!`)
      window.location.href = '/tienda?openCart=true'
    } catch (e) {
      console.error('Error reordering:', e)
      toast.error('No se pudo reordenar el pedido')
    }
  }

  const getStatusInfo = (estado?: string) => {
    switch (estado) {
      case 'presupuesto':
        return { label: 'Recibido', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', step: 1, desc: 'Solicitud registrada en nuestro sistema' }
      case 'aprobado':
        return { label: 'Aprobado', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', step: 2, desc: 'Diseño verificado y orden confirmada' }
      case 'en_produccion':
      case 'preparando':
        return { label: 'En Producción', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', step: 3, desc: 'En proceso de impresión y armado en taller' }
      case 'terminado':
      case 'listo':
        return { label: 'Listo para Entrega', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', step: 4, desc: 'Listo para retirar en taller o en ruta de envío' }
      case 'entregado':
        return { label: 'Entregado', color: '#475569', bg: 'rgba(71, 85, 105, 0.10)', step: 5, desc: '¡Pedido entregado con éxito!' }
      default:
        return { label: 'Pendiente', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.10)', step: 1, desc: 'En revisión por el equipo de GUGA' }
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif', color: '#0f172a' }}>

      {/* UNIFIED STORE HEADER */}
      <StoreHeader activePage="pedidos" />

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: '850px', margin: '0 auto', padding: '32px 20px' }}>

        {/* HERO SECTION */}
        <div style={{
          textAlign: 'center',
          marginBottom: '28px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: '0 4px 14px rgba(20, 155, 142, 0.25)',
            color: 'white'
          }}>
            <Package size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Seguimiento de Pedidos
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '460px', margin: '0 auto' }}>
            Consultá el estado en tiempo real de tus pedidos ingresando tu teléfono, nombre o número de orden.
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
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
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
              background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 26px',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(20, 155, 142, 0.30)',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            <Search size={15} />
            <span>{isLoading ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {/* RESULTS */}
        {trackedOrders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                {trackedOrders.length} pedido{trackedOrders.length > 1 ? 's' : ''} encontrado{trackedOrders.length > 1 ? 's' : ''}
              </span>
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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
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
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#fafbfc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: status.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: status.color
                      }}>
                        <Package size={20} />
                      </div>

                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          Pedido #{pd.numero}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          <span>{formatDate(pd.created_at || '')}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: status.color,
                        backgroundColor: status.bg,
                        padding: '4px 10px',
                        borderRadius: '999px'
                      }}>
                        {status.label}
                      </span>

                      <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                        {formatCurrency(pd.total)}
                      </span>
                    </div>
                  </div>

                  {/* 5-Step Progress Bar Pipeline */}
                  <div style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '8px' }}>
                      {[
                        { name: 'Recibido', icon: FileText },
                        { name: 'Aprobado', icon: CheckCircle2 },
                        { name: 'Producción', icon: Layers },
                        { name: 'Listo', icon: Package },
                        { name: 'Entregado', icon: Check }
                      ].map((step, i) => {
                        const stepNum = i + 1
                        const isDone = stepNum <= status.step
                        const isCurrent = stepNum === status.step
                        const StepIcon = step.icon

                        return (
                          <div key={step.name} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: isDone ? '#149b8e' : '#f1f5f9',
                              color: isDone ? '#ffffff' : '#94a3b8',
                              border: isCurrent ? '2px solid #149b8e' : '1px solid #cbd5e1',
                              boxShadow: isCurrent ? '0 0 0 3px rgba(20,155,142,0.18)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.2s'
                            }}>
                              <StepIcon size={12} />
                            </div>
                            {i < 4 && (
                              <div style={{
                                flex: 1,
                                height: '3px',
                                backgroundColor: stepNum < status.step ? '#149b8e' : '#e2e8f0',
                                transition: 'all 0.2s'
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {['Recibido', 'Aprobado', 'En Taller', 'Listo', 'Entregado'].map((step, i) => (
                        <span key={step} style={{
                          fontSize: '11px',
                          color: (i + 1) <= status.step ? '#149b8e' : '#94a3b8',
                          fontWeight: (i + 1) <= status.step ? 700 : 500,
                          textAlign: 'center',
                          width: '20%'
                        }}>
                          {step}
                        </span>
                      ))}
                    </div>

                    <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>
                      {status.desc}
                    </p>
                  </div>

                  {/* Order Details & Items */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <Phone size={14} color="#149b8e" />
                        <span>{pd.cliente_telefono || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <MapPin size={14} color="#149b8e" />
                        <span>{pd.cliente_direccion || 'Retiro en Taller'}</span>
                      </div>
                    </div>

                    {/* Items Breakdown */}
                    {pd.items && pd.items.length > 0 && (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '14px'
                      }}>
                        {pd.items.map((it: any, idx: number) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            fontSize: '13px',
                            color: '#334155',
                            borderBottom: idx < pd.items.length - 1 ? '1px solid #e2e8f0' : 'none'
                          }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{it.nombre}</span>
                              <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '6px' }}>x{it.cantidad}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatCurrency(it.subtotal || (it.precio_unitario || it.precio || 0) * it.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPdfOrder(pd)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={14} color="#149b8e" />
                        <span>Ver Presupuesto PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRepetirPedido(pd)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={14} color="#149b8e" />
                        <span>Volver a Pedir</span>
                      </button>

                      <a
                        href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(`Hola GUGA, consulto por el estado de mi pedido #${pd.numero}. Gracias!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#25d366',
                          color: 'white',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
                        }}
                      >
                        <WhatsAppIcon size={16} color="white" />
                        <span>Consultar por WhatsApp</span>
                      </a>
                    </div>
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
            <Package size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              No encontramos pedidos registrados
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Probá verificando el número de teléfono o código de pedido.
            </p>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px dashed #cbd5e1'
          }}>
            <Truck size={44} style={{ color: '#149b8e', margin: '0 auto 12px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Consultá el estado de tus pedidos
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Ingresá tu teléfono o código de pedido para ver la etapa de producción y entrega.
            </p>
          </div>
        )}

      </main>

      {/* PDF Modal */}
      {selectedPdfOrder && (
        <PresupuestoPDFModal
          pedido={selectedPdfOrder}
          onClose={() => setSelectedPdfOrder(null)}
        />
      )}

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(cust) => {
          setCustomerInfo(cust)
          if (cust.telefono) {
            setTrackQuery(cust.telefono)
            fetchOrders(cust.telefono)
          }
        }}
      />

      {/* INTERACTIVE WHATSAPP WIDGET */}
      <WhatsAppWidget phone={STORE_PHONE} defaultMessage="Hola GUGA Imprenta, tengo una consulta sobre el estado de un pedido." />
    </div>
  )
}
