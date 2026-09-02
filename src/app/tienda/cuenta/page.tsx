'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pedido } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import WhatsAppWidget from '@/components/WhatsAppWidget'
import {
  User, Phone, Mail, MapPin, Building,
  ArrowLeft, ShoppingBag, Clock, CheckCircle2,
  Save, Truck, ShieldCheck, HeartHandshake, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TiendaCuentaPage() {
  const [customerInfo, setCustomerInfo] = useState({
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

  const STORE_PHONE = '59899123456'

  useEffect(() => {
    // Load local customer info
    const saved = localStorage.getItem('guga_store_customer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomerInfo(prev => ({ ...prev, ...parsed }))
        if (parsed.telefono) {
          fetchCustomerOrders(parsed.telefono)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const fetchCustomerOrders = async (phone: string) => {
    if (!phone) return
    setIsLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .or(`cliente_telefono.ilike.%${phone}%,notas.ilike.%${phone}%`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setSavedOrders(data)
      }
    } catch (e) {
      console.error('Error fetching customer orders:', e)
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
        const { data: existing } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefono', customerInfo.telefono.trim())
          .limit(1)

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
            tipo: customerInfo.rut ? 'empresa' : 'regular',
            notas: 'Perfil actualizado desde la Tienda Online'
          }])
        }
      } catch (err) {
        console.warn('Sync clientes non-blocking error:', err)
      }

      fetchCustomerOrders(customerInfo.telefono.trim())
      toast.success('¡Perfil guardado correctamente!')
    } catch (err: any) {
      toast.error('Error al guardar datos: ' + err.message)
    } finally {
      setIsSaving(false)
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#149b8e' }}>
              <User size={20} />
              <h1 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Mi Cuenta</h1>
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
              href="/tienda/pedidos"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1.5px solid #e2e8f0',
                color: '#f97316',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <Truck size={15} />
              <span>Mis Pedidos</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>

          {/* LEFT: PROFILE FORM */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
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
                <User size={24} />
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
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Dirección Habitual de Entrega
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={customerInfo.direccion}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, ciudad"
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
                    RUT
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
                  marginTop: '10px',
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
                <Save size={17} />
                <span>{isSaving ? 'Guardando...' : 'Guardar Datos'}</span>
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
                  <ShoppingBag size={20} color="#f97316" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Tus Pedidos Recientes
                  </h3>
                </div>

                <a
                  href="/tienda/pedidos"
                  style={{ fontSize: '12.5px', color: '#f97316', fontWeight: 700, textDecoration: 'none' }}
                >
                  Ver todos ↗
                </a>
              </div>

              {isLoadingOrders ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  Cargando pedidos...
                </div>
              ) : savedOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {savedOrders.slice(0, 4).map((pd) => {
                    const badge = getStatusBadge(pd.estado || '')
                    return (
                      <div
                        key={pd.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {pd.numero}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {formatCurrency(pd.total)} · {pd.items?.length || 1} ítems
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                          <a
                            href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(`Hola GUGA, consulto por mi pedido ${pd.numero}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
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
                ⭐ Beneficios de Comprar en GUGA
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#149b8e" />
                  <span><strong>Garantía de Calidad:</strong> Impresiones con tintas y papeles certificados.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={18} color="#f59e0b" />
                  <span><strong>Entrega Rápida:</strong> Tiempos de producción ágiles y cumplidos.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HeartHandshake size={18} color="#f97316" />
                  <span><strong>Atención Directa:</strong> Contacto continuo por WhatsApp con nuestro taller.</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* INTERACTIVE WHATSAPP WIDGET */}
      <WhatsAppWidget phone={STORE_PHONE} defaultMessage="Hola GUGA Imprenta, tengo una consulta sobre mi cuenta y pedidos." />
    </div>
  )
}
