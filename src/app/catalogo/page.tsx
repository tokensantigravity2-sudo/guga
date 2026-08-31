'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio, Proveedor } from '@/lib/types'
import { formatCurrency, CATEGORIAS_SERVICIO } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, X, Printer, Check, Factory, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CatalogoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio_base: 0,
    categoria: 'Folletos',
    nuevaCategoria: '',
    unidad: 'unidad',
    tiempo_estimado: '2-3 días',
    disponible: true,
    imagen_url: '',
    es_tercerizado: false,
    proveedor_tercerizado_id: '',
    costo_tercerizado: 0,
  })

  useEffect(() => {
    loadServicios()
  }, [])

  const loadServicios = async () => {
    const [{ data, error }, { data: provs }] = await Promise.all([
      supabase.from('servicios').select('*').order('categoria').order('nombre'),
      supabase.from('proveedores').select('*').order('nombre')
    ])

    if (error) {
      toast.error('Error al cargar catálogo: ' + error.message)
    } else if (data) {
      setServicios(data)
    }
    if (provs) setProveedores(provs)
    setLoading(false)
  }

  const parseTercerizadoInfo = (srv: Servicio) => {
    let esTerc = !!srv.es_tercerizado
    let provId = srv.proveedor_tercerizado_id || ''
    let costo = Number(srv.costo_tercerizado || 0)
    let descLimpia = (srv.descripcion || '').replace(/\[TERCERIZADO:[\s\S]*?\]$/, '').trim()

    if ((srv.descripcion || '').includes('[TERCERIZADO:')) {
      esTerc = true
      const match = (srv.descripcion || '').match(/\[TERCERIZADO:(.*?):(.*?)]/)
      if (match) {
        provId = match[1] || provId
        costo = Number(match[2]) || costo
      }
    }
    return { esTerc, provId, costo, descLimpia }
  }

  const compressAndSetImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccioná un archivo de imagen válido')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 800

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82)
        setForm(prev => ({ ...prev, imagen_url: compressedBase64 }))
        toast.success('Imagen cargada correctamente')
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const syncServiceToProveedorPriceList = async (nombre: string, costo: number, unidad: string, proveedorId: string) => {
    if (!proveedorId || costo <= 0) return
    try {
      const { data: prov } = await supabase.from('proveedores').select('*').eq('id', proveedorId).single()
      if (!prov) return

      let priceList: any[] = prov.lista_precios || []
      if (priceList.length === 0 && prov.notas) {
        const match = prov.notas.match(/\[LISTA_PRECIOS:([\s\S]*?)\]$/)
        if (match) {
          try { priceList = JSON.parse(match[1]) } catch { priceList = [] }
        }
      }

      const existingIdx = priceList.findIndex(item => item.producto?.toLowerCase() === nombre.toLowerCase())
      if (existingIdx >= 0) {
        priceList[existingIdx].precio = costo
        priceList[existingIdx].unidad = unidad
      } else {
        priceList.push({
          id: Date.now().toString(),
          producto: nombre,
          precio: costo,
          unidad: unidad || 'unidad',
          notas: 'Catálogo Servicios',
        })
      }

      let { error } = await supabase.from('proveedores').update({ lista_precios: priceList }).eq('id', prov.id)
      if (error && (error.message.includes('column') || error.message.includes('schema'))) {
        const notasOriginales = (prov.notas || '').replace(/\[LISTA_PRECIOS:[\s\S]*?\]$/, '').trim()
        const notasStr = notasOriginales ? `${notasOriginales} [LISTA_PRECIOS:${JSON.stringify(priceList)}]` : `[LISTA_PRECIOS:${JSON.stringify(priceList)}]`
        await supabase.from('proveedores').update({ notas: notasStr }).eq('id', prov.id)
      }
    } catch (err) {
      console.error('Error al sincronizar precio con proveedor:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const catFinal = form.categoria === 'OTRO' ? (form.nuevaCategoria.trim() || 'General') : form.categoria

    const descClean = form.descripcion.replace(/\[TERCERIZADO:[\s\S]*?\]$/, '').trim()
    const descFinal = form.es_tercerizado
      ? (descClean ? `${descClean} [TERCERIZADO:${form.proveedor_tercerizado_id || ''}:${form.costo_tercerizado || 0}]` : `[TERCERIZADO:${form.proveedor_tercerizado_id || ''}:${form.costo_tercerizado || 0}]`)
      : descClean

    let payload: any = {
      nombre: form.nombre.trim(),
      descripcion: descFinal || null,
      precio_base: Number(form.precio_base) || 0,
      categoria: catFinal,
      unidad: form.unidad || 'unidad',
      tiempo_estimado: form.tiempo_estimado.trim() || null,
      disponible: form.disponible !== false,
      imagen_url: form.imagen_url?.trim() || null,
      es_tercerizado: form.es_tercerizado,
      proveedor_tercerizado_id: form.es_tercerizado ? (form.proveedor_tercerizado_id || null) : null,
      costo_tercerizado: form.es_tercerizado ? (Number(form.costo_tercerizado) || 0) : 0,
    }

    if (editingServicio) {
      let { error } = await supabase.from('servicios').update(payload).eq('id', editingServicio.id)
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.es_tercerizado
        delete payload.proveedor_tercerizado_id
        delete payload.costo_tercerizado
        const res = await supabase.from('servicios').update(payload).eq('id', editingServicio.id)
        error = res.error
      }
      if (error) { toast.error('Error al actualizar servicio: ' + error.message); return }
      toast.success('Servicio actualizado')
    } else {
      let { error } = await supabase.from('servicios').insert(payload)
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.es_tercerizado
        delete payload.proveedor_tercerizado_id
        delete payload.costo_tercerizado
        const res = await supabase.from('servicios').insert(payload)
        error = res.error
      }
      if (error) { toast.error('Error al crear servicio: ' + error.message); return }
      toast.success('Servicio creado')
    }

    if (form.es_tercerizado && form.proveedor_tercerizado_id && Number(form.costo_tercerizado) > 0) {
      await syncServiceToProveedorPriceList(
        form.nombre.trim(),
        Number(form.costo_tercerizado),
        form.unidad || 'unidad',
        form.proveedor_tercerizado_id
      )
    }

    closeModal()
    await loadServicios()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio "${nombre}"?`)) return

    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
      return
    }
    toast.success('Servicio eliminado')
    await loadServicios()
  }

  const toggleDisponible = async (srv: Servicio) => {
    const nextState = !srv.disponible
    const { error } = await supabase
      .from('servicios')
      .update({ disponible: nextState })
      .eq('id', srv.id)

    if (error) {
      toast.error('Error al cambiar disponibilidad: ' + error.message)
    } else {
      toast.success(nextState ? 'Servicio activado' : 'Servicio pausado')
      setServicios(prev => prev.map(s => s.id === srv.id ? { ...s, disponible: nextState } : s))
    }
  }

  const openNewModal = () => {
    setEditingServicio(null)
    setForm({
      nombre: '',
      descripcion: '',
      precio_base: 0,
      categoria: categoriaFilter || 'Folletos',
      nuevaCategoria: '',
      unidad: 'unidad',
      tiempo_estimado: '2-3 días',
      disponible: true,
      imagen_url: '',
      es_tercerizado: false,
      proveedor_tercerizado_id: '',
      costo_tercerizado: 0,
    })
    setShowModal(true)
  }

  const openEdit = (srv: Servicio) => {
    setEditingServicio(srv)
    const isStandardCat = CATEGORIAS_SERVICIO.includes(srv.categoria)
    const { esTerc, provId, costo, descLimpia } = parseTercerizadoInfo(srv)
    setForm({
      nombre: srv.nombre,
      descripcion: descLimpia,
      precio_base: Number(srv.precio_base || 0),
      categoria: isStandardCat ? srv.categoria : 'OTRO',
      nuevaCategoria: isStandardCat ? '' : srv.categoria,
      unidad: srv.unidad || 'unidad',
      tiempo_estimado: srv.tiempo_estimado || '2-3 días',
      disponible: srv.disponible !== false,
      imagen_url: srv.imagen_url || '',
      es_tercerizado: esTerc,
      proveedor_tercerizado_id: provId,
      costo_tercerizado: costo,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingServicio(null)
  }

  const filtered = servicios.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (categoriaFilter && s.categoria !== categoriaFilter) return false
    return true
  })

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Catálogo de Servicios" subtitle="Productos de imprenta propios y tercerizados" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar servicio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button
              className={`btn btn-sm ${!categoriaFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFilter('')}
            >
              Todos ({servicios.length})
            </button>
            {CATEGORIAS_SERVICIO.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${categoriaFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoriaFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Servicio
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Origen</th>
                <th>Categoría</th>
                <th>Precio Base</th>
                <th>Unidad</th>
                <th>Tiempo Est.</th>
                <th>Estado</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(srv => {
                const { esTerc, descLimpia } = parseTercerizadoInfo(srv)
                return (
                  <tr key={srv.id} style={{ opacity: srv.disponible ? 1 : 0.5 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {srv.imagen_url ? (
                          <img
                            src={srv.imagen_url}
                            alt={srv.nombre}
                            style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }}
                            onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                          />
                        ) : (
                          <div style={{
                            width: 42, height: 42, borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, fontSize: 18
                          }}>
                            🖼️
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: 14 }}>{srv.nombre}</strong>
                          {descLimpia && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              {descLimpia}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {esTerc ? (
                        <span className="badge badge-warning" style={{ gap: 4 }}>
                          <Factory size={10} /> Tercerizado
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ gap: 4 }}>
                          <Home size={10} /> Propio
                        </span>
                      )}
                    </td>
                  <td><span className="badge badge-accent">{srv.categoria}</span></td>
                  <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(srv.precio_base)}</strong></td>
                  <td>{srv.unidad || 'unidad'}</td>
                  <td>{srv.tiempo_estimado || '—'}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${srv.disponible ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => toggleDisponible(srv)}
                    >
                      {srv.disponible ? 'Activo' : 'Pausado'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(srv)} title="Editar servicio">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(srv.id, srv.nombre)} title="Eliminar servicio">
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
              <Printer size={32} />
              <p>Sin servicios en este filtro</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingServicio ? 'Editar Servicio' : 'Nuevo Servicio de Imprenta'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">

                  {/* Origen del Servicio: Propio vs Tercerizado */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Origen de Fabricación / Servicio</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${!form.es_tercerizado ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, es_tercerizado: false })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Home size={15} /> Imprenta Propia
                      </button>
                      <button
                        type="button"
                        className={`btn ${form.es_tercerizado ? 'btn-warning' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, es_tercerizado: true })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Factory size={15} /> Servicio Tercerizado
                      </button>
                    </div>
                  </div>

                  {form.es_tercerizado && (
                    <div className="form-grid" style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                      <div className="form-group">
                        <label>Taller / Proveedor Tercerizado</label>
                        <select
                          className="input"
                          value={form.proveedor_tercerizado_id}
                          onChange={e => setForm({ ...form, proveedor_tercerizado_id: e.target.value })}
                        >
                          <option value="">Seleccionar taller...</option>
                          {proveedores.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} {p.rubro ? `(${p.rubro})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Costo de Tercerización ($)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={form.costo_tercerizado === 0 ? '' : form.costo_tercerizado}
                          onChange={e => setForm({ ...form, costo_tercerizado: e.target.value === '' ? 0 : Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Servicio *</label>
                      <input
                        className="input"
                        placeholder="ej. Folletos A4 Full Color"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría</label>
                      <select
                        className="input"
                        value={form.categoria}
                        onChange={e => setForm({ ...form, categoria: e.target.value })}
                      >
                        {CATEGORIAS_SERVICIO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="OTRO">➕ Otra Categoría Personalizada...</option>
                      </select>
                    </div>
                  </div>

                  {form.categoria === 'OTRO' && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label>Escribir Nueva Categoría *</label>
                      <input
                        className="input"
                        placeholder="ej. Gigantografías / Sellos"
                        value={form.nuevaCategoria}
                        onChange={e => setForm({ ...form, nuevaCategoria: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60, resize: 'vertical' }}
                      placeholder="Detalles sobre papel, impresión, acabado predeterminado..."
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Precio Base de Venta ($)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.precio_base === 0 ? '' : form.precio_base}
                        onChange={e => setForm({ ...form, precio_base: e.target.value === '' ? 0 : Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Unidad de Medida</label>
                      <select
                        className="input"
                        value={form.unidad}
                        onChange={e => setForm({ ...form, unidad: e.target.value })}
                      >
                        <option value="unidad">Unidad</option>
                        <option value="metro cuadrado">Metro Cuadrado (m²)</option>
                        <option value="resma">Resma</option>
                        <option value="caja">Caja</option>
                        <option value="talonario">Talonario</option>
                        <option value="ciento">Ciento (100u)</option>
                        <option value="millar">Millar (1000u)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tiempo Estimado de Producción</label>
                    <input
                      className="input"
                      placeholder="ej. 2-3 días hábiles"
                      value={form.tiempo_estimado}
                      onChange={e => setForm({ ...form, tiempo_estimado: e.target.value })}
                    />
                  </div>

                  {/* Image Upload Area with Drag & Drop */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Imagen del Servicio (Cargar o Arrastrar archivo)</label>

                    <div
                      onDragOver={e => { e.preventDefault(); setIsDraggingImage(true) }}
                      onDragLeave={e => { e.preventDefault(); setIsDraggingImage(false) }}
                      onDrop={e => {
                        e.preventDefault()
                        setIsDraggingImage(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) compressAndSetImage(file)
                      }}
                      style={{
                        border: `2px dashed ${isDraggingImage ? 'var(--accent)' : 'var(--border)'}`,
                        background: isDraggingImage ? 'rgba(230, 0, 126, 0.05)' : 'var(--bg-hover)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8
                      }}
                      onClick={() => document.getElementById('image_file_input')?.click()}
                    >
                      <input
                        id="image_file_input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) compressAndSetImage(file)
                        }}
                      />

                      {form.imagen_url ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', justifyContent: 'center' }}>
                          <img
                            src={form.imagen_url}
                            alt="Vista previa"
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                          />
                          <div style={{ textAlign: 'left' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Imagen cargada</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hacé clic o arrastrá para cambiarla</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--danger)', marginLeft: 10 }}
                            onClick={e => {
                              e.stopPropagation()
                              setForm(prev => ({ ...prev, imagen_url: '' }))
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 24 }}>📁</div>
                          <div>
                            <strong style={{ fontSize: 13, color: 'var(--accent)' }}>Subir o arrastrar imagen aquí</strong>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Soporta JPG, PNG, WEBP de tu equipo</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingServicio ? 'Guardar Cambios' : 'Crear Servicio'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
