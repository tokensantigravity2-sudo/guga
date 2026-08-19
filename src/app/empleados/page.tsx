'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Empleado } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, UserCheck, Phone, Mail, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null)

  const [form, setForm] = useState({
    nombre: '',
    cargo: 'Operador de Imprenta',
    telefono: '',
    email: '',
    salario: 0,
    fecha_ingreso: new Date().toISOString().split('T')[0],
    activo: true,
    notas: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data } = await supabase.from('empleados').select('*').order('nombre')
    if (data) setEmpleados(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('Nombre obligatorio'); return }

    if (editingEmpleado) {
      const { error } = await supabase.from('empleados').update(form).eq('id', editingEmpleado.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Empleado actualizado')
    } else {
      const { error } = await supabase.from('empleados').insert(form)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Empleado registrado')
    }

    closeModal()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar empleado?')) return
    await supabase.from('empleados').delete().eq('id', id)
    toast.success('Empleado eliminado')
    loadData()
  }

  const toggleActivo = async (emp: Empleado) => {
    await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id)
    toast.success(emp.activo ? 'Desactivado' : 'Activado')
    loadData()
  }

  const openEdit = (emp: Empleado) => {
    setEditingEmpleado(emp)
    setForm({
      nombre: emp.nombre,
      cargo: emp.cargo || 'Operador de Imprenta',
      telefono: emp.telefono || '',
      email: emp.email || '',
      salario: Number(emp.salario || 0),
      fecha_ingreso: emp.fecha_ingreso || new Date().toISOString().split('T')[0],
      activo: emp.activo !== false,
      notas: emp.notas || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEmpleado(null)
    setForm({
      nombre: '', cargo: 'Operador de Imprenta', telefono: '', email: '',
      salario: 0, fecha_ingreso: new Date().toISOString().split('T')[0], activo: true, notas: ''
    })
  }

  const filtered = empleados.filter(e => e.nombre.toLowerCase().includes(search.toLowerCase()))
  const totalSalarios = empleados.filter(e => e.activo !== false).reduce((sum, e) => sum + Number(e.salario || 0), 0)

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Empleados & Personal" subtitle="Equipo de trabajo de la imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar empleado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo Empleado
          </button>
        </div>

        {/* Total payroll card */}
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-muted)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Nómina Mensual Activa</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(totalSalarios)}</div>
            </div>
          </div>
          <span className="badge badge-accent">{empleados.filter(e => e.activo !== false).length} empleados activos</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(emp => (
            <div key={emp.id} className="card" style={{ opacity: emp.activo === false ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'var(--accent-muted)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{emp.nombre}</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.cargo || 'General'}</div>
                  </div>
                </div>
                <span className={`badge ${emp.activo !== false ? 'badge-success' : 'badge-danger'}`}>
                  {emp.activo !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, marginBottom: 14 }}>
                {emp.telefono && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <Phone size={13} style={{ color: 'var(--text-muted)' }} /> {emp.telefono}
                  </div>
                )}
                {emp.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {emp.email}
                  </div>
                )}
                {emp.fecha_ingreso && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} /> Ingreso: {formatDate(emp.fecha_ingreso)}
                  </div>
                )}
              </div>

              {emp.salario && (
                <div style={{ background: 'var(--bg-hover)', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salario mensual</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(emp.salario)}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(emp)}>
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  className={`btn btn-sm ${emp.activo !== false ? 'btn-ghost' : 'btn-success'}`}
                  onClick={() => toggleActivo(emp)}
                >
                  {emp.activo !== false ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <UserCheck size={32} />
            <p>Sin empleados registrados</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre Completo *</label>
                      <input
                        className="input"
                        placeholder="ej. Carlos Rodríguez"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Cargo / Función</label>
                      <select className="input" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>
                        <option value="Diseñador Gráfico">Diseñador Gráfico</option>
                        <option value="Operador de Imprenta">Operador de Imprenta</option>
                        <option value="Tallerista / Acabados">Tallerista / Acabados</option>
                        <option value="Ventas / Atención al Cliente">Ventas / Atención al Cliente</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        className="input"
                        placeholder="ej. 099 888 777"
                        value={form.telefono}
                        onChange={e => setForm({ ...form, telefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="ej. carlos@guga.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Salario Mensual ($)</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0"
                        value={form.salario === 0 ? '' : form.salario}
                        onChange={e => setForm({ ...form, salario: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha Ingreso</label>
                      <input
                        className="input"
                        type="date"
                        value={form.fecha_ingreso}
                        onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notas</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Horario, especialidad técnica..."
                      value={form.notas}
                      onChange={e => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingEmpleado ? 'Guardar Cambios' : 'Registrar Empleado'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
