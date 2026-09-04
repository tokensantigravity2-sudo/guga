'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio, Cliente, PedidoItem, Pedido, StockItem } from '@/lib/types'
import { formatCurrency, formatDateTime, generateNumeroPedido, ESTADOS_PEDIDO, CATEGORIAS_SERVICIO, cleanProductDescription, formatProductUnit } from '@/lib/helpers'
import {
  Plus, Minus, ShoppingCart, Search, X, Trash2,
  CreditCard, Banknote, ArrowLeftRight, Printer,
  Check, FileText, Calendar, Filter, UserCheck, ShieldAlert, Sparkles, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import PresupuestoPDFModal from '@/components/PresupuestoPDFModal'

export default function PedidosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [cajaMovs, setCajaMovs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('nuevo')
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null)

  // New order state
  const [cart, setCart] = useState<PedidoItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
  const [montoSena, setMontoSena] = useState<number>(0)
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
  const [itemDescripcion, setItemDescripcion] = useState('')
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

  // PDF Presupuesto state
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfData, setPdfData] = useState<Pedido | null>(null)
  const [pedidoOpcionesModal, setPedidoOpcionesModal] = useState<Pedido | null>(null)

  // History filters
  const [historialFilter, setHistorialFilter] = useState('todos')
  const [historialOrigen, setHistorialOrigen] = useState<'todos' | 'ecommerce' | 'mostrador'>('todos')
  const [historialSearch, setHistorialSearch] = useState('')
  const [historialFechaInicio, setHistorialFechaInicio] = useState('')
  const [historialFechaFin, setHistorialFechaFin] = useState('')
  const [historialCategoria, setHistorialCategoria] = useState('')
  const [historialMetodoPago, setHistorialMetodoPago] = useState('')
  const [historialCobro, setHistorialCobro] = useState('')

  useEffect(() => {
    // 1. Hidratación instantánea de caché: carga inmediata en <10ms sin esperar la red
    try {
      const cachedSrvs = sessionStorage.getItem('guga_cache_srvs')
      const cachedClts = sessionStorage.getItem('guga_cache_clts')
      const cachedPds = sessionStorage.getItem('guga_cache_pds')
      const cachedStks = sessionStorage.getItem('guga_cache_stks')
      if (cachedSrvs) setServicios(JSON.parse(cachedSrvs))
      if (cachedClts) setClientes(JSON.parse(cachedClts))
      if (cachedPds) setPedidos(JSON.parse(cachedPds))
      if (cachedStks) setStockItems(JSON.parse(cachedStks))
      if (cachedSrvs || cachedPds) {
        setLoading(false)
      }
    } catch (e) {
      console.error('Cache hydration error', e)
    }

    // 2. Cargar datos frescos en segundo plano y actualizar silenciosamente
    loadData()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'historial') {
        setActiveTab('historial')
      }
    }
  }, [])

  const loadData = async () => {
    try {
      const [{ data: srvs }, { data: clts }, { data: pds }, { data: stks }, { data: cMovs }] = await Promise.all([
        supabase.from('servicios').select('*').eq('disponible', true).order('categoria'),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('stock').select('*').order('nombre'),
        supabase.from('caja_movimientos').select('id, tipo, monto, concepto, referencia_id').not('referencia_id', 'is', null)
      ])

      if (srvs) {
        setServicios(srvs)
        try { sessionStorage.setItem('guga_cache_srvs', JSON.stringify(srvs)) } catch {}
      }
      if (clts) {
        setClientes(clts)
        try { sessionStorage.setItem('guga_cache_clts', JSON.stringify(clts)) } catch {}
      }
      if (pds) {
        setPedidos(pds)
        try { sessionStorage.setItem('guga_cache_pds', JSON.stringify(pds)) } catch {}
      }
      if (stks) {
        setStockItems(stks)
        try { sessionStorage.setItem('guga_cache_stks', JSON.stringify(stks)) } catch {}
      }
      if (cMovs) {
        setCajaMovs(cMovs)
      }

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
    } catch (err) {
      console.error('Error cargando datos de pedidos:', err)
    } finally {
      setLoading(false)
    }
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

  const openEditPedidoModal = (p: Pedido) => {
    setEditingPedido(p)
    setCart(Array.isArray(p.items) ? p.items : [])
    const matchClient = clientes.find(c => c.id === p.cliente_id || c.nombre === p.cliente_nombre)
    setSelectedCliente(matchClient || null)
    setClienteSearch(p.cliente_nombre || '')
    setMetodoPago(p.metodo_pago || 'efectivo')
    setEstadoPedido(p.estado || 'presupuesto')
    setFechaEntrega(p.fecha_entrega ? p.fecha_entrega.split('T')[0] : '')

    const descMatch = (p.notas || '').match(/\[Desc:\s*(\d+)%\]/)
    setDescuentoPorcentaje(p.descuento_porcentaje || (descMatch ? Number(descMatch[1]) : 0))

    const adicMatch = (p.notas || '').match(/\[Adicional:\s*(\d+)%\]/)
    setAdicionalPorcentaje(adicMatch ? Number(adicMatch[1]) : 0)

    setIncluirIva((p.notas || '').includes('[+IVA 22%]'))

    const cleanNotas = (p.notas || '')
      .replace(/\[Desc:.*?\]/g, '')
      .replace(/\[Adicional:.*?\]/g, '')
      .replace(/\[\+IVA.*?\]/g, '')
      .replace(/\[COBRADO:true\]/g, '')
      .trim()
    setNotas(cleanNotas)
    setActiveTab('nuevo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    const cleanDesc = (servicio.descripcion || '')
      .replace(/\[TERCERIZADO:[^\]]*\]/gi, '')
      .replace(/\[COBRADO:[^\]]*\]/gi, '')
      .replace(/\[STOCK:[^\]]*\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim()
    setItemDescripcion(cleanDesc)
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
    setItemDescripcion('')
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
      descripcion: itemDescripcion.trim() || undefined,
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

  const resetForm = () => {
    setEditingPedido(null)
    setCart([])
    setSelectedCliente(null)
    setClienteSearch('')
    setMetodoPago('efectivo')
    setEstadoPedido('presupuesto')
    setDescuentoPorcentaje(0)
    setMontoSena(0)
    setAdicionalPorcentaje(0)
    setIncluirIva(false)
    setNotas('')
    setFechaEntrega('')
  }

  const handleCrearPedido = async () => {
    if (cart.length === 0) {
      toast.error('Agregá servicios o trabajos personalizados al pedido')
      return
    }

    const numero = generateNumeroPedido()
    const descTag = descuentoPorcentaje > 0 ? `[Desc: ${descuentoPorcentaje}%]` : null
    const adicTag = adicionalPorcentaje > 0 ? `[Adicional: ${adicionalPorcentaje}%]` : null
    const ivaTag = incluirIva ? `[+IVA 22%]` : null
    const isTotalPaid = montoSena >= total && total > 0
    const cobradoTag = isTotalPaid ? '[COBRADO:true]' : null
    const notasFinal = [notas, descTag, adicTag, ivaTag, cobradoTag].filter(Boolean).join(' ') || null
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
      cobrado: isTotalPaid,
    }

    let data: any = null
    let error: any = null

    if (editingPedido) {
      delete pedidoData.numero
      const res = await supabase.from('pedidos').update(pedidoData).eq('id', editingPedido.id).select().single()
      data = res.data
      error = res.error

      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete pedidoData.cobrado
        delete pedidoData.descuento_porcentaje
        const res2 = await supabase.from('pedidos').update(pedidoData).eq('id', editingPedido.id).select().single()
        data = res2.data
        error = res2.error
      }

      if (error) {
        toast.error('Error al actualizar pedido: ' + error.message)
        return
      }
    } else {
      const res = await supabase.from('pedidos').insert(pedidoData).select().single()
      data = res.data
      error = res.error

      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete pedidoData.cobrado
        delete pedidoData.descuento_porcentaje
        const res2 = await supabase.from('pedidos').insert(pedidoData).select().single()
        data = res2.data
        error = res2.error
      }

      if (error) {
        toast.error('Error al registrar pedido: ' + error.message)
        return
      }
    }

    // Afectar stock automáticamente si el estado es aprobado/en_produccion/terminado/entregado
    if (estadoPedido !== 'presupuesto' && estadoPedido !== 'cancelado') {
      await descontarStockDePedido(cart, data?.id, data?.notas)
    }

    // REGISTRAR PAGO / SEÑA EN CAJA DIARIA (Si ingresó dinero > 0 y no es cta corriente)
    // Nota: Si el estado es 'entregado' pero solo dejó seña, SOLO entra la seña. El saldo restante se cobra explícitamente.
    if (montoSena > 0 && metodoPago !== 'cuenta_corriente') {
      const nowIso = new Date().toISOString()
      let movSena: any = {
        tipo: 'ingreso',
        monto: montoSena,
        concepto: `[Pago: ${metodoPago}] ${isTotalPaid ? 'Pago 100%' : 'Seña'} Pedido #${numero} - ${selectedCliente?.nombre || 'Consumidor Final'}`,
        referencia_id: data.id,
        fecha: nowIso,
      }
      let { error: movErr } = await supabase.from('caja_movimientos').insert(movSena)
      if (movErr) {
        console.error('Error al insertar en caja_movimientos:', movErr)
      } else {
        toast.success(isTotalPaid ? `💵 Pago total (${formatCurrency(montoSena)}) registrado en la Caja Diaria` : `💵 Seña de ${formatCurrency(montoSena)} registrada en la Caja Diaria`)
      }
    }

    toast.success('¡Pedido/Presupuesto registrado con éxito!')
    setPdfData(data)
    resetForm()
    loadData()
  }

  const descontarStockDePedido = async (items: PedidoItem[], pedidoId?: string, pedidoNotas?: string) => {
    // Si ya se descontó el stock para este pedido, no volver a descontar
    if (pedidoNotas && pedidoNotas.includes('[STOCK:descontado]')) {
      return
    }

    let itemsDescontados = 0
    for (const item of items) {
      if (item.no_afectar_stock) continue

      const targetMaterialName = item.material || item.nombre
      const match = stockItems.find(s =>
        s.nombre.toLowerCase().includes(targetMaterialName.toLowerCase()) ||
        targetMaterialName.toLowerCase().includes(s.nombre.toLowerCase())
      )

      if (match) {
        const newCantidad = Math.max(0, Number(match.cantidad) - Number(item.cantidad))
        await supabase.from('stock').update({ cantidad: newCantidad }).eq('id', match.id)
        itemsDescontados++
      }
    }

    // Marcar en notas que el stock fue descontado para este pedido
    if (pedidoId && itemsDescontados > 0) {
      const { data: currentPed } = await supabase.from('pedidos').select('notas').eq('id', pedidoId).single()
      const cleanNotas = (currentPed?.notas || '').replace(/\[STOCK:descontado\]/g, '').trim()
      await supabase.from('pedidos').update({ notas: `${cleanNotas} [STOCK:descontado]`.trim() }).eq('id', pedidoId)
    }
  }

  const handleCambiarEstado = async (id: string, nuevoEstado: string, pedido: Pedido) => {
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar estado: ' + error.message)
      return
    }

    // Descontar stock si pasa a produccion/aprobado/entregado (solo si no fue descontado previamente)
    if (nuevoEstado !== 'presupuesto' && nuevoEstado !== 'cancelado') {
      await descontarStockDePedido(pedido.items || [], id, pedido.notas)
    }

    toast.success(`Estado actualizado a ${nuevoEstado}`)
    loadData()
  }

  const handleAprobarOpcion = async (pedido: Pedido, itemIndex: number | 'todos') => {
    try {
      let nuevosItems: PedidoItem[] = []
      let nuevoSubtotal = 0
      let opcionNombre = ''

      if (itemIndex === 'todos') {
        nuevosItems = pedido.items
        nuevoSubtotal = pedido.subtotal
        opcionNombre = 'Todas las opciones combinadas'
      } else {
        const itemElegido = pedido.items[itemIndex]
        nuevosItems = [itemElegido]
        nuevoSubtotal = itemElegido.subtotal || ((itemElegido.cantidad || 1) * (itemElegido.precio_unitario || 0))
        opcionNombre = `Opción ${String.fromCharCode(65 + itemIndex)} (${itemElegido.cantidad} u. de ${itemElegido.nombre})`
      }

      // Calcular descuento, adicional e IVA manteniendo los porcentajes originales del pedido
      const descMatch = (pedido.notas || '').match(/\[Desc:\s*(\d+)%\]/)
      const descPct = pedido.descuento_porcentaje || (descMatch ? Number(descMatch[1]) : 0)
      const adicMatch = (pedido.notas || '').match(/\[Adicional:\s*(\d+)%\]/)
      const adicPct = adicMatch ? Number(adicMatch[1]) : 0
      const hasIva = (pedido.notas || '').includes('[+IVA 22%]')

      const descMonto = Math.round((nuevoSubtotal * descPct) / 100)
      const adicMonto = Math.round((nuevoSubtotal * adicPct) / 100)
      const subtotalNeto = Math.max(0, nuevoSubtotal - descMonto + adicMonto)
      const montoIva = hasIva ? Math.round(subtotalNeto * 0.22 * 100) / 100 : 0
      const nuevoTotal = subtotalNeto + montoIva

      let notasActualizadas = (pedido.notas || '')
      if (itemIndex !== 'todos') {
        notasActualizadas = `[Opción aprobada: ${opcionNombre} por ${formatCurrency(nuevoTotal)}] ${notasActualizadas}`.trim()
      }

      const { error } = await supabase
        .from('pedidos')
        .update({
          items: nuevosItems,
          subtotal: nuevoSubtotal,
          descuento: descMonto,
          total: nuevoTotal,
          estado: 'aprobado',
          notas: notasActualizadas
        })
        .eq('id', pedido.id)

      if (error) {
        toast.error('Error al aprobar opción: ' + error.message)
        return
      }

      // Descontar stock si corresponde
      await descontarStockDePedido(nuevosItems)

      toast.success(`🎉 ¡${opcionNombre} aprobada! Total actualizado a ${formatCurrency(nuevoTotal)}`)
      setPedidoOpcionesModal(null)
      loadData()
    } catch (e: any) {
      toast.error('Error al procesar opción: ' + e.message)
    }
  }

  const handleToggleCobrado = async (pedido: Pedido) => {
    // 1. Obtener movimientos actuales en caja para este pedido
    const { data: movs } = await supabase.from('caja_movimientos').select('*').eq('referencia_id', pedido.id)
    const totalYaIngresado = movs?.reduce((acc, m) => acc + Number(m.monto || 0), 0) || 0
    const totalPedido = Number(pedido.total || 0)

    const isExplicitlyCobrado = (pedido.notas || '').includes('[COBRADO:true]')
    const isCurrentlyCobrado = isExplicitlyCobrado || (totalPedido > 0 && totalYaIngresado >= totalPedido)
    const newCobrado = !isCurrentlyCobrado

    let newNotas = pedido.notas || ''
    if (newCobrado) {
      if (!newNotas.includes('[COBRADO:true]')) {
        newNotas = `${newNotas} [COBRADO:true]`.trim()
      }
    } else {
      newNotas = newNotas.replace(/\[COBRADO:true\]/g, '').trim()
    }

    let payload: any = {
      notas: newNotas || null
    }

    let { error } = await supabase.from('pedidos').update(payload).eq('id', pedido.id)

    if (error) {
      toast.error('Error al actualizar cobro: ' + error.message)
      return
    }

    // SI SE MARCA COMO COBRADO (ON): Registrar saldo pendiente en la Caja Diaria
    if (newCobrado && pedido.metodo_pago !== 'cuenta_corriente') {
      const saldoPendiente = Math.max(0, totalPedido - totalYaIngresado)

      if (saldoPendiente > 0) {
        const nowIso = new Date().toISOString()
        const concepto = totalYaIngresado > 0
          ? `[Pago: ${pedido.metodo_pago || 'efectivo'}] Saldo Cobrado Pedido #${pedido.numero} - ${pedido.cliente_nombre || 'Consumidor Final'}`
          : `[Pago: ${pedido.metodo_pago || 'efectivo'}] Cobro 100% Pedido #${pedido.numero} - ${pedido.cliente_nombre || 'Consumidor Final'}`

        let movData: any = {
          tipo: 'ingreso',
          monto: saldoPendiente,
          concepto,
          referencia_id: pedido.id,
          fecha: nowIso,
        }
        const { error: movErr } = await supabase.from('caja_movimientos').insert(movData)
        if (movErr) {
          console.error('Error registrando cobro en caja:', movErr)
        }
        if (totalYaIngresado > 0) {
          toast.success(`💵 ¡Saldo de ${formatCurrency(saldoPendiente)} cobrado! Pedido 100% liquidado en Caja`)
        } else {
          toast.success(`💵 ¡100% COBRADO! Se ingresaron ${formatCurrency(saldoPendiente)} a la Caja Diaria`)
        }
      } else {
        toast.success(`🟢 Pedido #${pedido.numero} marcado como COBRADO`)
      }
    } else if (!newCobrado) {
      // Al desmarcar como cobrado (OFF), eliminar ÚNICAMENTE los movimientos de saldo/cobro 100% o entrega
      // ¡NUNCA borrar la seña original que el cliente ya pagó!
      if (movs && movs.length > 0) {
        // Señas preservadas
        const senas = movs.filter(m => {
          const c = (m.concepto || '').toLowerCase()
          return c.includes('seña') || c.includes('sena')
        })
        const totalSenas = senas.reduce((acc, m) => acc + Number(m.monto), 0)

        // Movimientos a eliminar (los que no son seña, ej: Cobro 100%, Saldo Cobrado, Entrega Pedido)
        const aEliminar = movs.filter(m => {
          const c = (m.concepto || '').toLowerCase()
          return !(c.includes('seña') || c.includes('sena'))
        })

        if (aEliminar.length > 0) {
          const idsAEliminar = aEliminar.map(m => m.id)
          const montoRetirado = aEliminar.reduce((acc, m) => acc + Number(m.monto), 0)
          const { error: delMovErr } = await supabase
            .from('caja_movimientos')
            .delete()
            .in('id', idsAEliminar)

          if (delMovErr) {
            console.error('Error al eliminar cobro final de caja:', delMovErr)
          }

          if (totalSenas > 0) {
            toast.success(`⚪ Saldo de ${formatCurrency(montoRetirado)} retirado. ¡La seña de ${formatCurrency(totalSenas)} se conserva en Caja!`)
          } else {
            toast.success(`⚪ Pedido #${pedido.numero} desmarcado como cobrado y retirado de la Caja`)
          }
        } else if (totalSenas > 0) {
          toast(`⚪ Pedido #${pedido.numero} desmarcado como 100% cobrado. La seña de ${formatCurrency(totalSenas)} continúa registrada en Caja.`, {
            icon: 'ℹ️'
          })
        }
      } else {
        toast.success(`⚪ Pedido #${pedido.numero} desmarcado como cobrado`)
      }
    }

    loadData()
  }

  const handleDeletePedido = async (id: string, numero: string) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido #${numero}?`)) return
    // Eliminar también movimientos de caja asociados
    await supabase.from('caja_movimientos').delete().eq('referencia_id', id)
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
    // 0. Origen (Online vs Mostrador)
    if (historialOrigen === 'ecommerce') {
      const isOnline = p.origen === 'ecommerce' || p.numero?.startsWith('ECO-') || (p.notas && p.notas.includes('[TIENDA ONLINE]'))
      if (!isOnline) return false
    } else if (historialOrigen === 'mostrador') {
      const isOnline = p.origen === 'ecommerce' || p.numero?.startsWith('ECO-') || (p.notas && p.notas.includes('[TIENDA ONLINE]'))
      if (isOnline) return false
    }

    // 1. Estado
    if (historialFilter !== 'todos' && p.estado !== historialFilter) return false

    // 2. Método de pago
    if (historialMetodoPago && p.metodo_pago !== historialMetodoPago) return false

    // 2.5 Estado de Cobro (Cobrado 100%, Con Seña, Sin Cobrar)
    if (historialCobro) {
      const pMovs = cajaMovs.filter(m => m.referencia_id === p.id && m.tipo === 'ingreso')
      const totalCobradoEnCaja = pMovs.reduce((acc, m) => acc + Number(m.monto || 0), 0)
      const pedidoTotal = Number(p.total || 0)
      const isCobradoExplicit = p.cobrado === true || (p.notas || '').includes('[COBRADO:true]')
      const isCobrado = isCobradoExplicit || (pedidoTotal > 0 && totalCobradoEnCaja >= pedidoTotal)
      const tieneSenaPendiente = !isCobrado && totalCobradoEnCaja > 0

      if (historialCobro === 'cobrado' && !isCobrado) return false
      if (historialCobro === 'sena' && !tieneSenaPendiente) return false
      if (historialCobro === 'sin_cobrar' && (isCobrado || totalCobradoEnCaja > 0)) return false
    }

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
                    {cleanProductDescription(srv.descripcion) && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {cleanProductDescription(srv.descripcion)}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {srv.tiempo_estimado ? `⏱ ${srv.tiempo_estimado}` : formatProductUnit(srv)}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>
                        {formatCurrency(srv.precio_base)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>/{formatProductUnit(srv)}</span>
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
                        {(item.medida || item.material || item.acabado || item.descripcion || item.no_afectar_stock) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {[
                              item.medida,
                              item.material,
                              item.acabado,
                              item.descripcion ? `📝 ${item.descripcion.slice(0, 45)}${item.descripcion.length > 45 ? '...' : ''}` : null,
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

              {/* Seña / Adelanto / Pago Total ($) */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>💵 Pago / Seña Recibida ($)</label>
                  {montoSena > 0 && (
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 11, background: 'rgba(22, 163, 74, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      {montoSena >= total && total > 0 ? '✓ Pago 100% (Entra a Caja)' : '✓ Seña (Entra a Caja)'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMontoSena(total)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: montoSena >= total && total > 0 ? '1.5px solid #16a34a' : '1px solid var(--border)',
                      background: montoSena >= total && total > 0 ? 'rgba(22, 163, 74, 0.12)' : 'var(--bg-hover)',
                      color: montoSena >= total && total > 0 ? '#16a34a' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    ✓ 100% Pagado
                  </button>

                  <button
                    type="button"
                    onClick={() => setMontoSena(Math.round(total / 2))}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: montoSena === Math.round(total / 2) && montoSena > 0 && montoSena < total ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: montoSena === Math.round(total / 2) && montoSena > 0 && montoSena < total ? 'var(--accent-muted)' : 'var(--bg-hover)',
                      color: montoSena === Math.round(total / 2) && montoSena > 0 && montoSena < total ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    50% Seña
                  </button>

                  <button
                    type="button"
                    onClick={() => setMontoSena(0)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: montoSena === 0 ? '1.5px solid #cbd5e1' : '1px solid var(--border)',
                      background: montoSena === 0 ? 'var(--bg-card)' : 'var(--bg-hover)',
                      color: montoSena === 0 ? '#64748b' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    A Cobrar
                  </button>
                </div>

                <input
                  className="input"
                  type="number"
                  placeholder="0 (o ingresá monto personalizado)"
                  value={montoSena === 0 ? '' : montoSena}
                  onChange={e => setMontoSena(e.target.value === '' ? 0 : Number(e.target.value))}
                />
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

                <div style={{ width: 155 }}>
                  <select
                    className="input"
                    value={historialCobro}
                    onChange={e => setHistorialCobro(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: 13 }}
                  >
                    <option value="">Todos los Cobros</option>
                    <option value="cobrado">🟢 Cobrado 100%</option>
                    <option value="sena">⏳ Con Seña (Resta Saldo)</option>
                    <option value="sin_cobrar">⚪ Sin Cobrar</option>
                  </select>
                </div>

                {(historialSearch || historialFechaInicio || historialFechaFin || historialCategoria || historialMetodoPago || historialCobro || historialFilter !== 'todos') && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setHistorialFilter('todos')
                      setHistorialSearch('')
                      setHistorialFechaInicio('')
                      setHistorialFechaFin('')
                      setHistorialCategoria('')
                      setHistorialMetodoPago('')
                      setHistorialCobro('')
                    }}
                    style={{ fontSize: 12, color: 'var(--danger)' }}
                  >
                    ✕ Limpiar Filtros
                  </button>
                )}
              </div>

              {/* Row 2: Origin & Status Badges */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {/* Canal / Origen */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Canal:</span>
                  <button
                    className={`btn btn-sm ${historialOrigen === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHistorialOrigen('todos')}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    Todos
                  </button>
                  <button
                    className={`btn btn-sm ${historialOrigen === 'mostrador' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHistorialOrigen('mostrador')}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    🏢 Mostrador / Taller
                  </button>
                  <button
                    className={`btn btn-sm ${historialOrigen === 'ecommerce' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHistorialOrigen('ecommerce')}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    🌐 Tienda Online ({pedidos.filter(p => p.origen === 'ecommerce' || p.numero?.startsWith('ECO-') || (p.notas && p.notas.includes('[TIENDA ONLINE]'))).length})
                  </button>
                </div>

                <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

                {/* Status */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Estado:</span>
                  <button
                    className={`btn btn-sm ${historialFilter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHistorialFilter('todos')}
                    style={{ fontSize: 11.5, padding: '4px 8px' }}
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
                        style={{ fontSize: 11.5, padding: '4px 8px' }}
                      >
                        {e.label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>N° Pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Estado Producción</th>
                    <th>Entrega Est.</th>
                    <th>Pago</th>
                    <th>¿Cobrado? (ON/OFF)</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map(p => {
                    const pMovs = cajaMovs.filter(m => m.referencia_id === p.id && m.tipo === 'ingreso')
                    const totalCobradoEnCaja = pMovs.reduce((acc, m) => acc + Number(m.monto || 0), 0)
                    const senas = pMovs.filter(m => {
                      const c = (m.concepto || '').toLowerCase()
                      return c.includes('seña') || c.includes('sena')
                    })
                    const totalSenas = senas.reduce((acc, m) => acc + Number(m.monto || 0), 0)

                    const pedidoTotal = Number(p.total || 0)
                    const isCobradoExplicit = p.cobrado === true || (p.notas || '').includes('[COBRADO:true]')
                    const isCobrado = isCobradoExplicit || (pedidoTotal > 0 && totalCobradoEnCaja >= pedidoTotal)

                    const tieneSenaPendiente = !isCobrado && (totalSenas > 0 || (totalCobradoEnCaja > 0 && totalCobradoEnCaja < pedidoTotal))
                    const saldoRestante = Math.max(0, pedidoTotal - totalCobradoEnCaja)

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ color: 'var(--accent)' }}>{p.numero}</strong>
                            {(p.origen === 'ecommerce' || (p.numero && p.numero.startsWith('ECO-'))) && (
                              <span style={{
                                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                color: '#dc2626',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 4,
                                textTransform: 'uppercase'
                              }}>
                                Online
                              </span>
                            )}
                          </div>
                        </td>
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
                        <td>
                          {isCobrado ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCobrado(p)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 20,
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#16a34a',
                                color: '#ffffff',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              title={totalSenas > 0 ? `Cobrado 100% (Seña original: ${formatCurrency(totalSenas)} + Saldo). Clic para desmarcar saldo.` : 'Cobrado 100% (Ingresado a Caja Diaria). Clic para desmarcar.'}
                            >
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#ffffff',
                                display: 'inline-block'
                              }} />
                              🟢 COBRADO
                            </button>
                          ) : tieneSenaPendiente ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleCobrado(p)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  border: '1px solid #d97706',
                                  fontWeight: 700,
                                  fontSize: 11.5,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  boxShadow: '0 1px 3px rgba(217, 119, 6, 0.15)',
                                  transition: 'all 0.2s ease'
                                }}
                                title={`Seña registrada en Caja: ${formatCurrency(totalCobradoEnCaja)}. Clic para cobrar el saldo restante de ${formatCurrency(saldoRestante)} en la Caja.`}
                              >
                                <span style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: '#d97706',
                                  display: 'inline-block'
                                }} />
                                ⏳ SEÑA: {formatCurrency(totalCobradoEnCaja)}
                              </button>
                              <span style={{
                                fontSize: 11,
                                color: '#dc2626',
                                fontWeight: 700,
                                paddingLeft: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                Resta: {formatCurrency(saldoRestante)}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCobrado(p)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 20,
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#f1f5f9',
                                color: '#64748b',
                                boxShadow: 'inset 0 0 0 1px #cbd5e1',
                                transition: 'all 0.2s ease'
                              }}
                              title="Sin cobrar. Clic para registrar el cobro total en la Caja Diaria."
                            >
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#94a3b8',
                                display: 'inline-block'
                              }} />
                              ⚪ SIN COBRAR
                            </button>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong>{formatCurrency(p.total)}</strong>
                            {tieneSenaPendiente && (
                              <span style={{ fontSize: 10.5, color: '#b45309', fontWeight: 600 }}>
                                (Seña: {formatCurrency(totalCobradoEnCaja)})
                              </span>
                            )}
                            {p.estado === 'presupuesto' && Array.isArray(p.items) && p.items.length > 1 && (
                              <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>
                                {p.items.length} alternativas
                              </div>
                            )}
                          </div>
                        </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: '#0284c7', fontWeight: 600 }}
                            onClick={() => {
                              openEditPedidoModal(p)
                              setActiveTab('nuevo')
                            }}
                            title="Editar este presupuesto/pedido para modificar productos, precios u observaciones"
                          >
                            ✏️ Editar
                          </button>
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
                          {p.estado === 'presupuesto' && Array.isArray(p.items) && p.items.length > 1 && (
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ color: '#7c3aed', fontWeight: 700, backgroundColor: 'rgba(124, 58, 237, 0.08)' }}
                              onClick={() => setPedidoOpcionesModal(p)}
                              title="El cliente eligió una opción. Clic para seleccionar y aprobar la alternativa elegida."
                            >
                              🎯 Elegir Opción
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--accent)' }}
                            onClick={() => handleRepetirPedidoDirecto(p)}
                            title="Repetir este pedido"
                          >
                            <RotateCcw size={13} />
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
                  )
                })}
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

                <div className="form-group">
                  <label>Descripción y Especificaciones Detalladas (para el Presupuesto / PDF)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="ej. Impreso a color frente y dorso, papel ilustración 300g, esquinas redondeadas..."
                    value={itemDescripcion}
                    onChange={e => setItemDescripcion(e.target.value)}
                    style={{ resize: 'vertical', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Esta descripción detallada figurará en el PDF formal del presupuesto.
                  </span>
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

        {/* Presupuesto PDF Modal */}
        {showPdfModal && pdfData && (
          <PresupuestoPDFModal
            pedido={pdfData}
            cliente={clientes.find(c => c.id === pdfData.cliente_id)}
            onClose={() => setShowPdfModal(false)}
          />
        )}

        {/* Modal de Selección de Alternativa Aprobada */}
        {pedidoOpcionesModal && (
          <div className="modal-backdrop" onClick={() => setPedidoOpcionesModal(null)}>
            <div
              className="modal"
              style={{ maxWidth: 560 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">🎯 Seleccionar Alternativa Aprobada</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Presupuesto #{pedidoOpcionesModal.numero} • {pedidoOpcionesModal.cliente_nombre || 'Cliente'}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPedidoOpcionesModal(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  El cliente eligió una de las opciones cotizadas. Seleccioná cuál opción confirmó para pasar el pedido a <strong>Aprobado</strong> con su cantidad e importe exacto:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pedidoOpcionesModal.items.map((it, idx) => {
                    const itemTot = it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || 0))
                    const unitPrice = it.cantidad > 0 ? Math.round(itemTot / it.cantidad) : (it.precio_unitario || 0)
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1.5px solid var(--border)',
                          borderRadius: 12,
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              background: '#7c3aed',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 6
                            }}>
                              Opción {String.fromCharCode(65 + idx)}
                            </span>
                            <strong style={{ fontSize: 14 }}>{it.nombre}</strong>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                            <strong>{it.cantidad} unidades</strong> • {formatCurrency(unitPrice)} c/u
                          </div>
                          {(it.medida || it.material || it.acabado || it.descripcion) && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                              {[
                                it.medida,
                                it.material,
                                it.acabado,
                                it.descripcion ? `📝 ${it.descripcion}` : null
                              ].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>
                            {formatCurrency(itemTot)}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 12, padding: '5px 12px', fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
                            onClick={() => handleAprobarOpcion(pedidoOpcionesModal, idx)}
                          >
                            ✓ Elegir esta Opción
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#64748b', fontSize: 12 }}
                  onClick={() => handleAprobarOpcion(pedidoOpcionesModal, 'todos')}
                  title="Aprobar todos los ítems juntos sumando el total"
                >
                  Aprobar todas combinadas ({formatCurrency(pedidoOpcionesModal.total)})
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPedidoOpcionesModal(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
