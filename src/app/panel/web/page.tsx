'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { CONTENIDO_WEB, ContenidoWeb, ICONOS_SERVICIO, combinarContenidoWeb } from '@/lib/contenidoWeb'
import { leerConfig, guardarConfig, esTablaFaltante } from '@/lib/configTienda'
import { ExternalLink, Plus, Trash2, ArrowUp, ArrowDown, Upload, Save, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

type Ruta = (string | number)[]

// Copia el objeto cambiando solo el valor de la ruta indicada
const conValor = (obj: any, ruta: Ruta, valor: any): any => {
  if (ruta.length === 0) return valor
  const [clave, ...resto] = ruta
  const copia = Array.isArray(obj) ? [...obj] : { ...obj }
  copia[clave as any] = conValor(obj?.[clave as any], resto, valor)
  return copia
}

// Sin la nube de archivos configurada, la imagen se guarda comprimida dentro de la configuración
const comprimirImagen = (archivo: File, maximo = 1400): Promise<string> => new Promise((resolver, rechazar) => {
  const lector = new FileReader()
  lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'))
  lector.onload = () => {
    const img = new Image()
    img.onerror = () => rechazar(new Error('Archivo de imagen inválido'))
    img.onload = () => {
      const escala = Math.min(1, maximo / Math.max(img.width, img.height))
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.round(img.width * escala)
      lienzo.height = Math.round(img.height * escala)
      lienzo.getContext('2d')?.drawImage(img, 0, 0, lienzo.width, lienzo.height)
      const esPng = archivo.type === 'image/png'
      resolver(lienzo.toDataURL(esPng ? 'image/png' : 'image/jpeg', 0.82))
    }
    img.src = lector.result as string
  }
  lector.readAsDataURL(archivo)
})

const subirImagen = async (archivo: File): Promise<string> => {
  try {
    const datos = new FormData()
    datos.append('file', archivo)
    datos.append('folder', 'web')
    const res = await fetch('/api/upload', { method: 'POST', body: datos })
    const json = await res.json()
    if (res.ok && json.url) return json.url
    throw new Error(json.error || 'Error al subir')
  } catch {
    return comprimirImagen(archivo)
  }
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{titulo}</h3>
        {descripcion && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>{descripcion}</p>}
      </div>
      {children}
    </div>
  )
}

function Campo({ etiqueta, valor, onChange, largo = false, ayuda }: { etiqueta: string; valor: string; onChange: (v: string) => void; largo?: boolean; ayuda?: string }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label>{etiqueta}</label>
      {largo
        ? <textarea className="input" rows={3} value={valor} onChange={e => onChange(e.target.value)} style={{ resize: 'vertical' }} />
        : <input className="input" value={valor} onChange={e => onChange(e.target.value)} />}
      {ayuda && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{ayuda}</div>}
    </div>
  )
}

function CampoImagen({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (v: string) => void }) {
  const [subiendo, setSubiendo] = useState(false)
  const elegir = async (archivo?: File) => {
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) {
      toast.error('Elegí un archivo de imagen')
      return
    }
    setSubiendo(true)
    try {
      onChange(await subirImagen(archivo))
      toast.success('Imagen cargada. Acordate de guardar.')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo cargar la imagen')
    } finally {
      setSubiendo(false)
    }
  }
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label>{etiqueta}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 84, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', flexShrink: 0 }}>
          {valor && <img src={valor} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', cursor: 'pointer', margin: 0 }}>
            <Upload size={13} /> {subiendo ? 'Subiendo...' : 'Subir desde la compu'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => elegir(e.target.files?.[0])} />
          </label>
          <input className="input" placeholder="o pegá el link de una imagen" value={valor.startsWith('data:') ? '' : valor} onChange={e => onChange(e.target.value)} style={{ fontSize: 12 }} />
        </div>
      </div>
    </div>
  )
}

function BotonesItem({ indice, total, onMover, onQuitar }: { indice: number; total: number; onMover: (d: number) => void; onQuitar: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button type="button" className="btn btn-sm btn-ghost" disabled={indice === 0} onClick={() => onMover(-1)} title="Subir"><ArrowUp size={13} /></button>
      <button type="button" className="btn btn-sm btn-ghost" disabled={indice === total - 1} onClick={() => onMover(1)} title="Bajar"><ArrowDown size={13} /></button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onQuitar} title="Quitar" style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
    </div>
  )
}

const mover = <T,>(lista: T[], i: number, d: number) => {
  const copia = [...lista]
  const j = i + d
  if (j < 0 || j >= copia.length) return copia
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

export default function PaginaWebPanel() {
  const [c, setC] = useState<ContenidoWeb>(CONTENIDO_WEB)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cambios, setCambios] = useState(false)

  useEffect(() => {
    leerConfig('web').then(valor => {
      setC(combinarContenidoWeb(valor))
      setCargando(false)
    })
  }, [])

  const set = (ruta: Ruta, valor: any) => {
    setC(prev => conValor(prev, ruta, valor))
    setCambios(true)
  }
  const texto = (ruta: Ruta) => String(ruta.reduce((o: any, k) => o?.[k as any], c) ?? '')

  const guardar = async () => {
    setGuardando(true)
    const error = await guardarConfig('web', c)
    setGuardando(false)
    if (error) {
      toast.error(esTablaFaltante(error)
        ? 'Falta crear la tabla "configuracion" en Supabase (archivo supabase/tienda.sql).'
        : 'No se pudo guardar: ' + error.message)
      return
    }
    setCambios(false)
    toast.success('¡Listo! La web ya muestra los cambios.')
  }

  const restaurar = () => {
    if (!confirm('¿Volver todos los textos e imágenes de la web a los originales? (Se aplica al guardar)')) return
    setC(CONTENIDO_WEB)
    setCambios(true)
  }

  if (cargando) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Página web" subtitle="Todo lo que se ve en gugaprint.uy: textos, fotos, servicios y contacto" />
      <main style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>

        <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, color: cambios ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
            {cambios ? 'Tenés cambios sin guardar' : 'Todo guardado'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noopener"><ExternalLink size={14} /> Ver la web</a>
            <button className="btn btn-ghost btn-sm" onClick={restaurar}><RotateCcw size={14} /> Originales</button>
            <button className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}><Save size={14} /> {guardando ? 'Guardando...' : 'Guardar y publicar'}</button>
          </div>
        </div>

        <Seccion titulo="General" descripcion="Nombre de la pestaña del navegador, descripción para Google y logo.">
          <Campo etiqueta="Título de la página" valor={texto(['general', 'tituloPagina'])} onChange={v => set(['general', 'tituloPagina'], v)} />
          <Campo etiqueta="Descripción (Google)" valor={texto(['general', 'descripcion'])} onChange={v => set(['general', 'descripcion'], v)} largo />
          <CampoImagen etiqueta="Logo (arriba y en el pie)" valor={texto(['general', 'logo'])} onChange={v => set(['general', 'logo'], v)} />
        </Seccion>

        <Seccion titulo="Contacto" descripcion="Se usa en todos los botones de WhatsApp, la dirección y el mapa.">
          <div className="form-grid">
            <Campo etiqueta="WhatsApp (con código de país)" valor={texto(['contacto', 'whatsapp'])} onChange={v => set(['contacto', 'whatsapp'], v)} ayuda="Ej: 59899724454" />
            <Campo etiqueta="WhatsApp como se muestra" valor={texto(['contacto', 'whatsappVisible'])} onChange={v => set(['contacto', 'whatsappVisible'], v)} ayuda="Ej: 099 724 454" />
          </div>
          <Campo etiqueta="Mensaje que llega por WhatsApp" valor={texto(['contacto', 'mensaje'])} onChange={v => set(['contacto', 'mensaje'], v)} />
          <div className="form-grid">
            <Campo etiqueta="Dirección" valor={texto(['contacto', 'direccion'])} onChange={v => set(['contacto', 'direccion'], v)} />
            <Campo etiqueta="Ciudad" valor={texto(['contacto', 'ciudad'])} onChange={v => set(['contacto', 'ciudad'], v)} />
          </div>
          <Campo etiqueta="Búsqueda para el mapa" valor={texto(['contacto', 'busquedaMapa'])} onChange={v => set(['contacto', 'busquedaMapa'], v)} ayuda="Lo que se busca en Google Maps para mostrar el mapa y el botón Cómo llegar." />
        </Seccion>

        <Seccion titulo="Menú de arriba">
          <div className="form-grid">
            <Campo etiqueta="Nosotros" valor={texto(['menu', 'nosotros'])} onChange={v => set(['menu', 'nosotros'], v)} />
            <Campo etiqueta="Servicios" valor={texto(['menu', 'servicios'])} onChange={v => set(['menu', 'servicios'], v)} />
            <Campo etiqueta="Cómo pedir" valor={texto(['menu', 'comoPedir'])} onChange={v => set(['menu', 'comoPedir'], v)} />
            <Campo etiqueta="Ubicación" valor={texto(['menu', 'ubicacion'])} onChange={v => set(['menu', 'ubicacion'], v)} />
            <Campo etiqueta="Botón de la tienda" valor={texto(['menu', 'tienda'])} onChange={v => set(['menu', 'tienda'], v)} />
          </div>
        </Seccion>

        <Seccion titulo="Portada" descripcion="El título va en tres líneas; la tercera lleva el degradado de colores.">
          <div className="form-grid">
            <Campo etiqueta="Título — línea 1" valor={texto(['portada', 'titulo1'])} onChange={v => set(['portada', 'titulo1'], v)} />
            <Campo etiqueta="Título — línea 2" valor={texto(['portada', 'titulo2'])} onChange={v => set(['portada', 'titulo2'], v)} />
          </div>
          <Campo etiqueta="Título — línea 3 (con degradado)" valor={texto(['portada', 'titulo3'])} onChange={v => set(['portada', 'titulo3'], v)} />
          <Campo etiqueta="Texto de abajo" valor={texto(['portada', 'bajada'])} onChange={v => set(['portada', 'bajada'], v)} largo />
          <div className="form-grid">
            <Campo etiqueta="Botón de la tienda" valor={texto(['portada', 'botonTienda'])} onChange={v => set(['portada', 'botonTienda'], v)} />
            <Campo etiqueta="Botón de WhatsApp" valor={texto(['portada', 'botonWhatsapp'])} onChange={v => set(['portada', 'botonWhatsapp'], v)} />
          </div>
        </Seccion>

        <Seccion titulo="Cinta en movimiento" descripcion="Las palabras que pasan en la franja oscura debajo de la portada.">
          {c.cinta.map((palabra, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" value={palabra} onChange={e => set(['cinta', i], e.target.value)} />
              <BotonesItem indice={i} total={c.cinta.length} onMover={d => set(['cinta'], mover(c.cinta, i, d))} onQuitar={() => set(['cinta'], c.cinta.filter((_, k) => k !== i))} />
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => set(['cinta'], [...c.cinta, 'Nuevo'])}><Plus size={13} /> Agregar palabra</button>
        </Seccion>

        <Seccion titulo="Quiénes somos">
          <div className="form-grid">
            <Campo etiqueta="Antetítulo" valor={texto(['nosotros', 'antetitulo'])} onChange={v => set(['nosotros', 'antetitulo'], v)} />
            <Campo etiqueta="Título" valor={texto(['nosotros', 'titulo'])} onChange={v => set(['nosotros', 'titulo'], v)} />
          </div>
          <Campo etiqueta="Párrafo 1" valor={texto(['nosotros', 'parrafo1'])} onChange={v => set(['nosotros', 'parrafo1'], v)} largo />
          <Campo etiqueta="Párrafo 2" valor={texto(['nosotros', 'parrafo2'])} onChange={v => set(['nosotros', 'parrafo2'], v)} largo />
          <CampoImagen etiqueta="Foto" valor={texto(['nosotros', 'foto'])} onChange={v => set(['nosotros', 'foto'], v)} />
          <label style={{ marginTop: 4 }}>Recuadros</label>
          {c.nosotros.datos.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><Campo etiqueta={`Recuadro ${i + 1} — título`} valor={d.titulo} onChange={v => set(['nosotros', 'datos', i, 'titulo'], v)} /></div>
              <div style={{ flex: 1 }}><Campo etiqueta="Texto" valor={d.texto} onChange={v => set(['nosotros', 'datos', i, 'texto'], v)} /></div>
              <BotonesItem indice={i} total={c.nosotros.datos.length} onMover={dd => set(['nosotros', 'datos'], mover(c.nosotros.datos, i, dd))} onQuitar={() => set(['nosotros', 'datos'], c.nosotros.datos.filter((_, k) => k !== i))} />
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => set(['nosotros', 'datos'], [...c.nosotros.datos, { titulo: 'Nuevo', texto: '' }])}><Plus size={13} /> Agregar recuadro</button>
        </Seccion>

        <Seccion titulo="Servicios" descripcion="Cada tarjeta lleva foto, ícono, nombre y descripción. Todas llevan a la tienda.">
          <div className="form-grid">
            <Campo etiqueta="Antetítulo" valor={texto(['servicios', 'antetitulo'])} onChange={v => set(['servicios', 'antetitulo'], v)} />
            <Campo etiqueta="Título" valor={texto(['servicios', 'titulo'])} onChange={v => set(['servicios', 'titulo'], v)} />
          </div>
          <Campo etiqueta="Texto" valor={texto(['servicios', 'texto'])} onChange={v => set(['servicios', 'texto'], v)} />
          {c.servicios.items.map((s, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5 }}>Tarjeta {i + 1}</strong>
                <BotonesItem indice={i} total={c.servicios.items.length} onMover={d => set(['servicios', 'items'], mover(c.servicios.items, i, d))} onQuitar={() => set(['servicios', 'items'], c.servicios.items.filter((_, k) => k !== i))} />
              </div>
              <div className="form-grid">
                <Campo etiqueta="Nombre" valor={s.titulo} onChange={v => set(['servicios', 'items', i, 'titulo'], v)} />
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Ícono</label>
                  <select className="input" value={s.icono} onChange={e => set(['servicios', 'items', i, 'icono'], e.target.value)}>
                    {Object.entries(ICONOS_SERVICIO).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
                  </select>
                </div>
              </div>
              <Campo etiqueta="Descripción" valor={s.texto} onChange={v => set(['servicios', 'items', i, 'texto'], v)} />
              <CampoImagen etiqueta="Foto" valor={s.foto} onChange={v => set(['servicios', 'items', i, 'foto'], v)} />
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => set(['servicios', 'items'], [...c.servicios.items, { titulo: 'Nuevo servicio', texto: '', foto: '', icono: 'tarjeta' }])}><Plus size={13} /> Agregar tarjeta</button>
        </Seccion>

        <Seccion titulo="Cómo pedir">
          <div className="form-grid">
            <Campo etiqueta="Antetítulo" valor={texto(['pasos', 'antetitulo'])} onChange={v => set(['pasos', 'antetitulo'], v)} />
            <Campo etiqueta="Título" valor={texto(['pasos', 'titulo'])} onChange={v => set(['pasos', 'titulo'], v)} />
          </div>
          {c.pasos.items.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><Campo etiqueta={`Paso ${i + 1} — título`} valor={p.titulo} onChange={v => set(['pasos', 'items', i, 'titulo'], v)} /></div>
              <div style={{ flex: 2 }}><Campo etiqueta="Texto" valor={p.texto} onChange={v => set(['pasos', 'items', i, 'texto'], v)} /></div>
              <BotonesItem indice={i} total={c.pasos.items.length} onMover={d => set(['pasos', 'items'], mover(c.pasos.items, i, d))} onQuitar={() => set(['pasos', 'items'], c.pasos.items.filter((_, k) => k !== i))} />
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => set(['pasos', 'items'], [...c.pasos.items, { titulo: 'Nuevo paso', texto: '' }])}><Plus size={13} /> Agregar paso</button>
        </Seccion>

        <Seccion titulo="Ubicación" descripcion="La dirección y el mapa salen de la sección Contacto.">
          <div className="form-grid">
            <Campo etiqueta="Antetítulo" valor={texto(['ubicacion', 'antetitulo'])} onChange={v => set(['ubicacion', 'antetitulo'], v)} />
            <Campo etiqueta="Título" valor={texto(['ubicacion', 'titulo'])} onChange={v => set(['ubicacion', 'titulo'], v)} />
          </div>
          <Campo etiqueta="Texto" valor={texto(['ubicacion', 'texto'])} onChange={v => set(['ubicacion', 'texto'], v)} />
          <div className="form-grid">
            <Campo etiqueta="Botón del mapa" valor={texto(['ubicacion', 'botonMapa'])} onChange={v => set(['ubicacion', 'botonMapa'], v)} />
            <Campo etiqueta="Botón de WhatsApp" valor={texto(['ubicacion', 'botonWhatsapp'])} onChange={v => set(['ubicacion', 'botonWhatsapp'], v)} />
          </div>
          <Campo etiqueta="Mensaje de WhatsApp de este botón" valor={texto(['ubicacion', 'mensajeWhatsapp'])} onChange={v => set(['ubicacion', 'mensajeWhatsapp'], v)} />
        </Seccion>

        <Seccion titulo="Recuadro final y pie">
          <Campo etiqueta="Título" valor={texto(['llamado', 'titulo'])} onChange={v => set(['llamado', 'titulo'], v)} />
          <Campo etiqueta="Texto" valor={texto(['llamado', 'texto'])} onChange={v => set(['llamado', 'texto'], v)} />
          <div className="form-grid">
            <Campo etiqueta="Botón de la tienda" valor={texto(['llamado', 'botonTienda'])} onChange={v => set(['llamado', 'botonTienda'], v)} />
            <Campo etiqueta="Botón de WhatsApp" valor={texto(['llamado', 'botonWhatsapp'])} onChange={v => set(['llamado', 'botonWhatsapp'], v)} />
          </div>
          <Campo etiqueta="Pie — enlace a la tienda" valor={texto(['pie', 'enlaceTienda'])} onChange={v => set(['pie', 'enlaceTienda'], v)} />
        </Seccion>
      </main>
    </>
  )
}
