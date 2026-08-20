'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Proveedor } from '@/lib/types'
import { formatCurrency, formatDate, getInitials } from '@/lib/helpers'
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [proveedorStats, setProveedorStats] = useState<Map<string, number>>(new Map())

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rubro: 'Papel',
    notas: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: provs, error: pErr }, { data: gastos }] = await Promise.all([
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('gastos').select('proveedor_id, monto'),
    ])

    if (pErr) toast.error('Error al cargar proveedores: ' + pErr.message)
    if (provs) setProveedores(provs)

    if (gastos) {
      const stats = new Map<string, number>()
      gastos.forEach(g => {
        if (g.proveedor_id) stats.set(g.proveedor_id, (stats.get(g.proveedor_id) || 0) + Number(g.monto))
      })
      setProveedorStats(stats)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('Nombre obligatorio'); return }

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      rubro: form.rubro || 'Papel',
      notas: form.notas.trim() || null,
    }

    if (editingProveedor) {
      const { error } = await supabase.from('proveedores').update(payload).eq('id', editingProveedor.id)
      if (error) { toast.error('Error al actualizar proveedor: ' + error.message); return }
      toast.success('Proveedor actualizado')
    } else {
      const { error } = await supabase.from('proveedores').insert(payload)
      if (error) { toast.error('Error al crear proveedor: ' + error.message); return }
      toast.success('Proveedor creado')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al proveedor "${nombre}"?`)) return
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    if (error) {
      toast.error('No se pudo eliminar (puede tener gastos o materiales vinculados): ' + error.message)
      return
    }
    toast.success('Proveedor eliminado')
    await loadData()
  }

  const openNewModal = () => {
    setEditingProveedor(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rubro: 'Papel', notas: '' })
    setShowModal(true)
  }

  const openEdit = (p: Proveedor) => {
    setEditingProveedor(p)
    setForm({
      nombre: p.nombre,
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      rubro: p.rubro || 'Papel',
      notas: p.notas || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProveedor(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rubro: 'Papel', notas: '' })
  }

  const filtered = proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Proveedores" subtitle="Proveedores de insumos y equipos de imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Rubro</th>
                <th>Total Compras</th>
                <th>Dirección</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--info-muted)', color: 'var(--info)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, flexShrink: 0
                      }}>
                        {getInitials(p.nombre)}
                      </div>
                      <div>
                        <strong>{p.nombre}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.telefono && (
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {p.telefono}
                      </div>
                    )}
                    {p.email && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={12} /> {p.email}
                      </div>
                    )}
                  </td>
                  <td><span className="badge badge-info">{p.rubro || 'General'}</span></td>
                  <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(proveedorStats.get(p.id) || 0)}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.direccion || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)} title="Editar proveedor">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar proveedor">
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
              <Package size={32} />
              <p>Sin proveedores registrados</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Proveedor *</label>
                      <input
                        className="input"
                        placeholder="ej. Papelera Central S.A."
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Rubro</label>
                      <select className="input" value={form.rubro} onChange={e => setForm({ ...form, rubro: e.target.value })}>
                        <option value="Papel">Papel / Cartulina</option>
                        <option value="Vinilo">Vinilos / Lonas</option>
                        <option value="Tintas">Tintas / Tóner</option>
                        <option value="Máquinas">Maquinaria / Repuestos</option>
                        <option value="Empaque">Empaque y Cajas</option>
                        <option value="Servicios">Servicios Tercerizados</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        className="input"
                        placeholder="ej. 2400 1234"
                        value={form.telefono}
                        onChange={e => setForm({ ...form, telefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="ej. ventas@papelera.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Dirección</label>
                    <input
                      className="input"
                      placeholder="ej. Av. Italia 5678"
                      value={form.direccion}
                      onChange={e => setForm({ ...form, direccion: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notas / Días de entrega</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Días de despacho, plazos de crédito..."
                      value={form.notas}
                      onChange={e => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
