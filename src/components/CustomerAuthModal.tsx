'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  User, Phone, Mail, MapPin, Building2,
  X, CheckCircle2, ArrowRight, Sparkles,
  ShieldCheck, LogIn, UserPlus, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CustomerAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (customer: any) => void
}

export default function CustomerAuthModal({ isOpen, onClose, onSuccess }: CustomerAuthModalProps) {
  const [step, setStep] = useState<'login' | 'register'>('login')
  const [searchKey, setSearchKey] = useState('')
  const [loading, setLoading] = useState(false)

  // Registration Form State
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rut: '',
    empresa: ''
  })

  if (!isOpen) return null

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const term = searchKey.trim()
    if (!term) {
      toast.error('Ingresá tu teléfono, WhatsApp o RUT')
      return
    }

    setLoading(true)
    const cleanDigits = term.replace(/\D/g, '')

    try {
      // 1. Search in clientes table by phone or rut or email
      let query = supabase.from('clientes').select('*')

      if (cleanDigits.length >= 7) {
        query = query.or(`telefono.ilike.%${cleanDigits}%,telefono.ilike.%${term}%,rut.ilike.%${cleanDigits}%`)
      } else if (term.includes('@')) {
        query = query.eq('email', term.toLowerCase())
      } else {
        query = query.or(`rut.ilike.%${term}%,nombre.ilike.%${term}%,telefono.ilike.%${term}%`)
      }

      const { data: matchedClients, error } = await query.limit(5)

      if (error) {
        console.warn('Customer search error:', error)
      }

      if (matchedClients && matchedClients.length > 0) {
        const client = matchedClients[0]
        const customerProfile = {
          id: client.id,
          nombre: client.nombre,
          telefono: client.telefono || term,
          email: client.email || '',
          direccion: client.direccion || '',
          rut: client.rut || '',
          empresa: client.empresa || '',
        }

        // Save to localStorage
        localStorage.setItem('guga_store_customer', JSON.stringify(customerProfile))
        toast.success(`¡Bienvenido de nuevo, ${client.nombre}!`)
        onSuccess(customerProfile)
        onClose()
        return
      }

      // If not found in clientes table, check pedidos table for previous web orders
      const { data: matchedOrders } = await supabase
        .from('pedidos')
        .select('cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, notas')
        .or(`cliente_telefono.ilike.%${cleanDigits || term}%,notas.ilike.%${cleanDigits || term}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (matchedOrders && matchedOrders.length > 0) {
        const order = matchedOrders[0]
        const customerProfile = {
          id: order.cliente_id || undefined,
          nombre: order.cliente_nombre || '',
          telefono: order.cliente_telefono || term,
          direccion: order.cliente_direccion || '',
          email: '',
          rut: '',
          empresa: ''
        }

        localStorage.setItem('guga_store_customer', JSON.stringify(customerProfile))
        toast.success(`¡Bienvenido de nuevo, ${order.cliente_nombre}!`)
        onSuccess(customerProfile)
        onClose()
        return
      }

      // If not found anywhere, switch to registration step with prefilled data
      if (cleanDigits.length >= 7) {
        setFormData(prev => ({ ...prev, telefono: term }))
      } else if (term.includes('@')) {
        setFormData(prev => ({ ...prev, email: term }))
      } else {
        setFormData(prev => ({ ...prev, nombre: term }))
      }

      setStep('register')
      toast('No encontramos una cuenta con ese dato. ¡Completá tus datos para registrarte!', {
        icon: '👋'
      })
    } catch (err: any) {
      console.error('Error during customer lookup:', err)
      toast.error('Error al verificar cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }

    setLoading(true)
    try {
      // 1. Insert into Supabase clientes table
      const newClientPayload: any = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        empresa: formData.empresa.trim() || undefined,
        rut: formData.rut.trim() || undefined,
        tipo: 'web',
        notas: '[Origen: E-commerce Web] Registrado desde la Tienda Online'
      }

      const { data: insertedClient, error } = await supabase
        .from('clientes')
        .insert([newClientPayload])
        .select('id, nombre, telefono, email, direccion, rut, empresa')
        .single()

      if (error) {
        console.warn('Direct client insert notice:', error)
      }

      const customerProfile = {
        id: insertedClient?.id || undefined,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim(),
        direccion: formData.direccion.trim(),
        rut: formData.rut.trim(),
        empresa: formData.empresa.trim()
      }

      // Save to localStorage
      localStorage.setItem('guga_store_customer', JSON.stringify(customerProfile))
      toast.success('¡Cuenta creada y conectada con éxito!')
      onSuccess(customerProfile)
      onClose()
    } catch (err: any) {
      console.error('Error registering customer:', err)
      toast.error('Error al registrar cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        padding: '32px'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo-guga.png"
              alt="GUGA Imprenta"
              style={{ maxHeight: '36px', maxWidth: '130px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png'
              }}
            />
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setStep('login')}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: step === 'login' ? '#ffffff' : 'transparent',
              color: step === 'login' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: step === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <LogIn size={15} color={step === 'login' ? '#149b8e' : '#64748b'} />
            <span>Ingresar</span>
          </button>

          <button
            type="button"
            onClick={() => setStep('register')}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: step === 'register' ? '#ffffff' : 'transparent',
              color: step === 'register' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: step === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={15} color={step === 'register' ? '#149b8e' : '#64748b'} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {step === 'login' ? (
          /* STEP 1: FAST LOOKUP BY PHONE OR RUT */
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Identificación de Cliente
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Ingresá tu WhatsApp, Teléfono o RUT para acceder a tus presupuestos, historial de pedidos y datos guardados.
              </p>
            </div>

            <form onSubmit={handleLookup}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  WhatsApp, Teléfono o RUT
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={17} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder="Ej. 099 123 456 o 21XXXXXXXXXX"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                  color: '#ffffff',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(20, 155, 142, 0.3)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <span>{loading ? 'Verificando...' : 'Continuar'}</span>
                <ArrowRight size={17} />
              </button>
            </form>

            <div style={{
              marginTop: '22px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <ShieldCheck size={20} color="#149b8e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                <strong style={{ color: '#334155' }}>¿Es tu primera vez en GUGA?</strong>
                <br />
                Podés ingresar tu teléfono para que creemos tu cuenta automáticamente o hacer clic en <strong>Crear Cuenta</strong> arriba.
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: REGISTER FORM */
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Crear Perfil de Cliente
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Guardá tus datos para agilizar futuros pedidos y facturación.
              </p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nombre y Apellido *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  WhatsApp / Teléfono *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="099 123 456"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
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
                  <Mail size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ejemplo@correo.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
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
                  <MapPin size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, esquina, ciudad"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Empresa (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                    placeholder="Mi Negocio SRL"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    RUT (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.rut}
                    onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                    placeholder="21XXXXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(20, 155, 142, 0.3)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <span>{loading ? 'Creando cuenta...' : 'Crear mi Cuenta'}</span>
                <CheckCircle2 size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}