'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pedido } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import WhatsAppWidget from '@/components/WhatsAppWidget'
import PresupuestoPDFModal from '@/components/PresupuestoPDFModal'
import CustomerAuthModal from '@/components/CustomerAuthModal'
import StoreHeader from '@/components/StoreHeader'
import {
  User, Phone, Mail, MapPin, Building2,
  ArrowLeft, ShoppingBag, Clock, CheckCircle2,
  Save, Truck, ShieldCheck, HeartHandshake, Eye,
  FileText, RotateCcw, MessageSquare, Sparkles, Receipt,
  LogIn, LogOut, ChevronDown, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function TiendaCuentaPage() {
  const [customerInfo, setCustomerInfo] = useState({
    id: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rut: '',
    empresa: '',
    notas: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [savedOrders, setSavedOrders] = useState<Pedido[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [selectedPdfOrder, setSelectedPdfOrder] = useState<Pedido | null>(null)

  // Auth modal & User menu
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const STORE_PHONE = '59899724454'

  useEffect(() => {
    // Load local customer info
    const saved = localStorage.getItem('guga_store_customer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomerInfo(prev => ({ ...prev, ...parsed }))
        if (parsed.telefono || parsed.nombre) {
          fetchCustomerOrders(parsed.telefono, parsed.nombre)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const fetchCustomerOrders = async (phone?: string, name?: string) => {
    setIsLoadingOrders(true)
    const cleanDigits = (phone || '').replace(/\D/g, '')

    try {
      // Fetch recent orders safely and filter
      const { data: allPeds, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80)

      if (!error && allPeds) {
        const filtered = allPeds.filter(p => {
          const pPhone = (p.cliente_telefono || '').replace(/\D/g, '')
          const pName = (p.cliente_nombre || '').toLowerCase()
          const pNotes = (p.notas || '').toLowerCase()

          const matchPhone = cleanDigits.length >= 4 && pPhone.includes(cleanDigits)
          const matchName = name && name.trim().length >= 3 && pName.includes(name.trim().toLowerCase())
          const matchNotes = cleanDigits.length >= 6 && pNotes.includes(cleanDigits)

          return matchPhone || matchName || matchNotes
        })

        setSavedOrders(filtered)
      }
    } catch (e) {
      console.error('Error fetching customer orders safely:', e)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerInfo.nombre.trim() || !customerInfo.telefono.trim()) {
      toast.error('Por favor ingresá tu nombre y teléfono')
      return
    }

    setIsSaving(true)
    try {
      // 1. Save locally
      localStorage.setItem('guga_store_customer', JSON.stringify(customerInfo))

      // 2. Sync / Upsert to Supabase clientes
      try {
        const cleanDigits = customerInfo.telefono.trim().replace(/\D/g, '')
        let query = supabase.from('clientes').select('id')
        if (cleanDigits.length >= 7) {
          query = query.or(`telefono.ilike.%${cleanDigits}%,telefono.ilike.%${customerInfo.telefono.trim()}%`)
        } else {
          query = query.eq('nombre', customerInfo.nombre.trim())
        }

        const { data: existing } = await query.limit(1)

        if (existing && existing.length > 0) {
          await supabase
            .from('clientes')
            .update({
              nombre: customerInfo.nombre.trim(),
              email: customerInfo.email.trim() || undefined,
              direccion: customerInfo.direccion.trim() || undefined,
              empresa: customerInfo.empresa.trim() || undefined,
              rut: customerInfo.rut.trim() || undefined,
            })
            .eq('id', existing[0].id)
        } else {
          await supabase.from('clientes').insert([{
            nombre: customerInfo.nombre.trim(),
            telefono: customerInfo.telefono.trim(),
            email: customerInfo.email.trim() || undefined,
            direccion: customerInfo.direccion.trim() || undefined,
            empresa: customerInfo.empresa.trim() || undefined,
            rut: customerInfo.rut.trim() || undefined,
            tipo: 'web',
            notas: '[Origen: E-commerce Web] Perfil actualizado desde la Tienda Online'
          }])
        }
      } catch (err) {
        console.warn('Sync clientes non-blocking error:', err)
      }

      fetchCustomerOrders(customerInfo.telefono, customerInfo.nombre)
      toast.success('¡Perfil guardado correctamente!')
    } catch (err: any) {
      toast.error('Error al guardar datos: ' + err.message)
    } finally {
      setIsSaving(false)
    }
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

  const getStatusBadge = (estado?: string) => {
    switch (estado) {
      case 'presupuesto':
        return { label: 'Recibido', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
      case 'aprobado':
        return { label: 'Aprobado', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' }
      case 'en_produccion':
      case 'preparando':
        return { label: 'En Producción', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' }
      case 'terminado':
      case 'listo':
        return { label: 'Listo para Retirar', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' }
      case 'entregado':
        return { label: 'Entregado', color: '#475569', bg: 'rgba(71, 85, 105, 0.10)' }
      default:
        return { label: 'Pendiente', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.10)' }
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif', color: '#0f172a' }}>

      {/* UNIFIED STORE HEADER */}
      <StoreHeader activePage="cuenta" />

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Not Logged In Quick Callout */}
        {!customerInfo.nombre && !customerInfo.telefono && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #149b8e',
            padding: '20px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(20, 155, 142, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(20, 155, 142, 0.12)',
                color: '#149b8e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  ¿Ya compraste o tenés cuenta en GUGA?
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Ingresá con tu WhatsApp o RUT para cargar automáticamente tus pedidos y datos de facturación.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(20, 155, 142, 0.3)'
              }}
            >
              <LogIn size={15} />
              <span>Identificarme con WhatsApp</span>
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', alignItems: 'start' }}>

          {/* LEFT: PROFILE FORM */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <User size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Datos Personales & Facturación
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Guardá tu información para agilizar tus futuros pedidos.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nombre y Apellido *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={customerInfo.nombre}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Teléfono / WhatsApp *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    required
                    value={customerInfo.telefono}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="099 123 456"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Correo Electrónico (opcional)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ejemplo@correo.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Dirección Habitual de Entrega
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={customerInfo.direccion}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, esquina, ciudad"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Empresa / Razón Social
                  </label>
                  <input
                    type="text"
                    value={customerInfo.empresa}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, empresa: e.target.value }))}
                    placeholder="Ej. Mi Negocio SRL"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    RUT / Documento
                  </label>
                  <input
                    type="text"
                    value={customerInfo.rut}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, rut: e.target.value }))}
                    placeholder="21XXXXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 10px rgba(20, 155, 142, 0.3)',
                  transition: 'opacity 0.2s'
                }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Guardando...' : 'Guardar Perfil'}</span>
              </button>
            </form>
          </div>

          {/* RIGHT: RECENT ORDERS & BENEFITS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Orders Summary Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="#149b8e" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Tus Pedidos Recientes
                  </h3>
                </div>

                <Link
                  href="/tienda/pedidos"
                  style={{ fontSize: '12.5px', color: '#149b8e', fontWeight: 700, textDecoration: 'none' }}
                >
                  Ver todos ↗
                </Link>
              </div>

              {isLoadingOrders ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  Cargando pedidos...
                </div>
              ) : savedOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedOrders.slice(0, 5).map((pd) => {
                    const badge = getStatusBadge(pd.estado || '')
                    return (
                      <div
                        key={pd.id}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              {pd.numero}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {formatCurrency(pd.total)} · {pd.items?.length || 1} producto(s)
                            </div>
                          </div>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: badge.color,
                            backgroundColor: badge.bg,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Order Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                          <Link
                            href={`/tienda/pedidos?q=${encodeURIComponent(pd.numero)}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#334155',
                              textDecoration: 'none'
                            }}
                          >
                            <Eye size={13} color="#149b8e" />
                            <span>Seguimiento</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setSelectedPdfOrder(pd)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={13} color="#149b8e" />
                            <span>Ver PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRepetirPedido(pd)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <RotateCcw size={13} color="#149b8e" />
                            <span>Repetir</span>
                          </button>

                          <a
                            href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(`Hola GUGA, consulto por mi pedido ${pd.numero}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: 'auto',
                              backgroundColor: '#25d366',
                              color: 'white',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none'
                            }}
                            title="Consultar por WhatsApp"
                          >
                            <WhatsAppIcon size={14} color="white" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '13px' }}>
                  No tienes pedidos registrados aún. ¡Explora el catálogo y arma tu primer pedido!
                </div>
              )}
            </div>

            {/* Guarantees Box */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Beneficios de Comprar en GUGA
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#149b8e" />
                  <span><strong>Garantía de Calidad:</strong> Impresiones con tintas y papeles certificados.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={18} color="#149b8e" />
                  <span><strong>Entrega Rápida:</strong> Tiempos de producción ágiles y cumplidos.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HeartHandshake size={18} color="#149b8e" />
                  <span><strong>Atención Directa:</strong> Contacto continuo por WhatsApp con nuestro taller.</span>
                </div>
              </div>
            </div>

          </div>

        </div>

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
          if (cust.telefono || cust.nombre) {
            fetchCustomerOrders(cust.telefono, cust.nombre)
          }
        }}
      />

      {/* INTERACTIVE WHATSAPP WIDGET */}
      <WhatsAppWidget phone={STORE_PHONE} defaultMessage="Hola GUGA Imprenta, tengo una consulta sobre mi cuenta y pedidos." />
    </div>
  )
}
