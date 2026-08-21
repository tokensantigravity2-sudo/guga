'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Cliente, Pedido } from '@/lib/types'
import { formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/helpers'
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Users, FileText, ShoppingBag, Printer, X } from 'lucide-react'
import toast from 'react-hot-toast'
import TicketImpresion from '@/components/TicketImpresion'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [clienteStats, setClienteStats] = useState<Map<string, { total: number; count: number }>>(new Map())

  // Historial drawer state
  const [selectedClienteHistory, setSelectedClienteHistory] = useState<Cliente | null>(null)
  const [historialPedidos, setHistorialPedidos] = useState<Pedido[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Ticket state
  const [showTicket, setShowTicket] = useState(false)
  const [ticketData, setTicketData] = useState<Pedido | null>(null)

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rut: '',
    notas: '',
    tipo: 'regular',
  })

  useEffect(() => {
    loadClientes()
    loadClienteStats()
  }, [])

  const loadClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar clientes: ' + error.message)
    if (data) setClientes(data)
    setLoading(false)
  }

  const loadClienteStats = async () => {
    const { data: pedidos } = await supabase.from('pedidos').select('cliente_id, total').not('estado', 'eq', 'cancelado')
    if (pedidos) {
      const statsMap = new Map<string, { total: number; count: number }>()
      pedidos.forEach(p => {
        if (p.cliente_id) {
          const prev = statsMap.get(p.cliente_id) || { total: 0, count: 0 }
          statsMap.set(p.cliente_id, { total: prev.total + Number(p.total), count: prev.count + 1 })
        }
      });
      setClienteStats(statsMap)
    }
  }

  const openHistory = async (cliente: Cliente) => {
    setSelectedClienteHistory(cliente)
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    if (error) toast.error('Error al cargar historial: ' + error.message)
    if (data) setHistorialPedidos(data)
    setLoadingHistory(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      rut: form.rut.trim() || null,
      notas: form.notas.trim() || null,
      tipo: form.tipo || 'regular',
    }

    if (editingCliente) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editingCliente.id)
      if (error) { toast.error('Error al actualizar cliente: ' + error.message); return }
      toast.success('Cliente actualizado')
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) { toast.error('Error al registrar cliente: ' + error.message); return }
      toast.success('Cliente creado')
    }

    closeModal()
    await loadClientes()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al cliente "${nombre}"?`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) {
      toast.error('No se pudo eliminar el cliente (puede tener pedidos asociados): ' + error.message)
      return
    }
    toast.success('Cliente eliminado')
    await loadClientes()
  }

  const openNewModal = () => {
    setEditingCliente(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rut: '', notas: '', tipo: 'regular' })
    setShowModal(true)
  }

  const openEdit = (c: Cliente) => {
    setEditingCliente(c)
    setForm({
      nombre: c.nombre,
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      rut: c.rut || '',
      notas: c.notas || '',
      tipo: c.tipo || 'regular',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCliente(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rut: '', notas: '', tipo: 'regular' })
  }

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.rut?.toLowerCase().includes(search.toLowerCase())
  )

  const getTipoBadge = (tipo?: string) => {
    switch (tipo) {
      case 'empresa': return 'badge-accent'
      case 'vip': return 'badge-warning'
      case 'frecuente': return 'badge-success'
      default: return 'badge-neutral'
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Clientes" subtitle="Gestión de clientes y empresas con historial" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 340 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar por Nombre, Teléfono o RUT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Tipo</th>
                <th>RUT / Doc</th>
                <th>Pedidos</th>
                <th>Total Facturado</th>
                <th>Dirección</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const stats = clienteStats.get(c.id) || { total: 0, count: 0 }
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => openHistory(c)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'var(--accent-muted)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>
                          {getInitials(c.nombre)}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{c.nombre}</strong>
                          {c.created_at && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Reg: {formatDate(c.created_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.telefono && (
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {c.telefono}
                        </div>
                      )}
                      {c.email && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} /> {c.email}
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${getTipoBadge(c.tipo)}`}>{c.tipo || 'regular'}</span></td>
                    <td><strong>{c.rut || '—'}</strong></td>
                    <td><span className="badge badge-neutral">{stats.count} pedidos</span></td>
                    <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(stats.total)}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.direccion || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openHistory(c)} title="Ver Historial de Pedidos">
                          <ShoppingBag size={13} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)} title="Editar cliente">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id, c.nombre)} title="Eliminar cliente">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Users size={32} />
              <p>Sin clientes registrados</p>
            </div>
          )}
        </div>

        {/* Modal Historial Completo de Compras */}
        {selectedClienteHistory && (
          <div className="modal-backdrop" onClick={() => setSelectedClienteHistory(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700 }}>📜 Historial de Pedidos</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {selectedClienteHistory.nombre} {selectedClienteHistory.rut ? `(RUT: ${selectedClienteHistory.rut})` : ''}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClienteHistory(null)}>✕</button>
              </div>
              <div className="modal-body">
                {loadingHistory ? (
                  <div className="spinner" style={{ margin: '30px auto' }} />
                ) : historialPedidos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {historialPedidos.map(p => (
                      <div key={p.id} style={{
                        padding: 14, background: 'var(--bg-hover)', borderRadius: 10,
                        border: '1px solid var(--border)', fontSize: 13
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong style={{ color: 'var(--accent)', fontSize: 14 }}>Pedido #{p.numero}</strong>
                          <span className="badge badge-neutral">{p.estado?.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          Fecha: {formatDateTime(p.created_at || '')} • Pago: {p.metodo_pago}
                        </div>

                        {/* Items list */}
                        <div style={{ background: 'var(--bg-card)', padding: 8, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8 }}>
                          {(p.items || []).map((it: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                              <span>{it.cantidad}x {it.nombre} {[it.medida, it.material, it.acabado].filter(Boolean).join(' ')}</span>
                              <strong>{formatCurrency(it.subtotal || (it.cantidad * (it.precio_unitario || it.precio || 0)))}</strong>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>TOTAL: {formatCurrency(p.total)}</span>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setTicketData(p); setShowTicket(true) }}
                          >
                            <Printer size={13} /> Imprimir Ticket
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 30 }}>
                    <FileText size={32} />
                    <p>Este cliente aún no tiene pedidos registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Edit / Create */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre / Razón Social *</label>
                      <input
                        className="input"
                        placeholder="ej. Juan Pérez / Empresa SRL"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Cliente</label>
                      <select className="input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                        <option value="regular">Regular</option>
                        <option value="frecuente">Frecuente</option>
                        <option value="empresa">Empresa</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Teléfono / WhatsApp</label>
                      <input
                        className="input"
                        placeholder="ej. 099 123 456"
                        value={form.telefono}
                        onChange={e => setForm({ ...form, telefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="ej. cliente@email.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>RUT / Documento</label>
                      <input
                        className="input"
                        placeholder="ej. 211234560012"
                        value={form.rut}
                        onChange={e => setForm({ ...form, rut: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Dirección</label>
                      <input
                        className="input"
                        placeholder="ej. Av. Principal 1234"
                        value={form.direccion}
                        onChange={e => setForm({ ...form, direccion: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notas u Observaciones</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Preferencias de entrega, condiciones de pago..."
                      value={form.notas}
                      onChange={e => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingCliente ? 'Guardar Cambios' : 'Crear Cliente'}</button>
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
              clienteRut: selectedClienteHistory?.rut || clientes.find(c => c.id === ticketData.cliente_id || c.nombre === ticketData.cliente_nombre)?.rut,
              notas: ticketData.notas,
            }}
            onClose={() => setShowTicket(false)}
          />
        )}
      </main>
    </>
  )
}
