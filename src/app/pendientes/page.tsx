'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Tarea, Nota } from '@/lib/types'
import { formatDate } from '@/lib/helpers'
import {
  Plus, CheckSquare, Square, Trash2, Edit2, Lightbulb,
  Check, Filter, Calendar, Tag, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PendientesPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tareas' | 'notas'>('tareas')

  // Task filter
  const [taskFilter, setTaskFilter] = useState<'todos' | 'pendientes' | 'completadas'>('pendientes')

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  // Task form
  const [taskForm, setTaskForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta',
    fecha_vencimiento: '',
  })

  // Note form
  const [noteForm, setNoteForm] = useState({
    titulo: '',
    contenido: '',
    color: '#fef08a',
    categoria: 'Idea',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: t }, { data: n }] = await Promise.all([
      supabase.from('tareas').select('*').order('created_at', { ascending: false }),
      supabase.from('notas').select('*').order('created_at', { ascending: false }),
    ])
    if (t) setTareas(t)
    if (n) setNotas(n)
    setLoading(false)
  }

  // Handle task submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.titulo.trim()) { toast.error('Título obligatorio'); return }

    const { error } = await supabase.from('tareas').insert({
      titulo: taskForm.titulo,
      descripcion: taskForm.descripcion || null,
      prioridad: taskForm.prioridad,
      fecha_vencimiento: taskForm.fecha_vencimiento || null,
      completada: false,
    })

    if (error) { toast.error('Error al crear tarea'); return }
    toast.success('Tarea agregada')
    setShowTaskModal(false)
    setTaskForm({ titulo: '', descripcion: '', prioridad: 'media', fecha_vencimiento: '' })
    loadData()
  }

  // Toggle task completion
  const toggleTaskCompleted = async (tarea: Tarea) => {
    const newStatus = !tarea.completada
    const { error } = await supabase.from('tareas').update({ completada: newStatus }).eq('id', tarea.id)
    if (!error) {
      toast.success(newStatus ? 'Tarea completada ✓' : 'Tarea marcada como pendiente')
      loadData()
    }
  }

  // Delete task
  const deleteTask = async (id: string) => {
    await supabase.from('tareas').delete().eq('id', id)
    toast.success('Tarea eliminada')
    loadData()
  }

  // Handle note submission
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteForm.titulo.trim() || !noteForm.contenido.trim()) {
      toast.error('Título y contenido son obligatorios')
      return
    }

    const { error } = await supabase.from('notas').insert(noteForm)
    if (error) { toast.error('Error al guardar nota'); return }
    toast.success('Nota guardada')
    setShowNoteModal(false)
    setNoteForm({ titulo: '', contenido: '', color: '#fef08a', categoria: 'Idea' })
    loadData()
  }

  // Delete note
  const deleteNote = async (id: string) => {
    await supabase.from('notas').delete().eq('id', id)
    toast.success('Nota eliminada')
    loadData()
  }

  const filteredTareas = tareas.filter(t => {
    if (taskFilter === 'pendientes') return !t.completada
    if (taskFilter === 'completadas') return t.completada
    return true
  })

  const pendientesCount = tareas.filter(t => !t.completada).length

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Notas, Tips & Pendientes" subtitle="Organizador rápido de tareas e ideas para la imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Top bar with tabs & actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${activeTab === 'tareas' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('tareas')}
            >
              <CheckSquare size={15} /> Tareas & Pendientes ({pendientesCount})
            </button>
            <button
              className={`btn ${activeTab === 'notas' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('notas')}
            >
              <Lightbulb size={15} /> Notas & Tips ({notas.length})
            </button>
          </div>

          {activeTab === 'tareas' ? (
            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
              <Plus size={16} /> Nueva Tarea
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowNoteModal(true)}>
              <Plus size={16} /> Nueva Nota
            </button>
          )}
        </div>

        {activeTab === 'tareas' ? (
          /* TAREAS SECTION */
          <div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn btn-sm ${taskFilter === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTaskFilter('pendientes')}
              >
                Pendientes ({pendientesCount})
              </button>
              <button
                className={`btn btn-sm ${taskFilter === 'completadas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTaskFilter('completadas')}
              >
                Completadas ({tareas.filter(t => t.completada).length})
              </button>
              <button
                className={`btn btn-sm ${taskFilter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTaskFilter('todos')}
              >
                Todas ({tareas.length})
              </button>
            </div>

            {/* Task list */}
            <div className="card">
              {filteredTareas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredTareas.map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: t.completada ? 'var(--bg-input)' : 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        opacity: t.completada ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <button
                          onClick={() => toggleTaskCompleted(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.completada ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          {t.completada ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: t.completada ? 'line-through' : 'none',
                          }}>
                            {t.titulo}
                          </div>
                          {t.descripcion && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              {t.descripcion}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {t.fecha_vencimiento && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> {formatDate(t.fecha_vencimiento)}
                          </span>
                        )}
                        <span className={`badge ${
                          t.prioridad === 'alta' ? 'badge-danger' : t.prioridad === 'media' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {t.prioridad || 'media'}
                        </span>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => deleteTask(t.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <CheckSquare size={32} />
                  <p>Sin tareas en este filtro</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NOTAS SECTION */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {notas.map(n => (
                <div
                  key={n.id}
                  style={{
                    background: n.color || '#fef08a',
                    color: '#0f172a',
                    padding: 18,
                    borderRadius: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 160,
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <strong style={{ fontSize: 15, fontWeight: 800 }}>{n.titulo}</strong>
                      <button
                        onClick={() => deleteNote(n.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 2 }}
                        title="Eliminar nota"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {n.contenido}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: 11, opacity: 0.8 }}>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {n.categoria || 'Idea'}
                    </span>
                    {n.created_at && (
                      <span>{formatDate(n.created_at)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {notas.length === 0 && (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                <Lightbulb size={32} />
                <p>No hay notas grabadas. Escribí tu primera idea o tip arriba.</p>
              </div>
            )}
          </div>
        )}

        {/* Task Modal */}
        {showTaskModal && (
          <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h2>Nueva Tarea / Pendiente</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowTaskModal(false)}>✕</button>
              </div>
              <form onSubmit={handleTaskSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Título de la Tarea *</label>
                    <input
                      className="input"
                      placeholder="ej. Comprar tóner negro / Llamar a cliente X"
                      value={taskForm.titulo}
                      onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Descripción / Detalle</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Detalles adicionales..."
                      value={taskForm.descripcion}
                      onChange={e => setTaskForm({ ...taskForm, descripcion: e.target.value })}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Prioridad</label>
                      <select
                        className="input"
                        value={taskForm.prioridad}
                        onChange={e => setTaskForm({ ...taskForm, prioridad: e.target.value as any })}
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha Límite</label>
                      <input
                        className="input"
                        type="date"
                        value={taskForm.fecha_vencimiento}
                        onChange={e => setTaskForm({ ...taskForm, fecha_vencimiento: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Agregar Tarea</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Note Modal */}
        {showNoteModal && (
          <div className="modal-backdrop" onClick={() => setShowNoteModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h2>Nueva Nota / Idea</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteModal(false)}>✕</button>
              </div>
              <form onSubmit={handleNoteSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Título *</label>
                    <input
                      className="input"
                      placeholder="ej. Tip de troquelado / Idea promo folletos"
                      value={noteForm.titulo}
                      onChange={e => setNoteForm({ ...noteForm, titulo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contenido *</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 90 }}
                      placeholder="Escribí aquí tus notas o recordatorios..."
                      value={noteForm.contenido}
                      onChange={e => setNoteForm({ ...noteForm, contenido: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select
                        className="input"
                        value={noteForm.categoria}
                        onChange={e => setNoteForm({ ...noteForm, categoria: e.target.value })}
                      >
                        <option value="Idea">Idea</option>
                        <option value="Tip">Tip Téchnico</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Recordatorio">Recordatorio</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Color de la Nota</label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {[
                          { name: 'Amarillo', value: '#fef08a' },
                          { name: 'Azul', value: '#bfdbfe' },
                          { name: 'Verde', value: '#bbf7d0' },
                          { name: 'Rosa', value: '#fbcfe8' },
                        ].map(c => (
                          <div
                            key={c.value}
                            onClick={() => setNoteForm({ ...noteForm, color: c.value })}
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: c.value, cursor: 'pointer',
                              border: noteForm.color === c.value ? '2px solid var(--text-primary)' : '1px solid var(--border)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Nota</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
