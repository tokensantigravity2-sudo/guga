'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Cliente } from '@/lib/types'
import { formatCurrency, formatDate, getInitials } from '@/lib/helpers'
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Users, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [clienteStats, setClienteStats] = useState<Map<string, number>>(new Map())

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
      const statsMap = new Map<string, number>()
      pedidos.forEach(p => {
        if (p.cliente_id) {
          statsMap.set(p.cliente_id, (statsMap.get(p.cliente_id) || 0) + Number(p.total))
        }
      });
      setClienteStats(statsMap)
    }
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
      <Header title="Clientes" subtitle="Gestión de clientes y empresas" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar por nombre, tel, RUT..."
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
                <th>RUT</th>
                <th>Total Facturado</th>
                <th>Dirección</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--accent-muted)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, flexShrink: 0
                      }}>
                        {getInitials(c.nombre)}
                      </div>
                      <div>
                        <strong>{c.nombre}</strong>
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
                  <td>{c.rut || '—'}</td>
                  <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(clienteStats.get(c.id) || 0)}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.direccion || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)} title="Editar cliente">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id, c.nombre)} title="Eliminar cliente">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Users size={32} />
              <p>Sin clientes registrados</p>
            </div>
          )}
        </div>

        {/* Modal */}
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
      </main>
    </>
  )
}
