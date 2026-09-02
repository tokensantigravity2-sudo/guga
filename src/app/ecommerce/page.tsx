'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Pedido, Servicio, Cliente } from '@/lib/types'
import { formatCurrency, formatDateTime, formatDate, ESTADOS_PEDIDO, CATEGORIAS_TIENDA } from '@/lib/helpers'
import CategoryIcon, { AVAILABLE_VECTOR_ICONS, DEFAULT_CATEGORY_VECTOR_MAP } from '@/components/CategoryIcon'
import {
  Store, ShoppingBag, Truck, CheckCircle2, Clock, AlertCircle,
  Search, Filter, Plus, Edit2, Trash2, ExternalLink, Printer,
  Phone, DollarSign, Package, Check, RefreshCw,
  Eye, ArrowUpRight, ShieldAlert, Sparkles, MapPin, Layers,
  Globe, Share2, FileText
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import toast from 'react-hot-toast'
import TicketImpresion from '@/components/TicketImpresion'
import PresupuestoPDFModal from '@/components/PresupuestoPDFModal'

export default function EcommerceAdminPage() {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'catalogo' | 'config'>('pedidos')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Search states
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Selected Order for details modal or Ticket
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketPedido, setTicketPedido] = useState<Pedido | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfPedido, setPdfPedido] = useState<Pedido | null>(null)

  // Catalog edit modal
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [catalogForm, setCatalogForm] = useState({
    nombre: '',
    categoria: 'Folletos',
    descripcion: '',
    precio_base: 0,
    unidad: 'unidad',
    tiempo_estimado: '2-3 días',
    disponible: true,
    imagen_url: ''
  })

  // Store Config State
  const [storeConfig, setStoreConfig] = useState({
    nombreTienda: 'GUGA Imprenta & Gráfica',
    telefonoWhatsApp: '59899123456',
    direccionTaller: 'Av. Principal 1234, Taller GUGA',
    costoEnvioFijo: 250,
    envioGratisMinimo: 4000,
    mensajeBienvenida: '¡Bienvenido a GUGA Imprenta Online! Tu trabajo en las mejores manos.',
    bannerDesktopUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=80',
    bannerMobileUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
  })

  // Category Vector Line Icons State
  const [categoryVectorIcons, setCategoryVectorIcons] = useState<Record<string, string>>(DEFAULT_CATEGORY_VECTOR_MAP)

  // SEO & Meta Tags Configuration State
  const [seoConfig, setSeoConfig] = useState({
    metaTitle: 'GUGA Imprenta & Gráfica | Impresión Digital, Offset y Merchandising',
    metaDescription: 'Imprenta online líder en Uruguay. Impresión de folletos, tarjetas de visita, stickers, talonarios, packaging y banners con envíos rápidos a todo el país.',
    keywords: 'imprenta, impresion digital, folletos uruguay, tarjetas de presentacion, talonarios, stickers adhesivos, packaging, merchandising, guga imprenta',
    ogImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
    canonicalUrl: 'https://gugaimprenta.com.uy/tienda',
    robotsIndex: true,
    googleAnalyticsId: 'G-XXXXXXXXXX',
    googleSiteVerification: '',
    author: 'GUGA Gráfica & Imprenta'
  })

  useEffect(() => {
    loadData()
    // Load config from localStorage if present
    const savedConf = localStorage.getItem('guga_store_admin_config')
    if (savedConf) {
      try {
        setStoreConfig(JSON.parse(savedConf))
      } catch (e) {
        console.error(e)
      }
    }

    // Load category vector line icons from localStorage
    const savedIcons = localStorage.getItem('guga_category_vector_icons')
    if (savedIcons) {
      try {
        setCategoryVectorIcons(prev => ({ ...prev, ...JSON.parse(savedIcons) }))
      } catch (e) {
        console.error(e)
      }
    }

    // Load SEO config from localStorage
    const savedSeo = localStorage.getItem('guga_store_seo_config')
    if (savedSeo) {
      try {
        setSeoConfig(prev => ({ ...prev, ...JSON.parse(savedSeo) }))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleSaveCategoryVectorIcons = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('guga_category_vector_icons', JSON.stringify(categoryVectorIcons))
    toast.success('¡Íconos vectoriales de categorías guardados y sincronizados!')
  }

  const handleSaveSeoConfig = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('guga_store_seo_config', JSON.stringify(seoConfig))
    toast.success('¡Configuración SEO guardada y actualizada con éxito!')
  }

  const loadData = async () => {
    setLoading(true)
    const [{ data: pds, error: errPds }, { data: srvs, error: errSrvs }] = await Promise.all([
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      supabase.from('servicios').select('*').order('categoria').order('nombre')
    ])

    if (errPds) {
      toast.error('Error cargando pedidos: ' + errPds.message)
    } else if (pds) {
      setPedidos(pds)
    }

    if (errSrvs) {
      toast.error('Error cargando catálogo: ' + errSrvs.message)
    } else if (srvs) {
      setServicios(srvs)
    }

    setLoading(false)
  }

  // Filter ecommerce orders (those with origen === 'ecommerce' or containing ECO- or ecommerce note)
  const ecommerceOrders = pedidos.filter(p =>
    p.origen === 'ecommerce' ||
    (p.numero && p.numero.startsWith('ECO-')) ||
    (p.notas && p.notas.includes('[TIENDA ONLINE]'))
  )

  const filteredOrders = ecommerceOrders.filter(p => {
    // Status filter
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'pendientes' && (p.estado !== 'presupuesto' && p.estado !== 'recibido')) return false
      if (filtroEstado === 'produccion' && (p.estado !== 'aprobado' && p.estado !== 'en_produccion' && p.estado !== 'preparando')) return false
      if (filtroEstado === 'listos' && (p.estado !== 'terminado' && p.estado !== 'listo')) return false
      if (filtroEstado === 'entregados' && p.estado !== 'entregado') return false
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchNum = p.numero.toLowerCase().includes(q)
      const matchName = (p.cliente_nombre || '').toLowerCase().includes(q)
      const matchPhone = (p.cliente_telefono || '').toLowerCase().includes(q)
      return matchNum || matchName || matchPhone
    }

    return true
  })

  // Metric Stats
  const totalOrdersCount = ecommerceOrders.length
  const pendingOrdersCount = ecommerceOrders.filter(p => p.estado === 'presupuesto' || p.estado === 'recibido' || !p.estado).length
  const inProductionCount = ecommerceOrders.filter(p => p.estado === 'aprobado' || p.estado === 'en_produccion').length
  const totalRevenue = ecommerceOrders.reduce((acc, p) => acc + (p.total || 0), 0)

  // Status Change Handler
  const handleUpdateStatus = async (pedidoId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId)

      if (error) throw error

      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado as any } : p))
      if (selectedPedido && selectedPedido.id === pedidoId) {
        setSelectedPedido(prev => prev ? { ...prev, estado: nuevoEstado as any } : null)
      }
      toast.success(`Estado actualizado a "${nuevoEstado}"`)
    } catch (err: any) {
      toast.error('Error al actualizar estado: ' + err.message)
    }
  }

  // Send WhatsApp notification to client
  const sendWhatsAppUpdate = (p: Pedido, tipo: 'recibido' | 'produccion' | 'listo' | 'entregado') => {
    const rawPhone = p.cliente_telefono || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')

    if (!cleanPhone) {
      toast.error('El pedido no tiene teléfono registrado')
      return
    }

    let phone = cleanPhone
    if (!phone.startsWith('598') && phone.startsWith('09')) {
      phone = '598' + phone.substring(1)
    } else if (!phone.startsWith('598') && phone.length === 8) {
      phone = '598' + phone
    }

    let msg = ''
    if (tipo === 'recibido') {
      msg = `Hola ${p.cliente_nombre || 'Cliente'}! 👋 Te confirmamos que recibimos tu pedido *${p.numero}* en *GUGA Imprenta*. Total: $ ${p.total?.toLocaleString('es-UY')}. Pronto comenzaremos con la preparación.`
    } else if (tipo === 'produccion') {
      msg = `Hola ${p.cliente_nombre || 'Cliente'}! 🖨️ Tu pedido *${p.numero}* ya ingresó a nuestro taller y está en *Producción*. Te avisaremos cuando esté listo.`
    } else if (tipo === 'listo') {
      const entrega = (p.metodo_entrega === 'envio' || (p.notas && p.notas.includes('ENVIO')))
        ? 'está en camino / listo para despacho 🚚'
        : 'ya está listo para retirar en nuestro taller 🏢'
      msg = `¡Buenas noticias ${p.cliente_nombre || 'Cliente'}! 🎉 Tu pedido *${p.numero}* ${entrega}. ¡Muchas gracias por elegir GUGA Imprenta!`
    } else if (tipo === 'entregado') {
      msg = `Hola ${p.cliente_nombre || 'Cliente'}! 🙌 Tu pedido *${p.numero}* ha sido marcado como *Entregado*. Esperamos que todo haya quedado excelente. ¡Hasta la próxima!`
    }

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  // Save Store Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('guga_store_admin_config', JSON.stringify(storeConfig))
    toast.success('Configuración de tienda guardada exitosamente')
  }

  // Catalog item edit / add
  const handleOpenCatalogModal = (srv?: Servicio) => {
    if (srv) {
      setEditingServicio(srv)
      setCatalogForm({
        nombre: srv.nombre,
        categoria: srv.categoria,
        descripcion: srv.descripcion || '',
        precio_base: srv.precio_base,
        unidad: srv.unidad || 'unidad',
        tiempo_estimado: srv.tiempo_estimado || '2-3 días',
        disponible: srv.disponible !== false,
        imagen_url: srv.imagen_url || ''
      })
    } else {
      setEditingServicio(null)
      setCatalogForm({
        nombre: '',
        categoria: 'Folletos',
        descripcion: '',
        precio_base: 0,
        unidad: 'unidad',
        tiempo_estimado: '2-3 días',
        disponible: true,
        imagen_url: ''
      })
    }
    setShowCatalogModal(true)
  }

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingServicio) {
        const { data, error } = await supabase
          .from('servicios')
          .update(catalogForm)
          .eq('id', editingServicio.id)
          .select()
          .single()

        if (error) throw error
        setServicios(prev => prev.map(s => s.id === editingServicio.id ? data : s))
        toast.success('Producto actualizado en catálogo')
      } else {
        const { data, error } = await supabase
          .from('servicios')
          .insert([catalogForm])
          .select()
          .single()

        if (error) throw error
        setServicios(prev => [data, ...prev])
        toast.success('Nuevo producto agregado al catálogo')
      }
      setShowCatalogModal(false)
    } catch (err: any) {
      toast.error('Error al guardar producto: ' + err.message)
    }
  }

  const handleToggleProductAvailability = async (srv: Servicio) => {
    const newStatus = !srv.disponible
    try {
      const { error } = await supabase
        .from('servicios')
        .update({ disponible: newStatus })
        .eq('id', srv.id)

      if (error) throw error
      setServicios(prev => prev.map(s => s.id === srv.id ? { ...s, disponible: newStatus } : s))
      toast.success(newStatus ? 'Producto activado en la tienda' : 'Producto pausado en la tienda')
    } catch (err: any) {
      toast.error('Error al cambiar disponibilidad: ' + err.message)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Header
        title="Gestión E-commerce & Tienda Online"
        subtitle="Recepción de pedidos online, despacho y administración de productos visibles en la web"
      />

      {/* Top Bar with Live Store Link & Quick Metrics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Store size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Tienda Online GUGA Activa
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Ruta pública: <strong style={{ color: '#149b8e' }}>/tienda</strong> (accesible por clientes)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-light)',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <a
            href="/tienda"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
            }}
          >
            <span>Ver Tienda Online</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid-stats" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="stat-value">{totalOrdersCount}</div>
            <div className="stat-label">Pedidos Online Totales</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value">{pendingOrdersCount}</div>
            <div className="stat-label">Pendientes / Por Preparar</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="stat-value">{inProductionCount}</div>
            <div className="stat-label">En Taller / Producción</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-value">{formatCurrency(totalRevenue)}</div>
            <div className="stat-label">Ventas Tienda Online</div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        gap: '8px'
      }}>
        <button
          onClick={() => setActiveTab('pedidos')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'pedidos' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'pedidos' ? '#dc2626' : 'var(--text-secondary)',
            fontWeight: activeTab === 'pedidos' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShoppingBag size={17} />
          <span>Pedidos Online ({ecommerceOrders.length})</span>
          {pendingOrdersCount > 0 && (
            <span style={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '999px'
            }}>
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('catalogo')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'catalogo' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'catalogo' ? '#dc2626' : 'var(--text-secondary)',
            fontWeight: activeTab === 'catalogo' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={17} />
          <span>Catálogo & Stock ({servicios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'config' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'config' ? '#dc2626' : 'var(--text-secondary)',
            fontWeight: activeTab === 'config' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Store size={17} />
          <span>Configuración & Banners</span>
        </button>
      </div>

      {/* TAB 1: PEDIDOS ONLINE */}
      {activeTab === 'pedidos' && (
        <div>
          {/* Filters and Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFiltroEstado('todos')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: filtroEstado === 'todos' ? '1px solid #dc2626' : '1px solid var(--border)',
                  backgroundColor: filtroEstado === 'todos' ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg-card)',
                  color: filtroEstado === 'todos' ? '#dc2626' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Todos ({ecommerceOrders.length})
              </button>

              <button
                onClick={() => setFiltroEstado('pendientes')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: filtroEstado === 'pendientes' ? '1px solid #f59e0b' : '1px solid var(--border)',
                  backgroundColor: filtroEstado === 'pendientes' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)',
                  color: filtroEstado === 'pendientes' ? '#f59e0b' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                ⏳ Pendientes / Presupuestos ({pendingOrdersCount})
              </button>

              <button
                onClick={() => setFiltroEstado('produccion')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: filtroEstado === 'produccion' ? '1px solid #0284c7' : '1px solid var(--border)',
                  backgroundColor: filtroEstado === 'produccion' ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-card)',
                  color: filtroEstado === 'produccion' ? '#0284c7' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🖨️ En Producción ({inProductionCount})
              </button>

              <button
                onClick={() => setFiltroEstado('listos')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: filtroEstado === 'listos' ? '1px solid #16a34a' : '1px solid var(--border)',
                  backgroundColor: filtroEstado === 'listos' ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-card)',
                  color: filtroEstado === 'listos' ? '#16a34a' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📦 Listos para Entregar
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Nº, cliente, teléfono..."
                className="input"
                style={{ paddingLeft: '36px', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Orders Table / Cards */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ marginBottom: '12px' }} />
              <p>Cargando pedidos de la tienda online...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card empty-state">
              <ShoppingBag size={48} />
              <h3>No hay pedidos online que coincidan</h3>
              <p>Cuando un cliente realice una compra desde <strong>/tienda</strong>, aparecerá aquí al instante.</p>
              <a
                href="/tienda"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ marginTop: '10px' }}
              >
                Hacer un pedido de prueba en la Tienda ↗
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredOrders.map((pd) => {
                let badgeColor = { bg: '#fef3c7', text: '#b45309', label: 'Pendiente / Presupuesto' }
                if (pd.estado === 'aprobado' || pd.estado === 'en_produccion' || pd.estado === 'preparando') {
                  badgeColor = { bg: '#e0f2fe', text: '#0369a1', label: 'En Producción' }
                } else if (pd.estado === 'terminado' || pd.estado === 'listo') {
                  badgeColor = { bg: '#dcfce7', text: '#15803d', label: 'Listo para Entrega' }
                } else if (pd.estado === 'entregado') {
                  badgeColor = { bg: '#f1f5f9', text: '#475569', label: 'Entregado' }
                }

                return (
                  <div
                    key={pd.id}
                    className="card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: `4px solid ${badgeColor.text}`
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {pd.numero}
                        </span>
                        <span style={{
                          backgroundColor: badgeColor.bg,
                          color: badgeColor.text,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {badgeColor.label}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDateTime(pd.created_at || '')}
                        </span>
                      </div>

                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#dc2626' }}>
                        {formatCurrency(pd.total)}
                      </div>
                    </div>

                    {/* Card Body: Customer & Items Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {/* Customer Info */}
                      <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px 14px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Datos del Cliente
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pd.cliente_nombre || 'Cliente Tienda'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} color="#149b8e" />
                          <span>{pd.cliente_telefono || 'Sin teléfono'}</span>
                        </div>
                        {pd.cliente_direccion && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="#f59e0b" />
                            <span>{pd.cliente_direccion}</span>
                          </div>
                        )}
                        {pd.metodo_pago && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Pago: <strong>{pd.metodo_pago.toUpperCase()}</strong>
                          </div>
                        )}
                      </div>

                      {/* Items list */}
                      <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px 14px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Productos Solicitados ({pd.items ? pd.items.length : 0})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                          {pd.items && pd.items.map((it, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span>• <strong>{it.nombre}</strong> x {it.cantidad}</span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(it.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                        {pd.notas && (
                          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <em>{pd.notas}</em>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border)'
                    }}>
                      {/* State workflow selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Cambiar Estado:
                        </span>
                        <select
                          value={pd.estado || 'presupuesto'}
                          onChange={(e) => handleUpdateStatus(pd.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-light)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <option value="presupuesto">⏳ Presupuesto / Pendiente</option>
                          <option value="aprobado">✅ Aprobado / En Preparación</option>
                          <option value="en_produccion">🖨️ En Producción</option>
                          <option value="terminado">📦 Listo para Entregar</option>
                          <option value="entregado">🤝 Entregado</option>
                          <option value="cancelado">❌ Cancelado</option>
                        </select>
                      </div>

                      {/* Action buttons: WhatsApp notifications + Ticket */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* WhatsApp Update button */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => sendWhatsAppUpdate(pd, 'produccion')}
                            title="Notificar por WhatsApp: En Taller / Producción"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'rgba(2, 132, 199, 0.1)',
                              color: '#0284c7',
                              border: '1px solid rgba(2, 132, 199, 0.2)',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <WhatsAppIcon size={14} color="#0284c7" />
                            <span>WA: En Taller</span>
                          </button>

                          <button
                            onClick={() => sendWhatsAppUpdate(pd, 'listo')}
                            title="Notificar por WhatsApp: ¡Pedido Listo!"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#25d366',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
                            }}
                          >
                            <WhatsAppIcon size={14} color="white" />
                            <span>WA: ¡Pedido Listo!</span>
                          </button>
                        </div>

                        {/* Print Ticket */}
                        <button
                          onClick={() => {
                            setTicketPedido(pd)
                            setShowTicketModal(true)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-light)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <Printer size={13} />
                          <span>Comanda / Ticket</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATÁLOGO & PRODUCTOS */}
      {activeTab === 'catalogo' && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Catálogo de Productos y Servicios
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Todos los productos activos se muestran automáticamente en el frontend de la tienda.
              </p>
            </div>

            <button
              onClick={() => handleOpenCatalogModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Nuevo Producto para Tienda</span>
            </button>
          </div>

          {/* Catalog Table */}
          <div className="table-wrapper card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio Tienda</th>
                  <th>Unidad / Medida</th>
                  <th>Tiempo Entrega</th>
                  <th>Estado Tienda</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((srv) => (
                  <tr key={srv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {srv.imagen_url ? (
                          <img
                            src={srv.imagen_url}
                            alt={srv.nombre}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={16} color="#94a3b8" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{srv.nombre}</div>
                          {srv.descripcion && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {srv.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{srv.categoria}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatCurrency(srv.precio_base)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {srv.unidad || 'u.'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      {srv.tiempo_estimado || '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleProductAvailability(srv)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          border: 'none',
                          backgroundColor: srv.disponible !== false ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                          color: srv.disponible !== false ? '#16a34a' : '#dc2626',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {srv.disponible !== false ? '✓ Visible' : '✕ Oculto'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenCatalogModal(srv)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          padding: '6px',
                          cursor: 'pointer'
                        }}
                        title="Editar producto"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN & BANNERS */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Store Settings Form */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              ⚙️ Parámetros de la Tienda Online
            </h3>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label>Nombre de la Tienda</label>
                <input
                  type="text"
                  className="input"
                  value={storeConfig.nombreTienda}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, nombreTienda: e.target.value }))}
                />
              </div>

              <div>
                <label>Teléfono de WhatsApp para recibir pedidos (con código de país)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="59899123456"
                  value={storeConfig.telefonoWhatsApp}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, telefonoWhatsApp: e.target.value }))}
                />
              </div>

              <div>
                <label>Dirección para Retiro en Taller</label>
                <input
                  type="text"
                  className="input"
                  value={storeConfig.direccionTaller}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, direccionTaller: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Costo de Envío Estándar ($)</label>
                  <input
                    type="number"
                    className="input"
                    value={storeConfig.costoEnvioFijo}
                    onChange={(e) => setStoreConfig(prev => ({ ...prev, costoEnvioFijo: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label>Envío Gratis desde ($)</label>
                  <input
                    type="number"
                    className="input"
                    value={storeConfig.envioGratisMinimo}
                    onChange={(e) => setStoreConfig(prev => ({ ...prev, envioGratisMinimo: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  🖼️ Banner para Laptop / Desktop (Resolución recomendada: 1200 x 360 px)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://... o /banner-desktop.jpg"
                  value={storeConfig.bannerDesktopUrl || ''}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, bannerDesktopUrl: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  📱 Banner para Celulares / Mobile (Resolución recomendada: 750 x 420 px)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://... o /banner-mobile.jpg"
                  value={storeConfig.bannerMobileUrl || ''}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, bannerMobileUrl: e.target.value }))}
                />
              </div>

              <div>
                <label>Mensaje de Bienvenida</label>
                <textarea
                  className="input"
                  rows={2}
                  value={storeConfig.mensajeBienvenida}
                  onChange={(e) => setStoreConfig(prev => ({ ...prev, mensajeBienvenida: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Guardar Configuración y Banners
              </button>
            </form>
          </div>

          {/* Banners Live Preview */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              🎨 Vista Previa de Imágenes de Banner
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Desktop Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    💻 Vista Laptop / Desktop
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px' }}>
                    1200 × 360 px (~3.3:1)
                  </span>
                </div>
                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  backgroundColor: '#0f172a',
                  lineHeight: 0
                }}>
                  <img
                    src={storeConfig.bannerDesktopUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=80'}
                    alt="Vista Previa Banner Desktop"
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }}
                  />
                </div>
              </div>

              {/* Mobile Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📱 Vista Celular / Mobile
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px' }}>
                    750 × 420 px (~16:9)
                  </span>
                </div>
                <div style={{
                  width: '240px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  backgroundColor: '#0f172a',
                  lineHeight: 0
                }}>
                  <img
                    src={storeConfig.bannerMobileUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'}
                    alt="Vista Previa Banner Mobile"
                    style={{ width: '100%', maxHeight: '140px', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category Vector Icons Editor Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🖋️ Gestor de Íconos Vectoriales de Categorías
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Selecciona el ícono vectorial lineal (estilo trazo/outline) que representa a cada categoría en la tienda online.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveCategoryVectorIcons}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Guardar Íconos de Categorías
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
              backgroundColor: 'var(--bg-input)',
              padding: '16px',
              borderRadius: '12px'
            }}>
              {Object.keys(DEFAULT_CATEGORY_VECTOR_MAP).filter(cat => cat !== 'default').map((cat) => {
                const currentIconId = categoryVectorIcons[cat] || DEFAULT_CATEGORY_VECTOR_MAP[cat] || 'printer'
                return (
                  <div
                    key={cat}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        flexShrink: 0
                      }}>
                        <CategoryIcon iconId={currentIconId} size={20} strokeWidth={1.9} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {cat}
                      </span>
                    </div>

                    <select
                      value={currentIconId}
                      onChange={(e) => {
                        const val = e.target.value
                        setCategoryVectorIcons(prev => ({ ...prev, [cat]: val }))
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-input)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        maxWidth: '130px'
                      }}
                    >
                      {AVAILABLE_VECTOR_ICONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SEO & Meta Tags Manager Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(20, 155, 142, 0.12)',
                  color: '#149b8e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Globe size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    🔍 Configuración de SEO & Posicionamiento en Buscadores
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Personaliza cómo aparece GUGA Imprenta en Google, WhatsApp, Facebook, Instagram y buscadores.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSeoConfig}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} />
                <span>Guardar Configuración SEO</span>
              </button>
            </div>

            {/* LIVE PREVIEWS SECTION (GOOGLE & SOCIAL SHARE) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px',
              marginBottom: '24px'
            }}>
              {/* 1. Google Search Preview */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <Search size={14} />
                  <span>VISTA PREVIA EN GOOGLE</span>
                </div>
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#149b8e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>
                      G
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#202124', lineHeight: 1.2, fontWeight: 500 }}>
                        {seoConfig.canonicalUrl.replace(/^https?:\/\//, '').split('/')[0] || 'gugaimprenta.com.uy'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#5f6368', lineHeight: 1 }}>
                        {seoConfig.canonicalUrl || 'https://gugaimprenta.com.uy/tienda'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '17px', color: '#1a0dab', fontWeight: 400, lineHeight: 1.3, marginBottom: '4px', textDecoration: 'none', cursor: 'pointer' }}>
                    {seoConfig.metaTitle || 'GUGA Imprenta & Gráfica'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#4d5156', lineHeight: 1.4 }}>
                    {seoConfig.metaDescription || 'Imprenta digital y offset en Uruguay. Folletos, tarjetas, talonarios, packaging y más.'}
                  </div>
                </div>
              </div>

              {/* 2. WhatsApp / Social Media Card Preview */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <Share2 size={14} />
                  <span>VISTA PREVIA AL COMPARTIR (WHATSAPP / REDES)</span>
                </div>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxWidth: '380px'
                }}>
                  {seoConfig.ogImageUrl && (
                    <div style={{ height: '130px', backgroundColor: '#0f172a', overflow: 'hidden' }}>
                      <img
                        src={seoConfig.ogImageUrl}
                        alt="SEO Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '3px' }}>
                      {seoConfig.canonicalUrl.replace(/^https?:\/\//, '').split('/')[0] || 'gugaimprenta.com.uy'}
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '4px' }}>
                      {seoConfig.metaTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {seoConfig.metaDescription}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO INPUTS FORM */}
            <form onSubmit={handleSaveSeoConfig}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Title */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Meta Título (SEO Title Tag) *
                    </label>
                    <span style={{ fontSize: '11.5px', color: seoConfig.metaTitle.length > 60 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                      {seoConfig.metaTitle.length} / 60 caracteres (Recomendado: 50-60)
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    className="input"
                    value={seoConfig.metaTitle}
                    onChange={(e) => setSeoConfig(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Ej. GUGA Imprenta & Gráfica | Impresión Digital y Offset en Uruguay"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Meta Descripción (SEO Meta Description) *
                    </label>
                    <span style={{ fontSize: '11.5px', color: seoConfig.metaDescription.length > 160 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                      {seoConfig.metaDescription.length} / 160 caracteres (Recomendado: 140-160)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    className="input"
                    value={seoConfig.metaDescription}
                    onChange={(e) => setSeoConfig(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="Escribe un resumen atractivo para captar clientes en Google y buscadores..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Keywords & Canonical */}
                <div className="form-grid">
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Palabras Clave (Keywords / Etiquetas separadas por coma)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={seoConfig.keywords}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="imprenta, folletos, tarjetas personales, talonarios..."
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      URL Canónica (Dominio Oficial de la Tienda)
                    </label>
                    <input
                      type="url"
                      className="input"
                      value={seoConfig.canonicalUrl}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                      placeholder="https://gugaimprenta.com.uy/tienda"
                    />
                  </div>
                </div>

                {/* Social Image & Tracking */}
                <div className="form-grid">
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Imagen de Redes Sociales (Open Graph Image URL)
                    </label>
                    <input
                      type="url"
                      className="input"
                      value={seoConfig.ogImageUrl}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, ogImageUrl: e.target.value }))}
                      placeholder="https://... imagen de 1200x630 para WhatsApp y Facebook"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ID de Google Analytics (GA4) / Meta Pixel
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={seoConfig.googleAnalyticsId}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                </div>

                {/* Google Site Verification & Indexing Checkbox */}
                <div className="form-grid" style={{ alignItems: 'center' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Código de Google Search Console (Meta Verification)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={seoConfig.googleSiteVerification}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, googleSiteVerification: e.target.value }))}
                      placeholder="google-site-verification=XXXXXXXXXXXXXXXXXXXXX"
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    marginTop: '20px'
                  }}>
                    <input
                      type="checkbox"
                      id="robotsIndexToggle"
                      checked={seoConfig.robotsIndex}
                      onChange={(e) => setSeoConfig(prev => ({ ...prev, robotsIndex: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="robotsIndexToggle" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Permitir indexación en Google (Robots: index, follow)
                    </label>
                  </div>
                </div>

                {/* Submit button bottom */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Check size={16} />
                    <span>Guardar Cambios de SEO</span>
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATALOG ITEM */}
      {showCatalogModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingServicio ? 'Editar Producto Tienda' : 'Nuevo Producto Tienda'}</h2>
              <button onClick={() => setShowCatalogModal(false)} className="btn-ghost">✕</button>
            </div>

            <form onSubmit={handleSaveCatalogItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={catalogForm.nombre}
                    onChange={(e) => setCatalogForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Tarjetas Duras Mate - 100u"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Categoría *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={catalogForm.categoria}
                      onChange={(e) => setCatalogForm(prev => ({ ...prev, categoria: e.target.value }))}
                      placeholder="Tarjetas, Folletos, Facturas..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Precio Base ($) *</label>
                    <input
                      type="number"
                      required
                      className="input"
                      value={catalogForm.precio_base}
                      onChange={(e) => setCatalogForm(prev => ({ ...prev, precio_base: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Unidad / Presentación</label>
                    <input
                      type="text"
                      className="input"
                      value={catalogForm.unidad}
                      onChange={(e) => setCatalogForm(prev => ({ ...prev, unidad: e.target.value }))}
                      placeholder="unidad, pack 100u, talonario"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tiempo Estimado de Entrega</label>
                    <input
                      type="text"
                      className="input"
                      value={catalogForm.tiempo_estimado}
                      onChange={(e) => setCatalogForm(prev => ({ ...prev, tiempo_estimado: e.target.value }))}
                      placeholder="2-3 días, 24hs express"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>URL de Imagen del Producto (opcional)</label>
                  <input
                    type="text"
                    className="input"
                    value={catalogForm.imagen_url}
                    onChange={(e) => setCatalogForm(prev => ({ ...prev, imagen_url: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div className="form-group">
                  <label>Descripción / Especificaciones</label>
                  <textarea
                    rows={3}
                    className="input"
                    value={catalogForm.descripcion}
                    onChange={(e) => setCatalogForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Papel ilustración 350g, laminado mate doble faz..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCatalogModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET PRINT MODAL */}
      {showTicketModal && ticketPedido && (
        <TicketImpresion
          ticket={{
            numero: ticketPedido.numero,
            fecha: ticketPedido.created_at ? new Date(ticketPedido.created_at) : new Date(),
            items: (ticketPedido.items || []).map(it => ({
              nombre: it.nombre,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario,
              subtotal: it.subtotal
            })),
            subtotal: ticketPedido.subtotal || ticketPedido.total,
            descuento: ticketPedido.descuento || 0,
            total: ticketPedido.total,
            metodoPago: ticketPedido.metodo_pago || 'efectivo',
            clienteNombre: ticketPedido.cliente_nombre,
            notas: ticketPedido.notas
          }}
          onClose={() => setShowTicketModal(false)}
        />
      )}

      {/* PDF PRESUPUESTO MODAL */}
      {showPdfModal && pdfPedido && (
        <PresupuestoPDFModal
          pedido={pdfPedido}
          onClose={() => setShowPdfModal(false)}
        />
      )}

    </div>
  )
}
