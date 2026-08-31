'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio, Cliente, PedidoItem, Pedido, StockItem } from '@/lib/types'
import { formatCurrency, formatDateTime, generateNumeroPedido, ESTADOS_PEDIDO, CATEGORIAS_SERVICIO } from '@/lib/helpers'
import {
  Plus, Minus, ShoppingCart, Search, X, Trash2,
  CreditCard, Banknote, ArrowLeftRight, Printer,
  Check, FileText, Calendar, Filter, UserCheck, ShieldAlert, Sparkles, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import TicketImpresion from '@/components/TicketImpresion'
import PresupuestoPDFModal from '@/components/PresupuestoPDFModal'

export default function PedidosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('nuevo')

  // New order state
  const [cart, setCart] = useState<PedidoItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [estadoPedido, setEstadoPedido] = useState('presupuesto')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Item customization modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [itemCustomNombre, setItemCustomNombre] = useState('')
  const [itemMedida, setItemMedida] = useState('')
  const [itemMaterial, setItemMaterial] = useState('')
  const [itemAcabado, setItemAcabado] = useState('')
  const [itemCantidad, setItemCantidad] = useState(100)
  const [itemPrecioUnitario, setItemPrecioUnitario] = useState(0)
  const [itemNoAfectarStock, setItemNoAfectarStock] = useState(false)
  const [itemPrecioEsTotal, setItemPrecioEsTotal] = useState(false)

  // Order options
  const [adicionalPorcentaje, setAdicionalPorcentaje] = useState(0)
  const [incluirIva, setIncluirIva] = useState(false)

  // Quick Client modal state
  const [showQuickClientModal, setShowQuickClientModal] = useState(false)
  const [quickClientForm, setQuickClientForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    rut: '',
    tipo: 'regular',
  })

  // Ticket state
  const [showTicket, setShowTicket] = useState(false)
  const [ticketData, setTicketData] = useState<Pedido | null>(null)

  // PDF Presupuesto state
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfData, setPdfData] = useState<Pedido | null>(null)

  // History filterss
  const [historialFilter, setHistorialFilter] = useState('todos')
  const [historialSearch, setHistorialSearch] = useState('')
  const [historialFechaInicio, setHistorialFechaInicio] = useState('')
  const [historialFechaFin, setHistorialFechaFin] = useState('')
  const [historialCategoria, setHistorialCategoria] = useState('')
  const [historialMetodoPago, setHistorialMetodoPago] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: srvs }, { data: clts }, { data: pds }, { data: stks }] = await Promise.all([
      supabase.from('servicios').select('*').eq('disponible', true).order('categoria'),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('stock').select('*').order('nombre'),
    ])

    if (srvs) setServicios(srvs)
    if (clts) setClientes(clts)
    if (pds) setPedidos(pds)
    if (stks) setStockItems(stks)

    // Verificar si viene un pedido para repetir desde Clientes o Historial
    const repeatStr = sessionStorage.getItem('guga_repeat_pedido')
    if (repeatStr) {
      try {
        const data = JSON.parse(repeatStr)
        sessionStorage.removeItem('guga_repeat_pedido')
        if (data.cliente) {
          const matchClt = (clts || []).find(c => c.id === data.cliente.id) || data.cliente
          setSelectedCliente(matchClt)
        }
        if (data.items && Array.isArray(data.items)) setCart(data.items)
        if (data.descuentoPorcentaje) setDescuentoPorcentaje(data.descuentoPorcentaje)
        if (data.notas) setNotas(data.notas)
        setActiveTab('nuevo')
        toast.success(`¡Pedido repetido cargado para ${data.cliente?.nombre || 'el cliente'}!`)
      } catch (e) {
        console.error('Error al repetir pedido', e)
      }
    }

    setLoading(false)
  }

  const handleRepetirPedidoDirecto = (p: Pedido) => {
    if (!p.items || p.items.length === 0) {
      toast.error('Este pedido no contiene ítems para repetir')
      return
    }
    const matchingCliente = clientes.find(c => c.id === p.cliente_id)
    if (matchingCliente) setSelectedCliente(matchingCliente)
    setCart(p.items)
    if (p.descuento_porcentaje) setDescuentoPorcentaje(p.descuento_porcentaje)
    if (p.notas) setNotas(p.notas)
    setActiveTab('nuevo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.success(`¡Ítems del Pedido #${p.numero} cargados en el carrito!`)
  }

  const openAddItemModal = (servicio: Servicio) => {
    setSelectedServicio(servicio)
    setItemCustomNombre(servicio.nombre)
    setItemPrecioUnitario(Number(servicio.precio_base))
    setItemCantidad(100)
    setItemPrecioEsTotal(false)
    setItemMedida('')
    setItemMaterial('')
    setItemAcabado('')
    setItemNoAfectarStock(false)
    setShowItemModal(true)
  }

  const openAddCustomItemModal = () => {
    setSelectedServicio(null)
    setItemCustomNombre('')
    setItemPrecioUnitario(0)
    setItemCantidad(1)
    setItemPrecioEsTotal(true)
    setItemMedida('')
    setItemMaterial('')
    setItemAcabado('')
    setItemNoAfectarStock(true)
    setShowItemModal(true)
  }

  const addItemToCart = () => {
    const nombreFinal = selectedServicio ? selectedServicio.nombre : itemCustomNombre.trim()
    if (!nombreFinal) {
      toast.error('El nombre del trabajo es obligatorio')
      return
    }
    if (itemCantidad <= 0 || itemPrecioUnitario <= 0) {
      toast.error('Completá la cantidad y precio mayor a 0')
      return
    }

    let precioUnit: number
    let sub: number
    if (itemPrecioEsTotal) {
      sub = itemPrecioUnitario // el valor ingresado ES el total del lote
      precioUnit = itemCantidad > 0 ? Math.round((sub / itemCantidad) * 100) / 100 : 0
    } else {
      precioUnit = itemPrecioUnitario
      sub = itemCantidad * precioUnit
    }

    const newItem: PedidoItem = {
      producto_id: selectedServicio?.id || undefined,
      nombre: nombreFinal,
      cantidad: itemCantidad,
      precio_unitario: precioUnit,
      subtotal: sub,
      medida: itemMedida || undefined,
      material: itemMaterial || undefined,
      acabado: itemAcabado || undefined,
      imagen_url: selectedServicio?.imagen_url || undefined,
      no_afectar_stock: itemNoAfectarStock,
    }

    setCart(prev => [...prev, newItem])
    setShowItemModal(false)
    toast.success(`${nombreFinal} agregado al pedido`)
  }

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev]
      const newQty = updated[index].cantidad + delta
      if (newQty <= 0) {
        updated.splice(index, 1)
      } else {
        updated[index].cantidad = newQty
        updated[index].subtotal = newQty * updated[index].precio_unitario
      }
      return updated
    })
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const descuentoMonto = Math.round((subtotal * (descuentoPorcentaje || 0)) / 100)
  const adicionalMonto = Math.round((subtotal * (adicionalPorcentaje || 0)) / 100)
  const subtotalNeto = Math.max(0, subtotal - descuentoMonto + adicionalMonto)
  const montoIva = incluirIva ? Math.round(subtotalNeto * 0.22 * 100) / 100 : 0
  const total = subtotalNeto + montoIva

  const handleCrearPedido = async () => {
    if (cart.length === 0) {
      toast.error('Agregá servicios o trabajos personalizados al pedido')
      return
    }

    const numero = generateNumeroPedido()
    const descTag = descuentoPorcentaje > 0 ? `[Desc: ${descuentoPorcentaje}%]` : null
    const adicTag = adicionalPorcentaje > 0 ? `[Adicional: ${adicionalPorcentaje}%]` : null
    const ivaTag = incluirIva ? `[+IVA 22%]` : null
    const notasFinal = [notas, descTag, adicTag, ivaTag].filter(Boolean).join(' ') || null
    let pedidoData: any = {
      numero,
      cliente_id: selectedCliente?.id || null,
      cliente_nombre: selectedCliente?.nombre || 'Consumidor Final',
      items: cart,
      subtotal,
      descuento: descuentoMonto,
      descuento_porcentaje: descuentoPorcentaje,
      total,
      metodo_pago: metodoPago,
      estado: estadoPedido,
      fecha_entrega: fechaEntrega || null,
      notas: notasFinal,
    }

    let { data, error } = await supabase.from('pedidos').insert(pedidoData).select().single()

    if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
      delete pedidoData.descuento_porcentaje
      const res = await supabase.from('pedidos').insert(pedidoData).select().single()
      data = res.data
      error = res.error
    }

    if (error) {
      toast.error('Error al registrar pedido: ' + error.message)
      return
    }

    // Afectar stock automáticamente si el estado es aprobado/en_produccion/terminado/entregado
    if (estadoPedido !== 'presupuesto' && estadoPedido !== 'cancelado') {
      await descontarStockDePedido(cart)
    }

    // Movimiento de caja si el pago no es cta corriente
    if (metodoPago !== 'cuenta_corriente' && estadoPedido !== 'presupuesto') {
      const nowIso = new Date().toISOString()
      let movData: any = {
        tipo: 'ingreso',
        monto: total,
        concepto: `Pedido #${numero} - ${selectedCliente?.nombre || 'Consumidor Final'}`,
        referencia_id: data.id,
        fecha: nowIso,
        cliente_id: selectedCliente?.id || null,
        cliente_nombre: selectedCliente?.nombre || 'Consumidor Final',
        metodo_pago: metodoPago || 'efectivo',
        facturado: false,
      }
      let { error: movErr } = await supabase.from('caja_movimientos').insert(movData)
      if (movErr && (movErr.message.includes('column') || movErr.message.includes('schema') || movErr.code === 'PGRST204')) {
        delete movData.cliente_id
        delete movData.cliente_nombre
        delete movData.metodo_pago
        delete movData.facturado
        await supabase.from('caja_movimientos').insert(movData)
      }
    }

    toast.success('¡Pedido/Presupuesto registrado con éxito!')
    setTicketData(data)
    setPdfData(data)
    setShowTicket(true)

    // Reset form
    setCart([])
    setSelectedCliente(null)
    setDescuentoPorcentaje(0)
    setAdicionalPorcentaje(0)
    setIncluirIva(false)
    setNotas('')
    setFechaEntrega('')
    loadData()
  }

  const descontarStockDePedido = async (items: PedidoItem[]) => {
    for (const item of items) {
      if (item.no_afectar_stock) continue // Si está marcado "no afectar stock", omitir

      const targetMaterialName = item.material || item.nombre
      const match = stockItems.find(s =>
        s.nombre.toLowerCase().includes(targetMaterialName.toLowerCase()) ||
        targetMaterialName.toLowerCase().includes(s.nombre.toLowerCase())
      )

      if (match) {
        const newCantidad = Math.max(0, Number(match.cantidad) - Number(item.cantidad))
        await supabase.from('stock').update({ cantidad: newCantidad }).eq('id', match.id)
      }
    }
  }

  const handleCambiarEstado = async (id: string, nuevoEstado: string, pedido: Pedido) => {
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar estado: ' + error.message)
      return
    }

    // Descontar stock si pasa de presupuesto a producción/aprobado
    if (nuevoEstado !== 'presupuesto' && nuevoEstado !== 'cancelado') {
      await descontarStockDePedido(pedido.items || [])
    }

    toast.success(`Estado actualizado a ${nuevoEstado}`)
    loadData()
  }

  const handleDeletePedido = async (id: string, numero: string) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido #${numero}?`)) return
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar pedido: ' + error.message)
      return
    }
    toast.success(`Pedido #${numero} eliminado`)
    loadData()
  }

  const openQuickClientModal = (defaultName = '') => {
    setQuickClientForm({
      nombre: defaultName,
      telefono: '',
      email: '',
      rut: '',
      tipo: 'regular',
    })
    setShowQuickClientModal(true)
  }

  const handleCrearQuickCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickClientForm.nombre.trim()) {
      toast.error('El nombre del cliente es obligatorio')
      return
    }

    const { data, error } = await supabase.from('clientes').insert(quickClientForm).select().single()
    if (error) {
      toast.error('Error al guardar cliente: ' + error.message)
      return
    }

    toast.success(`Cliente ${data.nombre} creado`)
    setSelectedCliente(data)
    setClienteSearch('')
    setShowClienteDropdown(false)
    setShowQuickClientModal(false)
    loadData()
  }

  const categorias = [...new Set(servicios.map(s => s.categoria))]

  const filteredServicios = servicios.filter(s => {
    if (categoriaFilter && s.categoria !== categoriaFilter) return false
    if (productSearch && !s.nombre.toLowerCase().includes(productSearch.toLowerCase())) return false
    return true
  })

  const filteredPedidos = pedidos.filter(p => {
    // 1. Estado
    if (historialFilter !== 'todos' && p.estado !== historialFilter) return false

    // 2. Método de pago
    if (historialMetodoPago && p.metodo_pago !== historialMetodoPago) return false

    // 3. Fechas desde / hasta
    const pDate = (p.created_at || '').substring(0, 10)
    if (historialFechaInicio && pDate < historialFechaInicio) return false
    if (historialFechaFin && pDate > historialFechaFin) return false

    // 4. Categoría de servicio / producto
    if (historialCategoria) {
      const hasCat = p.items?.some(it => {
        if (!it.producto_id) return historialCategoria === 'Especiales' || historialCategoria === 'Packaging'
        const srv = servicios.find(s => s.id === it.producto_id)
        return srv?.categoria === historialCategoria
      })
      if (!hasCat) return false
    }

    // 5. Búsqueda libre (Cliente, RUT, Teléfono, N° pedido, Notas, Productos)
    if (historialSearch.trim()) {
      const q = historialSearch.toLowerCase().trim()
      const matchNum = p.numero.toLowerCase().includes(q)
      const matchCliente = p.cliente_nombre?.toLowerCase().includes(q)
      const matchNotas = p.notas?.toLowerCase().includes(q)

      // Cliente cargado (RUT o Teléfono)
      const clt = clientes.find(c => c.id === p.cliente_id)
      const matchRut = clt?.rut?.toLowerCase().includes(q)
      const matchPhone = clt?.telefono?.toLowerCase().includes(q)

      // Ítems del pedido
      const matchItem = p.items?.some(it =>
        it.nombre.toLowerCase().includes(q) ||
        (it.material && it.material.toLowerCase().includes(q)) ||
        (it.medida && it.medida.toLowerCase().includes(q)) ||
        (it.acabado && it.acabado.toLowerCase().includes(q))
      )

      if (!matchNum && !matchCliente && !matchNotas && !matchRut && !matchPhone && !matchItem) {
        return false
      }
    }

    return true
  })

  const filteredClientes = clientes.filter(c => {
    const q = clienteSearch.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Pedidos & Presupuestos" subtitle="Gestión de trabajos de imprenta estándar y personalizados a medida" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`btn ${activeTab === 'nuevo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('nuevo')}
          >
            <ShoppingCart size={15} /> Nuevo Pedido / Presupuesto
          </button>
          <button
            className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('historial')}
          >
            <FileText size={15} /> Historial y Seguimiento
          </button>
        </div>

        {activeTab === 'nuevo' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

            {/* Catalog list */}
            <div>
              {/* Top Controls: Search + Botón Trabajo Personalizado A Medida */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    placeholder="Buscar producto en catálogo..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    style={{ paddingLeft: 34 }}
                  />
                </div>

                {/* BOTÓN TRABAJO PERSONALIZADO A MEDIDA */}
                <button
                  className="btn"
                  onClick={openAddCustomItemModal}
                  style={{
                    background: 'linear-gradient(135deg, #149b8e 0%, #f59e0b 100%)',
                    color: 'white',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(20, 155, 142, 0.25)',
                  }}
                >
                  <Sparkles size={15} /> ➕ Trabajo Especial / A Medida
                </button>
              </div>

              {/* Category Filter Chips */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className={`btn btn-sm ${!categoriaFilter ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaFilter('')}
                >
                  Todos
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${categoriaFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCategoriaFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Services Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>

                {/* Card para crear Trabajo a Medida rápido */}
                <div
                  className="card"
                  onClick={openAddCustomItemModal}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: '2px dashed var(--accent)',
                    background: 'rgba(20, 155, 142, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 20
                  }}
                >
                  <Sparkles size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Trabajo Personalizado</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Especificaciones únicas a medida</span>
                </div>

                {filteredServicios.map(srv => (
                  <div
                    key={srv.id}
                    className="card"
                    onClick={() => openAddItemModal(srv)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}
                  >
                    {srv.imagen_url && (
                      <div style={{ width: '100%', height: 100, borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'var(--bg-hover)' }}>
                        <img
                          src={srv.imagen_url}
                          alt={srv.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {srv.categoria}
                      </span>
                      {srv.es_tercerizado && (
                        <span className="badge badge-warning" style={{ fontSize: 9 }}>Tercerizado</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, marginBottom: 4 }}>
                      {srv.nombre}
                    </div>
                    {srv.descripcion && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {srv.descripcion}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {srv.tiempo_estimado ? `⏱ ${srv.tiempo_estimado}` : srv.unidad}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>
                        {formatCurrency(srv.precio_base)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>/{srv.unidad || 'u'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart sidebar */}
            <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>🛒 Pedido ({cart.length})</h3>
                <span className="badge badge-accent">{estadoPedido.toUpperCase()}</span>
              </div>

              {/* Estado selector */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Tipo / Estado inicial</label>
                <select className="input" value={estadoPedido} onChange={e => setEstadoPedido(e.target.value)}>
                  {ESTADOS_PEDIDO.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Client selector (Search by Name, Phone or RUT) */}
              <div className="form-group" style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Cliente</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--accent)', fontSize: 11, padding: '2px 6px', fontWeight: 700 }}
                    onClick={() => openQuickClientModal(clienteSearch)}
                  >
                    + Nuevo Cliente
                  </button>
                </div>
                <input
                  className="input"
                  placeholder="Buscar por Nombre, Teléfono o RUT..."
                  value={selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.rut ? `(RUT: ${selectedCliente.rut})` : ''}` : clienteSearch}
                  onChange={e => {
                    setClienteSearch(e.target.value)
                    setSelectedCliente(null)
                    setShowClienteDropdown(true)
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                />
                {selectedCliente && (
                  <button
                    onClick={() => { setSelectedCliente(null); setClienteSearch('') }}
                    style={{ position: 'absolute', right: 10, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
                {showClienteDropdown && (clienteSearch || filteredClientes.length > 0) && !selectedCliente && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                    borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {clienteSearch && (
                      <div
                        onClick={() => openQuickClientModal(clienteSearch)}
                        style={{
                          padding: '10px 12px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                          color: 'var(--accent)', background: 'var(--accent-muted)',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}
                      >
                        <Plus size={14} /> Crear "{clienteSearch}" como cliente nuevo
                      </div>
                    )}
                    {filteredClientes.slice(0, 6).map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCliente(c)
                          setClienteSearch('')
                          setShowClienteDropdown(false)
                        }}
                        style={{
                          padding: '8px 12px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong>{c.nombre}</strong>
                          {c.rut && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>RUT: {c.rut}</div>}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.telefono || c.tipo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                {cart.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <ShoppingCart size={24} />
                    <p style={{ fontSize: 12 }}>Seleccioná un producto o hacé clic en "Trabajo Especial"</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 8, background: 'var(--bg-hover)', borderRadius: 8,
                          border: '1px solid var(--border)', fontSize: 12
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{item.nombre}</span>
                          <span style={{ color: 'var(--accent)' }}>{formatCurrency(item.subtotal)}</span>
                        </div>
                        {(item.medida || item.material || item.acabado || item.no_afectar_stock) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {[
                              item.medida,
                              item.material,
                              item.acabado,
                              item.no_afectar_stock ? '🚫 No afecta stock' : null
                            ].filter(Boolean).join(' • ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            {item.cantidad} u × ${item.precio_unitario}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => updateCartQuantity(index, -1)}>-</button>
                            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => updateCartQuantity(index, 1)}>+</button>
                            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', color: 'var(--danger)' }} onClick={() => removeFromCart(index)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fecha Entrega */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Fecha Estimada de Entrega</label>
                <input
                  className="input"
                  type="date"
                  value={fechaEntrega}
                  onChange={e => setFechaEntrega(e.target.value)}
                />
              </div>

              {/* Descuento (%) & Adicional (%) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <label>Descuento (%)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0%"
                    value={descuentoPorcentaje === 0 ? '' : descuentoPorcentaje}
                    onChange={e => setDescuentoPorcentaje(e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>
                <div>
                  <label>Adicional (%)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0%"
                    value={adicionalPorcentaje === 0 ? '' : adicionalPorcentaje}
                    onChange={e => setAdicionalPorcentaje(e.target.value === '' ? 0 : Math.min(200, Math.max(0, Number(e.target.value))))}
                  />
                </div>
              </div>

              {/* Forma de Pago */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Forma de Pago</label>
                <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cuenta_corriente">Cta. Corriente</option>
                </select>
              </div>

              {/* Checkbox: Agregar IVA (22%) */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8,
                border: '1px solid var(--border)', marginBottom: 12
              }}>
                <label htmlFor="incluir_iva" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  🧾 Agregar IVA (+22%)
                </label>
                <input
                  type="checkbox"
                  id="incluir_iva"
                  checked={incluirIva}
                  onChange={e => setIncluirIva(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {descuentoPorcentaje > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--danger)' }}>
                    <span>Descuento ({descuentoPorcentaje}%)</span>
                    <span>-{formatCurrency(descuentoMonto)}</span>
                  </div>
                )}
                {adicionalPorcentaje > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                    <span>Adicional ({adicionalPorcentaje}%)</span>
                    <span>+{formatCurrency(adicionalMonto)}</span>
                  </div>
                )}
                {incluirIva && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--info)', fontWeight: 600, marginTop: 2 }}>
                    <span>IVA (22%)</span>
                    <span>+{formatCurrency(montoIva)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                  <span>TOTAL {incluirIva ? '(con IVA)' : ''}</span>
                  <span style={{ color: 'var(--accent)' }}>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontWeight: 700 }}
                onClick={handleCrearPedido}
              >
                <Check size={16} /> Confirmar Pedido
              </button>
            </div>
          </div>
        ) : (
          /* History tab */
          <div>
            {/* Filter Bar */}
            <div style={{
              background: 'var(--bg-card)', padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--border)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12
            }}>
              {/* Row 1: Search & Filters */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 2, minWidth: 240 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    placeholder="Buscar por cliente, RUT, N° pedido, producto..."
                    value={historialSearch}
                    onChange={e => setHistorialSearch(e.target.value)}
                    style={{ paddingLeft: 34 }}
                  />
                  {historialSearch && (
                    <button
                      onClick={() => setHistorialSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Desde:</span>
                  <input
                    className="input"
                    type="date"
                    value={historialFechaInicio}
                    onChange={e => setHistorialFechaInicio(e.target.value)}
                    style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Hasta:</span>
                  <input
                    className="input"
                    type="date"
                    value={historialFechaFin}
                    onChange={e => setHistorialFechaFin(e.target.value)}
                    style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
                  />
                </div>

                <div style={{ width: 150 }}>
                  <select
                    className="input"
                    value={historialMetodoPago}
                    onChange={e => setHistorialMetodoPago(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: 13 }}
                  >
                    <option value="">Medios de Pago</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cuenta_corriente">Cta. Corriente</option>
                  </select>
                </div>

                <div style={{ width: 160 }}>
                  <select
                    className="input"
                    value={historialCategoria}
                    onChange={e => setHistorialCategoria(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: 13 }}
                  >
                    <option value="">Todas las Categorías</option>
                    {CATEGORIAS_SERVICIO.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {(historialSearch || historialFechaInicio || historialFechaFin || historialCategoria || historialMetodoPago || historialFilter !== 'todos') && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setHistorialFilter('todos')
                      setHistorialSearch('')
                      setHistorialFechaInicio('')
                      setHistorialFechaFin('')
                      setHistorialCategoria('')
                      setHistorialMetodoPago('')
                    }}
                    style={{ fontSize: 12, color: 'var(--danger)' }}
                  >
                    ✕ Limpiar Filtros
                  </button>
                )}
              </div>

              {/* Row 2: Status Badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Estado:</span>
                <button
                  className={`btn btn-sm ${historialFilter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setHistorialFilter('todos')}
                >
                  Todos ({pedidos.length})
                </button>
                {ESTADOS_PEDIDO.map(e => {
                  const count = pedidos.filter(p => p.estado === e.value).length
                  return (
                    <button
                      key={e.value}
                      className={`btn btn-sm ${historialFilter === e.value ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setHistorialFilter(e.value)}
                    >
                      {e.label} ({count})
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>N° Pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Entrega Est.</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map(p => (
                    <tr key={p.id}>
                      <td><strong style={{ color: 'var(--accent)' }}>{p.numero}</strong></td>
                      <td>{formatDateTime(p.created_at || '')}</td>
                      <td>{p.cliente_nombre || 'Consumidor Final'}</td>
                      <td>
                        <select
                          className="input"
                          style={{ padding: '3px 8px', fontSize: 12, height: 'auto', width: 'auto' }}
                          value={p.estado}
                          onChange={e => handleCambiarEstado(p.id, e.target.value, p)}
                        >
                          {ESTADOS_PEDIDO.map(est => (
                            <option key={est.value} value={est.value}>{est.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{p.fecha_entrega ? formatDateTime(p.fecha_entrega) : '—'}</td>
                      <td><span className="badge badge-neutral">{p.metodo_pago}</span></td>
                      <td><strong>{formatCurrency(p.total)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: '#be185d', fontWeight: 600 }}
                            onClick={() => {
                              const matchClt = clientes.find(c => c.id === p.cliente_id)
                              setPdfData(p)
                              setShowPdfModal(true)
                            }}
                            title="Ver / Descargar Presupuesto PDF"
                          >
                            <FileText size={13} /> PDF
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--accent)' }}
                            onClick={() => handleRepetirPedidoDirecto(p)}
                            title="Repetir este pedido"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setTicketData(p); setShowTicket(true) }}
                            title="Imprimir ticket"
                          >
                            <Printer size={13} /> Ticket
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeletePedido(p.id, p.numero)}
                            title="Eliminar pedido"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPedidos.length === 0 && (
                <div className="empty-state">
                  <FileText size={32} />
                  <p>No hay pedidos en esta categoría</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item customization modal */}
        {showItemModal && (
          <div className="modal-backdrop" onClick={() => setShowItemModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                    {selectedServicio ? `Personalizar: ${selectedServicio.nombre}` : '✨ Trabajo Especial / A Medida'}
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {selectedServicio ? selectedServicio.categoria : 'Producto o servicio personalizado fuera de catálogo'}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowItemModal(false)}>✕</button>
              </div>
              <div className="modal-body">

                {/* Si no proviene del catálogo, se puede escribir el nombre exacto */}
                {!selectedServicio && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Nombre del Trabajo / Producto *</label>
                    <input
                      className="input"
                      placeholder="ej. Cartel Corpóreo 200x80cm / Folleto especial a medida"
                      value={itemCustomNombre}
                      onChange={e => setItemCustomNombre(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                )}

                {/* Tipo de Precio: Total del Lote o Unitario */}
                {!selectedServicio && (
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Tipo de Precio</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={`btn btn-sm ${itemPrecioEsTotal ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setItemPrecioEsTotal(true)}>
                        💰 Precio Total del Lote
                      </button>
                      <button type="button" className={`btn btn-sm ${!itemPrecioEsTotal ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setItemPrecioEsTotal(false)}>
                        📦 Precio por Unidad
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label>Cantidad ({selectedServicio?.unidad || 'unidades'}) *</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0"
                      value={itemCantidad === 0 ? '' : itemCantidad}
                      onChange={e => setItemCantidad(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{itemPrecioEsTotal ? 'Precio Total del Lote ($) *' : 'Precio Unitario ($) *'}</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      value={itemPrecioUnitario === 0 ? '' : itemPrecioUnitario}
                      onChange={e => setItemPrecioUnitario(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Medidas / Formato (ej. A4, 9x5 cm, 80x200cm)</label>
                  <input
                    className="input"
                    placeholder="ej. A4 (21 x 29.7 cm)"
                    value={itemMedida}
                    onChange={e => setItemMedida(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Material / Gramaje (ej. Couché 300g, Vinilo)</label>
                  <input
                    className="input"
                    placeholder="ej. Papel Ilustración 150g"
                    value={itemMaterial}
                    onChange={e => setItemMaterial(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Acabado / Terminación (ej. Laminado mate, Troquelado)</label>
                  <input
                    className="input"
                    placeholder="ej. Laminado Brillante Doble Faz"
                    value={itemAcabado}
                    onChange={e => setItemAcabado(e.target.value)}
                  />
                </div>

                {/* Checkbox: No Afectar Stock */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)',
                  marginBottom: 14
                }}>
                  <input
                    type="checkbox"
                    id="no_stock"
                    checked={itemNoAfectarStock}
                    onChange={e => setItemNoAfectarStock(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="no_stock" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: 13, fontWeight: 600 }}>
                    🚫 No afectar stock de inventario para este trabajo
                  </label>
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: 12, borderRadius: 8, textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itemPrecioEsTotal ? 'Total del lote:' : 'Subtotal calculado:'} </span>
                  <strong style={{ fontSize: 16, color: 'var(--accent)' }}>{formatCurrency(itemPrecioEsTotal ? itemPrecioUnitario : itemCantidad * itemPrecioUnitario)}</strong>
                  {itemPrecioEsTotal && itemCantidad > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Precio unitario calculado: {formatCurrency(Math.round((itemPrecioUnitario / itemCantidad) * 100) / 100)} c/u
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={addItemToCart}>Agregar al Pedido</button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Client Modal */}
        {showQuickClientModal && (
          <div className="modal-backdrop" onClick={() => setShowQuickClientModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>➕ Nuevo Cliente Rápido</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowQuickClientModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCrearQuickCliente}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nombre / Empresa *</label>
                    <input
                      className="input"
                      placeholder="ej. Juan Pérez / Imprenta SRL"
                      value={quickClientForm.nombre}
                      onChange={e => setQuickClientForm({ ...quickClientForm, nombre: e.target.value })}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Teléfono / WhatsApp</label>
                      <input
                        className="input"
                        placeholder="ej. 099 123 456"
                        value={quickClientForm.telefono}
                        onChange={e => setQuickClientForm({ ...quickClientForm, telefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Cliente</label>
                      <select
                        className="input"
                        value={quickClientForm.tipo}
                        onChange={e => setQuickClientForm({ ...quickClientForm, tipo: e.target.value })}
                      >
                        <option value="regular">Regular</option>
                        <option value="frecuente">Frecuente</option>
                        <option value="empresa">Empresa</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Email (Opcional)</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="ej. cliente@email.com"
                        value={quickClientForm.email}
                        onChange={e => setQuickClientForm({ ...quickClientForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>RUT (Opcional)</label>
                      <input
                        className="input"
                        placeholder="ej. 211234560012"
                        value={quickClientForm.rut}
                        onChange={e => setQuickClientForm({ ...quickClientForm, rut: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowQuickClientModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar y Seleccionar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {showTicket && ticketData && (
          <TicketImpresion
            ticket={{
              numero: ticketData.numero,
              fecha: new Date(ticketData.created_at || new Date()),
              items: (Array.isArray(ticketData.items) ? ticketData.items : []).map((item: any) => ({
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio || item.precio_unitario || 0,
              })),
              subtotal: ticketData.subtotal,
              descuento: ticketData.descuento || 0,
              descuentoPorcentaje: ticketData.descuento_porcentaje,
              total: ticketData.total,
              metodoPago: ticketData.metodo_pago || 'efectivo',
              clienteNombre: ticketData.cliente_nombre,
              clienteRut: clientes.find(c => c.id === ticketData.cliente_id || c.nombre === ticketData.cliente_nombre)?.rut,
              notas: ticketData.notas,
            }}
            onClose={() => setShowTicket(false)}
          />
        )}

        {/* Presupuesto PDF Modal */}
        {showPdfModal && pdfData && (
          <PresupuestoPDFModal
            pedido={pdfData}
            cliente={clientes.find(c => c.id === pdfData.cliente_id)}
            onClose={() => setShowPdfModal(false)}
          />
        )}
      </main>
    </>
  )
}
