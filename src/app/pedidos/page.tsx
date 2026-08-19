'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio, Cliente, PedidoItem, Pedido } from '@/lib/types'
import { formatCurrency, formatDateTime, generateNumeroPedido, ESTADOS_PEDIDO } from '@/lib/helpers'
import {
  Plus, Minus, ShoppingCart, Search, X, Trash2,
  CreditCard, Banknote, ArrowLeftRight, Printer,
  Check, FileText, Calendar, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import TicketImpresion from '@/components/TicketImpresion'

export default function PedidosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('nuevo')

  // New order state
  const [cart, setCart] = useState<PedidoItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [descuento, setDescuento] = useState(0)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [estadoPedido, setEstadoPedido] = useState('presupuesto')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Item customization modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [itemMedida, setItemMedida] = useState('')
  const [itemMaterial, setItemMaterial] = useState('')
  const [itemAcabado, setItemAcabado] = useState('')
  const [itemCantidad, setItemCantidad] = useState(100)
  const [itemPrecioUnitario, setItemPrecioUnitario] = useState(0)

  // Ticket state
  const [showTicket, setShowTicket] = useState(false)
  const [ticketData, setTicketData] = useState<Pedido | null>(null)

  // History filter
  const [historialFilter, setHistorialFilter] = useState('todos')

  // Quick Client creation modal state
  const [showQuickClientModal, setShowQuickClientModal] = useState(false)
  const [quickClientForm, setQuickClientForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    rut: '',
    tipo: 'regular',
  })

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
      toast.error('Error al guardar cliente')
      return
    }

    toast.success(`Cliente ${data.nombre} creado`)
    setSelectedCliente(data)
    setClienteSearch('')
    setShowClienteDropdown(false)
    setShowQuickClientModal(false)
    loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: srvs }, { data: clts }, { data: pds }] = await Promise.all([
      supabase.from('servicios').select('*').eq('disponible', true).order('categoria'),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    if (srvs) setServicios(srvs)
    if (clts) setClientes(clts)
    if (pds) setPedidos(pds)
    setLoading(false)
  }

  const openAddItemModal = (servicio: Servicio) => {
    setSelectedServicio(servicio)
    setItemPrecioUnitario(Number(servicio.precio_base))
    setItemCantidad(100)
    setItemMedida('')
    setItemMaterial('')
    setItemAcabado('')
    setShowItemModal(true)
  }

  const addItemToCart = () => {
    if (!selectedServicio) return
    const subtotal = itemCantidad * itemPrecioUnitario
    const newItem: PedidoItem = {
      producto_id: selectedServicio.id,
      nombre: selectedServicio.nombre,
      cantidad: itemCantidad,
      precio_unitario: itemPrecioUnitario,
      subtotal,
      medida: itemMedida || undefined,
      material: itemMaterial || undefined,
      acabado: itemAcabado || undefined,
    }

    setCart(prev => [...prev, newItem])
    setShowItemModal(false)
    toast.success(`${selectedServicio.nombre} agregado al pedido`)
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
  const total = Math.max(0, subtotal - descuento)

  const handleCrearPedido = async () => {
    if (cart.length === 0) {
      toast.error('Agregá servicios al pedido')
      return
    }

    const numero = generateNumeroPedido()
    const pedidoData = {
      numero,
      cliente_id: selectedCliente?.id || null,
      cliente_nombre: selectedCliente?.nombre || 'Consumidor Final',
      items: cart,
      subtotal,
      descuento,
      total,
      metodo_pago: metodoPago,
      estado: estadoPedido,
      fecha_entrega: fechaEntrega || null,
      notas: notas || null,
    }

    const { data, error } = await supabase.from('pedidos').insert(pedidoData).select().single()

    if (error) {
      toast.error('Error al registrar pedido')
      console.error(error)
      return
    }

    // Register cash movement if completed or paid
    if (estadoPedido === 'terminado' || estadoPedido === 'entregado' || metodoPago !== 'cuenta_corriente') {
      await supabase.from('caja_movimientos').insert({
        tipo: 'ingreso',
        monto: total,
        concepto: `Pedido #${numero} - ${selectedCliente?.nombre || 'Consumidor Final'}`,
        referencia_id: data.id,
      })
    }

    toast.success('¡Pedido registrado con éxito!')
    setTicketData(data)
    setShowTicket(true)

    // Reset
    setCart([])
    setSelectedCliente(null)
    setDescuento(0)
    setNotas('')
    setFechaEntrega('')
    loadData()
  }

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar estado')
      return
    }
    toast.success(`Estado actualizado a ${nuevoEstado}`)
    loadData()
  }

  const categorias = [...new Set(servicios.map(s => s.categoria))]

  const filteredServicios = servicios.filter(s => {
    if (categoriaFilter && s.categoria !== categoriaFilter) return false
    if (productSearch && !s.nombre.toLowerCase().includes(productSearch.toLowerCase())) return false
    return true
  })

  const filteredPedidos = pedidos.filter(p => {
    if (historialFilter === 'todos') return true
    return p.estado === historialFilter
  })

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(clienteSearch.toLowerCase())
  )

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Pedidos & Presupuestos" subtitle="Gestión de trabajos de imprenta" />
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
              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    placeholder="Buscar servicio..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    style={{ paddingLeft: 34 }}
                  />
                </div>
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
                {filteredServicios.map(srv => (
                  <div
                    key={srv.id}
                    className="card"
                    onClick={() => openAddItemModal(srv)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {srv.categoria}
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

              {/* Client selector */}
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
                  placeholder="Buscar o escribir cliente..."
                  value={selectedCliente ? selectedCliente.nombre : clienteSearch}
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
                    {filteredClientes.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCliente(c)
                          setClienteSearch('')
                          setShowClienteDropdown(false)
                        }}
                        style={{
                          padding: '8px 12px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between'
                        }}
                      >
                        <strong>{c.nombre}</strong>
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
                    <p style={{ fontSize: 12 }}>Haz clic en un servicio para agregarlo</p>
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
                        {(item.medida || item.material || item.acabado) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {[item.medida, item.material, item.acabado].filter(Boolean).join(' • ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            {item.cantidad} u × ${item.precio_unitario}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => updateCartQuantity(index, -10)}>-</button>
                            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }} onClick={() => updateCartQuantity(index, 10)}>+</button>
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

              {/* Descuento & Notas */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Descuento ($)</label>
                  <input
                    className="input"
                    type="number"
                    value={descuento === 0 ? '' : descuento}
                    placeholder="0"
                    onChange={e => setDescuento(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Forma de Pago</label>
                  <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cuenta_corriente">Cta. Corriente</option>
                  </select>
                </div>
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {descuento > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--danger)' }}>
                    <span>Descuento</span>
                    <span>-{formatCurrency(descuento)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                  <span>TOTAL</span>
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${historialFilter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHistorialFilter('todos')}
              >
                Todos
              </button>
              {ESTADOS_PEDIDO.map(e => (
                <button
                  key={e.value}
                  className={`btn btn-sm ${historialFilter === e.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setHistorialFilter(e.value)}
                >
                  {e.label}
                </button>
              ))}
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
                          onChange={e => handleCambiarEstado(p.id, e.target.value)}
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
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setTicketData(p); setShowTicket(true) }}
                        >
                          <Printer size={13} /> Ticket
                        </button>
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
        {showItemModal && selectedServicio && (
          <div className="modal-backdrop" onClick={() => setShowItemModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>Personalizar Servicio</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedServicio.nombre}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowItemModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Cantidad ({selectedServicio.unidad || 'u'})</label>
                    <input
                      className="input"
                      type="number"
                      value={itemCantidad === 0 ? '' : itemCantidad}
                      placeholder="0"
                      onChange={e => setItemCantidad(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Precio Unitario ($)</label>
                    <input
                      className="input"
                      type="number"
                      value={itemPrecioUnitario === 0 ? '' : itemPrecioUnitario}
                      placeholder="0.00"
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

                <div style={{ background: 'var(--bg-hover)', padding: 12, borderRadius: 8, textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subtotal calculado: </span>
                  <strong style={{ fontSize: 16, color: 'var(--accent)' }}>{formatCurrency(itemCantidad * itemPrecioUnitario)}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={addItemToCart}>Agregar al Pedido</button>
              </div>
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
              total: ticketData.total,
              metodoPago: ticketData.metodo_pago || 'efectivo',
              clienteNombre: ticketData.cliente_nombre,
              notas: ticketData.notas,
            }}
            onClose={() => setShowTicket(false)}
          />
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
      </main>
    </>
  )
}
