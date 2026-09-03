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
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Logo GUGA */}
          <Link href="/tienda" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="GUGA Imprenta"
              style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain' }}
            />
          </Link>

          {/* Search Bar in center */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: 1,
              maxWidth: '560px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', color: '#94a3b8', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar productos (ej. Tarjetas, Facturas, Folletos, Stickers)..."
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Explorar — GUGA Teal filled pill */}
            <button
              type="button"
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
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
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
            >
              <Search size={15} />
              <span>Explorar</span>
            </button>

            {/* Carrito — GUGA Teal outline pill */}
            <button
              type="button"
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
              <span>Carrito</span>
              {displayCount > 0 && (
                <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 800 }}>
                  {formatCurrency(displaySubtotal)}
                </span>
              )}
            </button>

            {/* Pedidos — Outline pill */}
            <Link
              href="/tienda/pedidos"
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
            >
              <Truck size={17} color={activePage === 'pedidos' ? '#149b8e' : '#475569'} />
              <span>Pedidos</span>
            </Link>

            {/* Dynamic Customer Pill / Login Trigger */}
            {customerInfo.nombre || customerInfo.telefono ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
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
                  <span>{customerInfo.nombre ? `¡Hola, ${customerInfo.nombre.split(' ')[0]}!` : 'Mi Cuenta'}</span>
                  <ChevronDown size={14} style={{ transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '220px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                      border: '1px solid #e2e8f0',
                      padding: '8px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ padding: '8px 10px 6px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{customerInfo.nombre || 'Cliente GUGA'}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{customerInfo.telefono}</div>
                    </div>

                    <Link
                      href="/tienda/cuenta"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        color: activePage === 'cuenta' ? '#149b8e' : '#334155',
                        backgroundColor: activePage === 'cuenta' ? 'rgba(20, 155, 142, 0.08)' : 'transparent',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <User size={15} color="#149b8e" />
                      <span>Mi Perfil & Datos</span>
                    </Link>

                    <Link
                      href="/tienda/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        color: activePage === 'pedidos' ? '#149b8e' : '#334155',
                        backgroundColor: activePage === 'pedidos' ? 'rgba(20, 155, 142, 0.08)' : 'transparent',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <Truck size={15} color="#149b8e" />
                      <span>Mis Pedidos</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('guga_store_customer')
                        setCustomerInfo({})
                        setIsUserMenuOpen(false)
                        toast.success('Sesión cerrada correctamente')
                        window.dispatchEvent(new Event('storage'))
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        color: '#ef4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '4px',
                        borderTop: '1px solid #f1f5f9'
                      }}
                    >
                      <LogOut size={15} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
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
              >
                <LogIn size={16} />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
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