'use client'

import React, { useState } from 'react'
import { supabase, isAuthProviderEnabled } from '@/lib/supabase'
import { LOGO_URL } from '@/lib/helpers'
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
  obligatorio?: boolean // para entrar a la tienda: sin botón de cerrar
}

export default function CustomerAuthModal({ isOpen, onClose, onSuccess, obligatorio = false }: CustomerAuthModalProps) {
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

  // Google identifica al cliente; al volver, StoreHeader completa el ingreso
  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      if (!(await isAuthProviderEnabled('google'))) {
        toast.error('El ingreso con Google todavía no está activado. Ingresá con tu teléfono.')
        return
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      })
      if (error) toast.error('No se pudo iniciar sesión con Google: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
        .select('cliente_id, cliente_nombre, notas')
        .or(`notas.ilike.%${cleanDigits || term}%,cliente_nombre.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (matchedOrders && matchedOrders.length > 0) {
        const order = matchedOrders[0]
        const customerProfile = {
          id: order.cliente_id || undefined,
          nombre: order.cliente_nombre || '',
          telefono: term,
          direccion: '',
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
      const notasExtra = [
        formData.empresa.trim() ? `Empresa: ${formData.empresa.trim()}` : '',
        '[Origen: E-commerce Web] Registrado desde la Tienda Online'
      ].filter(Boolean).join(' | ')

      const newClientPayload: any = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        rut: formData.rut.trim() || undefined,
        tipo: 'web',
        notas: notasExtra
      }

      const { data: insertedClient, error } = await supabase
        .from('clientes')
        .insert([newClientPayload])
        .select('id, nombre, telefono, email, direccion, rut')
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
              src={LOGO_URL}
              alt="GUGA Imprenta & Gráfica"
              style={{ height: '46px', maxWidth: '170px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {!obligatorio && <button
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
          </button>}
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

        {/* Ingreso con Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '12px',
            borderRadius: '12px',
            border: '1.5px solid #cbd5e1',
            fontSize: '14px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            {step === 'login' ? 'o con tu teléfono' : 'o completá tus datos'}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {step === 'login' ? (
          /* STEP 1: FAST LOOKUP BY PHONE OR RUT */
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                {obligatorio ? 'Ingresá a la tienda' : 'Identificación de Cliente'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {obligatorio
                  ? 'Para ver productos y precios, ingresá con Google o con tu WhatsApp. Si es tu primera vez, te registramos en un paso.'
                  : 'Ingresá tu WhatsApp, Teléfono o RUT para acceder a tus presupuestos, historial de pedidos y datos guardados.'}
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