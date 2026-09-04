'use client'

import React, { useState, useEffect } from 'react'
import {
  Search, ShoppingCart, Truck, User, X,
  ChevronDown, LogIn, LogOut
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import CustomerAuthModal from '@/components/CustomerAuthModal'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface StoreHeaderProps {
  searchTerm?: string
  setSearchTerm?: (term: string) => void
  onOpenCart?: () => void
  activePage?: 'tienda' | 'pedidos' | 'cuenta'
  cartCountOverride?: number
  cartSubtotalOverride?: number
}

export default function StoreHeader({
  searchTerm = '',
  setSearchTerm,
  onOpenCart,
  activePage = 'tienda',
  cartCountOverride,
  cartSubtotalOverride
}: StoreHeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm)
  const [customerInfo, setCustomerInfo] = useState<{
    id?: string
    nombre?: string
    telefono?: string
    email?: string
    direccion?: string
    rut?: string
    empresa?: string
  }>({})
  const [cartCount, setCartCount] = useState(0)
  const [cartSubtotal, setCartSubtotal] = useState(0)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Sync customer and cart from localStorage
  const refreshLocalData = () => {
    try {
      const savedCustomer = localStorage.getItem('guga_store_customer')
      if (savedCustomer) {
        setCustomerInfo(JSON.parse(savedCustomer))
      } else {
        setCustomerInfo({})
      }

      const savedCart = localStorage.getItem('guga_store_cart') || localStorage.getItem('guga_cart_items')
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed)) {
          setCartCount(parsed.reduce((acc: number, it: any) => acc + (it.cantidad || 1), 0))
          setCartSubtotal(parsed.reduce((acc: number, it: any) => acc + (it.subtotal || (it.servicio?.precio_base || it.servicio?.precio || 0) * (it.cantidad || 1)), 0))
        }
      } else {
        setCartCount(0)
        setCartSubtotal(0)
      }
    } catch (e) {
      console.error('Error syncing store header data:', e)
    }
  }

  useEffect(() => {
    refreshLocalData()

    // Listen for storage events across tabs or local updates
    const handleStorage = () => refreshLocalData()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    setLocalSearch(searchTerm)
  }, [searchTerm])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (setSearchTerm) {
      setSearchTerm(localSearch)
    } else {
      window.location.href = `/tienda?search=${encodeURIComponent(localSearch.trim())}`
    }
  }

  const handleSearchChange = (val: string) => {
    setLocalSearch(val)
    if (setSearchTerm) {
      setSearchTerm(val)
    }
  }

  const handleCartClick = () => {
    if (onOpenCart) {
      onOpenCart()
    } else {
      window.location.href = '/tienda?openCart=true'
    }
  }

  const displayCount = cartCountOverride !== undefined ? cartCountOverride : cartCount
  const displaySubtotal = cartSubtotalOverride !== undefined ? cartSubtotalOverride : cartSubtotal

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <div className="store-header-inner">
          {/* Logo GUGA */}
          <Link href="/tienda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="GUGA Imprenta"
              className="store-header-logo"
              style={{ maxHeight: '42px', maxWidth: '150px', objectFit: 'contain' }}
            />
          </Link>

          {/* Search Bar in center (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="store-header-search-desktop"
          >
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', color: '#94a3b8', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar productos..."
              style={{
                width: '100%',
                padding: '10px 16px 10px 42px',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                color: '#0f172a',
                transition: 'all 0.2s'
              }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </form>

          {/* Right Header Navigation: Explorar, Carrito, Pedidos, Cuenta */}
          <div className="store-header-actions">

            {/* Explorar — GUGA Teal filled pill */}
            <button
              type="button"
              className="store-action-btn"
              onClick={() => {
                if (activePage === 'tienda') {
                  if (setSearchTerm) setSearchTerm('')
                  const el = document.getElementById('catalogo-section')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                } else {
                  window.location.href = '/tienda#catalogo-section'
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(20, 155, 142, 0.30)',
                letterSpacing: '0.01em'
              }}
              title="Explorar catálogo"
            >
              <Search size={15} />
              <span className="store-btn-text">Explorar</span>
            </button>

            {/* Carrito — GUGA Teal outline pill */}
            <button
              type="button"
              className="store-action-btn"
              onClick={handleCartClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: displayCount > 0 ? 'rgba(20, 155, 142, 0.08)' : 'transparent',
                border: displayCount > 0 ? '1.5px solid #149b8e' : '1.5px solid #e2e8f0',
                color: displayCount > 0 ? '#0f766e' : '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '999px',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              title="Ver Carrito de Compras"
            >
              <div style={{ position: 'relative' }}>
                <ShoppingCart size={17} />
                {displayCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-9px',
                    right: '-11px',
                    background: 'linear-gradient(135deg, #149b8e 0%, #0f766e 100%)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRadius: '999px',
                    padding: '1px 5px',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 1px 4px rgba(20, 155, 142, 0.4)'
                  }}>
                    {displayCount}
                  </span>
                )}
              </div>
              <span className="store-btn-text">Carrito</span>
              {displayCount > 0 && (
                <span className="store-btn-text" style={{ fontSize: '12px', color: '#0f766e', fontWeight: 800 }}>
                  {formatCurrency(displaySubtotal)}
                </span>
              )}
            </button>

            {/* Pedidos — Outline pill */}
            <Link
              href="/tienda/pedidos"
              className="store-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: activePage === 'pedidos' ? 'rgba(20, 155, 142, 0.08)' : 'transparent',
                border: activePage === 'pedidos' ? '1.5px solid #149b8e' : '1.5px solid #e2e8f0',
                color: activePage === 'pedidos' ? '#0f766e' : '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '999px',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              title="Rastrear mis Pedidos"
            >
              <Truck size={17} color={activePage === 'pedidos' ? '#149b8e' : '#475569'} />
              <span className="store-btn-text">Pedidos</span>
            </Link>

            {/* Dynamic Customer Pill / Login Trigger */}
            {customerInfo.nombre || customerInfo.telefono ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="store-action-btn"
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: activePage === 'cuenta' ? 'rgba(20, 155, 142, 0.14)' : 'rgba(20, 155, 142, 0.08)',
                    border: '1.5px solid #149b8e',
                    color: '#0f766e',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '6px 14px 6px 8px',
                    borderRadius: '999px',
                    transition: 'all 0.2s'
                  }}
                  title="Mi Cuenta"
                >
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {customerInfo.nombre ? customerInfo.nombre.charAt(0).toUpperCase() : <User size={13} />}
                  </div>
                  <span className="store-btn-text">{customerInfo.nombre ? `¡Hola, ${customerInfo.nombre.split(' ')[0]}!` : 'Mi Cuenta'}</span>
                  <ChevronDown size={14} style={{ transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                      width: '240px',
                      zIndex: 60,
                      overflow: 'hidden',
                      animation: 'slideUp 0.15s ease'
                    }}
                  >
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                        {customerInfo.nombre || 'Cliente GUGA'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {customerInfo.telefono || customerInfo.email || 'Sesión iniciada'}
                      </div>
                    </div>

                    <div style={{ padding: '6px' }}>
                      <Link
                        href="/tienda/cuenta"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: '#334155',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <User size={16} color="#149b8e" />
                        <span>Mi Perfil y Datos</span>
                      </Link>

                      <Link
                        href="/tienda/pedidos"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: '#334155',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Truck size={16} color="#149b8e" />
                        <span>Mis Pedidos y Presupuestos</span>
                      </Link>

                      <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('guga_store_customer')
                          setCustomerInfo({})
                          setIsUserMenuOpen(false)
                          toast.success('Sesión cerrada')
                          window.dispatchEvent(new Event('storage'))
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: '#ef4444',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="store-action-btn"
                onClick={() => setIsAuthModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'transparent',
                  border: '1.5px solid #149b8e',
                  color: '#149b8e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  transition: 'all 0.2s'
                }}
                title="Iniciar Sesión / Registrarse"
              >
                <LogIn size={16} />
                <span className="store-btn-text">Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar Row (Shown only on small screens) */}
        <div className="store-header-search-mobile">
          <form
            onSubmit={handleSearchSubmit}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={16}
              style={{ position: 'absolute', left: '14px', color: '#94a3b8', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar productos..."
              style={{
                width: '100%',
                padding: '9px 16px 9px 38px',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '13.5px',
                outline: 'none',
                color: '#0f172a'
              }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            )}
          </form>
        </div>
      </header>

      {/* Customer Auth Modal for easy identification everywhere */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(cust) => {
          setCustomerInfo(cust)
          refreshLocalData()
          window.dispatchEvent(new Event('storage'))
        }}
      />
    </>
  )
}