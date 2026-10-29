'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Servicio, Pedido } from '@/lib/types'
import { formatCurrency, generateNumeroEcommerce, formatWhatsAppMessage, LINEAS_IMPRENTA, formatProductUnit, cleanProductDescription, completarPedidoTienda, getVariantesServicio, LOGO_URL } from '@/lib/helpers'
import {
  Search, ShoppingCart, Truck, User, Plus, Minus, Trash2,
  X, Check, Phone, MapPin,
  Clock, Filter, ArrowRight,
  Package, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown,
  MessageSquare, Building2, Store, CreditCard, Banknote, ShieldCheck,
  LogIn, LogOut, UserCheck
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import WhatsAppWidget from '@/components/WhatsAppWidget'
import CategoryIcon, { DEFAULT_CATEGORY_VECTOR_MAP } from '@/components/CategoryIcon'
import CustomerAuthModal from '@/components/CustomerAuthModal'
import StoreHeader from '@/components/StoreHeader'
import ProductoModal, { ProductoSeleccion } from '@/components/ProductoModal'
import { TEXTOS_PIE_TIENDA, leerConfigTienda } from '@/lib/configTienda'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface CartItem {
  servicio: Servicio
  cantidad: number
  subtotal: number
  variante?: string
  escala?: { cantidad: number; precio: number } // tirada elegida: la cantidad avanza de a tiradas completas
}

// Un mismo producto con otra variable o tirada es otro renglón del carrito
const claveItem = (it: Pick<CartItem, 'servicio' | 'variante' | 'escala'>) =>
  [it.servicio.id, it.variante || '', it.escala?.cantidad || ''].join('|')

export interface BannerSlideItem {
  id: string | number
  desktopUrl: string
  mobileUrl?: string
  activo?: boolean
}

// Banners de prueba por defecto (Solo imágenes sin texto superpuesto)
const DEFAULT_BANNERS: BannerSlideItem[] = [
  {
    id: 1,
    desktopUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=80',
    mobileUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    activo: true
  },
  {
    id: 2,
    desktopUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=1600&auto=format&fit=crop&q=80',
    mobileUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    activo: true
  },
  {
    id: 3,
    desktopUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&auto=format&fit=crop&q=80',
    mobileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    activo: true
  }
]

// Fallback images for printing categories
const CATEGORY_IMAGES: Record<string, string> = {
  'Tarjetas': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
  'Folletos': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  'Facturas': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
  'Stickers': 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=600&auto=format&fit=crop&q=80',
  'Imanes': 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
  'Afiches': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=80',
  'Banderas': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80',
  'Block de Notas': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
  'Documentos para Impresora': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
  'Sobres': 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&auto=format&fit=crop&q=80',
  'Hojas Membretadas': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
  'Llaveros': 'https://images.unsplash.com/photo-1614312134515-585973e44502?w=600&auto=format&fit=crop&q=80',
  'Grifas Etiquetas': 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=600&auto=format&fit=crop&q=80',
  'default': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80'
}

export default function TiendaPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas')
  const [selectedLinea, setSelectedLinea] = useState<string>('Todas')
  const [sortBy, setSortBy] = useState<'relevancia' | 'precio_menor' | 'precio_mayor' | 'nombre'>('relevancia')

  // Carousel Banner state (Active slide index)
  const [banners, setBanners] = useState<BannerSlideItem[]>(DEFAULT_BANNERS)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  // Store Configuration
  const [storeConfig, setStoreConfig] = useState({
    nombreTienda: 'GUGA Imprenta & Gráfica',
    telefonoWhatsApp: '59899724454',
    direccionTaller: 'Chiossi y Luxemburgo, Maldonado',
    costoEnvioFijo: 250,
    envioGratisMinimo: 4000,
    mensajeBienvenida: '¡Bienvenido a GUGA Imprenta Online! Tu trabajo en las mejores manos.',
    instagramUrl: 'gugaprint.uy',
    ...TEXTOS_PIE_TIENDA,
  })

  // WhatsApp store phone
  const STORE_PHONE = storeConfig.telefonoWhatsApp || '59899724454'

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Order Tracking State
  const [isTrackOpen, setIsTrackOpen] = useState(false)
  const [trackQuery, setTrackQuery] = useState('')
  const [trackedOrders, setTrackedOrders] = useState<Pedido[]>([])
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)

  // Customer Login/Identify modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    id: '',
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
    rut: '',
    empresa: ''
  })

  // Checkout Form
  const [checkoutForm, setCheckoutForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
    metodoEntrega: 'retiro', // 'retiro' | 'envio'
    metodoPago: 'efectivo',  // 'efectivo' | 'transferencia' | 'mercadopago'
    notas: '',
  })
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ pedidoNumero: string; whatsappUrl: string } | null>(null)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [productoAbierto, setProductoAbierto] = useState<Servicio | null>(null)
  const [carritoCargado, setCarritoCargado] = useState(false)

  // Category Vector Line Icons State
  const [categoryVectorIcons, setCategoryVectorIcons] = useState<Record<string, string>>(DEFAULT_CATEGORY_VECTOR_MAP)

  useEffect(() => {
    loadCatalog()

    // Load store admin config (banners & params)
    const aplicarConfig = (parsed: any) => {
      setStoreConfig(prev => ({ ...prev, ...parsed }))
      if (parsed.banners && Array.isArray(parsed.banners) && parsed.banners.length > 0) {
        const active = parsed.banners.filter((b: any) => b.activo !== false && (b.desktopUrl || b.mobileUrl))
        if (active.length > 0) {
          setBanners(active)
        }
      } else if (parsed.bannerDesktopUrl || parsed.bannerMobileUrl) {
        setBanners([{
          id: 1,
          desktopUrl: parsed.bannerDesktopUrl || parsed.bannerMobileUrl,
          mobileUrl: parsed.bannerMobileUrl || parsed.bannerDesktopUrl,
          activo: true
        }])
      }
    }
    const savedConfig = localStorage.getItem('guga_store_admin_config')
    if (savedConfig) {
      try {
        aplicarConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.error('Error cargando configuración de tienda:', e)
      }
    }
    leerConfigTienda().then(conf => { if (conf) aplicarConfig(conf) })

    // Load customer info from localStorage
    const savedCustomer = localStorage.getItem('guga_store_customer')
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer)
        setCustomerInfo(prev => ({ ...prev, ...parsed }))
        setCheckoutForm(prev => ({
          ...prev,
          nombre: parsed.nombre || '',
          telefono: parsed.telefono || '',
          direccion: parsed.direccion || '',
          email: parsed.email || '',
        }))
      } catch (e) {
        console.error(e)
      }
    }

    // Load saved cart from localStorage
    const savedCart = localStorage.getItem('guga_store_cart') || localStorage.getItem('guga_cart_items')
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed)
        }
      } catch (e) {
        console.error('Error cargando carrito guardado:', e)
      }
    }
    setCarritoCargado(true)

    // Check if URL has ?openCart=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('openCart') === 'true') {
        setIsCartOpen(true)
      }
    }

    // Load custom category vector line icons
    const savedIcons = localStorage.getItem('guga_category_vector_icons')
    if (savedIcons) {
      try {
        setCategoryVectorIcons(prev => ({ ...prev, ...JSON.parse(savedIcons) }))
      } catch (e) {
        console.error(e)
      }
    }

    // Load and apply custom SEO configuration to Document Head
    const savedSeo = localStorage.getItem('guga_store_seo_config')
    if (savedSeo) {
      try {
        const seo = JSON.parse(savedSeo)
        if (seo.metaTitle) {
          document.title = seo.metaTitle
        }

        const setMetaTag = (nameOrProp: string, key: 'name' | 'property', value: string) => {
          if (!value) return
          let el = document.querySelector(`meta[${key}="${nameOrProp}"]`) as HTMLMetaElement
          if (!el) {
            el = document.createElement('meta')
            el.setAttribute(key, nameOrProp)
            document.head.appendChild(el)
          }
          el.content = value
        }

        if (seo.metaDescription) {
          setMetaTag('description', 'name', seo.metaDescription)
          setMetaTag('og:description', 'property', seo.metaDescription)
        }
        if (seo.metaTitle) {
          setMetaTag('og:title', 'property', seo.metaTitle)
        }
        if (seo.keywords) {
          setMetaTag('keywords', 'name', seo.keywords)
        }
        if (seo.ogImageUrl) {
          setMetaTag('og:image', 'property', seo.ogImageUrl)
        }
        if (seo.canonicalUrl) {
          setMetaTag('og:url', 'property', seo.canonicalUrl)
        }
        if (seo.robotsIndex !== undefined) {
          setMetaTag('robots', 'name', seo.robotsIndex ? 'index, follow' : 'noindex, nofollow')
        }
        if (seo.googleSiteVerification) {
          setMetaTag('google-site-verification', 'name', seo.googleSiteVerification)
        }
      } catch (e) {
        console.error('Error applying SEO meta tags:', e)
      }
    }
  }, [])

  // Auto-rotate the banners every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  const nextBanner = () => {
    if (banners.length <= 1) return
    setCurrentBannerIndex(prev => (prev + 1) % banners.length)
  }

  const prevBanner = () => {
    if (banners.length <= 1) return
    setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length)
  }

  const loadCatalog = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('disponible', true)
      .order('categoria')
      .order('nombre')

    if (!error && data) {
      setServicios(data)
    }
    setLoading(false)
  }

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Todas': servicios.length }
    servicios.forEach(s => {
      const cat = s.categoria || 'Otros'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [servicios])

  // Extract unique lines / finishes from names or categories
  const lineasConConteo = useMemo(() => {
    const counts: Record<string, number> = { 'Todas': servicios.length }
    LINEAS_IMPRENTA.forEach(linea => {
      const words = linea.toLowerCase().split(' ')
      const matches = servicios.filter(s => {
        const full = `${s.nombre} ${s.descripcion || ''} ${s.categoria}`.toLowerCase()
        return words.some(w => w.length > 3 && full.includes(w))
      })
      if (matches.length > 0) {
        counts[linea] = matches.length
      }
    })
    return counts
  }, [servicios])

  // Screen size & Responsive Numbered Pagination (Mobile vs Desktop)
  const [isMobile, setIsMobile] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = isMobile ? 6 : 12

  // Detect mobile / desktop viewport
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reset to page 1 when filters, search, sort, or screen mode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategoria, selectedLinea, searchTerm, sortBy, isMobile])

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...servicios]

    // Category filter
    if (selectedCategoria !== 'Todas') {
      result = result.filter(s => s.categoria === selectedCategoria)
    }

    // Line / Finish filter
    if (selectedLinea !== 'Todas') {
      const words = selectedLinea.toLowerCase().split(' ')
      result = result.filter(s => {
        const full = `${s.nombre} ${s.descripcion || ''} ${s.categoria}`.toLowerCase()
        return words.some(w => w.length > 3 && full.includes(w))
      })
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(s =>
        s.nombre.toLowerCase().includes(q) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(q)) ||
        s.categoria.toLowerCase().includes(q)
      )
    }

    // Sorting
    if (sortBy === 'precio_menor') {
      result.sort((a, b) => a.precio_base - b.precio_base)
    } else if (sortBy === 'precio_mayor') {
      result.sort((a, b) => b.precio_base - a.precio_base)
    } else if (sortBy === 'nombre') {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }

    return result
  }, [servicios, selectedCategoria, selectedLinea, searchTerm, sortBy])

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))

  // Slice products for current page
  const displayedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Change page & scroll to catalog top
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    const catalogoEl = document.getElementById('catalogo-section')
    if (catalogoEl) {
      catalogoEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Guardar el carrito para que no se pierda al recargar, navegar o volver de Google
  useEffect(() => {
    if (!carritoCargado) return
    try {
      localStorage.setItem('guga_store_cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('storage'))
    } catch {}
  }, [cart, carritoCargado])

  // Carritos abandonados: se guarda el carrito con los datos del cliente para verlo en Panel → E-commerce
  const timerCarrito = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pedidoEnCurso = useRef(false)

  const sincronizarCarrito = async (estado: 'activo' | 'convertido' = 'activo', pedidoNumero?: string) => {
    if (estado === 'activo' && pedidoEnCurso.current) return
    let id = localStorage.getItem('guga_cart_id')
    if (!id) {
      if (cart.length === 0) return
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
      localStorage.setItem('guga_cart_id', id)
    }
    let perfil: { nombre?: string; telefono?: string; email?: string } = {}
    try { perfil = JSON.parse(localStorage.getItem('guga_store_customer') || '{}') } catch {}
    const { error } = await supabase.from('carritos').upsert({
      id,
      cliente_nombre: checkoutForm.nombre.trim() || perfil.nombre || null,
      cliente_telefono: checkoutForm.telefono.trim() || perfil.telefono || null,
      cliente_email: checkoutForm.email.trim() || perfil.email || null,
      items: cart.map(it => ({ nombre: it.servicio.nombre, variante: it.variante || null, cantidad: it.cantidad, subtotal: it.subtotal })),
      total: cart.reduce((acc, it) => acc + it.subtotal, 0),
      estado,
      pedido_numero: pedidoNumero || null,
      updated_at: new Date().toISOString(),
    })
    if (error) console.warn('No se pudo guardar el carrito (¿falta ejecutar supabase/tienda.sql?):', error.message)
  }

  useEffect(() => {
    if (!carritoCargado) return
    if (timerCarrito.current) clearTimeout(timerCarrito.current)
    timerCarrito.current = setTimeout(() => { sincronizarCarrito() }, 1500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, carritoCargado, checkoutForm.nombre, checkoutForm.telefono, checkoutForm.email])

  // Cart Actions
  const addToCart = (srv: Servicio, seleccion: ProductoSeleccion) => {
    const nuevo: CartItem = { servicio: srv, ...seleccion }
    setCart(prev => {
      const index = prev.findIndex(item => claveItem(item) === claveItem(nuevo))
      if (index < 0) return [...prev, nuevo]
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        cantidad: updated[index].cantidad + nuevo.cantidad,
        subtotal: updated[index].subtotal + nuevo.subtotal,
      }
      return updated
    })
    setProductoAbierto(null)
    toast.success(`"${srv.nombre}${seleccion.variante ? ` — ${seleccion.variante}` : ''}" agregado al carrito`)
  }

  const updateCartQty = (clave: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (claveItem(item) !== clave) return item
      if (item.escala) {
        const tiradas = Math.max(1, Math.round(item.cantidad / item.escala.cantidad) + delta)
        return { ...item, cantidad: tiradas * item.escala.cantidad, subtotal: tiradas * item.escala.precio }
      }
      const newQty = Math.max(1, item.cantidad + delta)
      return { ...item, cantidad: newQty, subtotal: newQty * item.servicio.precio_base }
    }))
  }

  const removeFromCart = (clave: string) => {
    setCart(prev => prev.filter(item => claveItem(item) !== clave))
  }

  // Precio a mostrar en la tarjeta: la tirada más barata si el producto tiene variables con tiradas
  const precioDesde = (srv: Servicio) => {
    const escalas = getVariantesServicio(srv).flatMap(v => v.escalas || []).filter(e => e.precio > 0)
    if (escalas.length === 0) return null
    return escalas.reduce((min, e) => (e.precio < min.precio ? e : min))
  }

  const cartCount = cart.reduce((acc, it) => acc + it.cantidad, 0)
  const cartSubtotal = cart.reduce((acc, it) => acc + it.subtotal, 0)
  const shippingCost = checkoutForm.metodoEntrega === 'envio' ? (cartSubtotal >= 4000 ? 0 : 250) : 0
  const cartTotal = cartSubtotal + shippingCost

  // Save Customer Info
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerInfo.nombre || !customerInfo.telefono) {
      toast.error('Por favor ingresá tu nombre y teléfono')
      return
    }
    localStorage.setItem('guga_store_customer', JSON.stringify(customerInfo))
    setCheckoutForm(prev => ({
      ...prev,
      nombre: customerInfo.nombre,
      telefono: customerInfo.telefono,
      direccion: customerInfo.direccion || prev.direccion,
      email: customerInfo.email || prev.email,
    }))
    setIsAuthModalOpen(false)
    toast.success('Datos guardados correctamente')
  }

  // Handle Checkout Order Submission
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutForm.nombre.trim() || !checkoutForm.telefono.trim()) {
      toast.error('Por favor completá tu nombre y teléfono de contacto')
      return
    }
    if (checkoutForm.metodoEntrega === 'envio' && !checkoutForm.direccion.trim()) {
      toast.error('Por favor ingresá la dirección de entrega')
      return
    }
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    setIsSubmittingOrder(true)
    pedidoEnCurso.current = true
    if (timerCarrito.current) clearTimeout(timerCarrito.current)
    try {
      const pedidoNumero = generateNumeroEcommerce()

      const itemsForOrder = cart.map(it => ({
        producto_id: it.servicio.id,
        nombre: it.variante ? `${it.servicio.nombre} — ${it.variante}` : it.servicio.nombre,
        variante_nombre: it.variante || undefined,
        acabado: it.variante || undefined,
        cantidad: it.cantidad,
        precio_unitario: it.cantidad > 0 ? Math.round((it.subtotal / it.cantidad) * 100) / 100 : it.servicio.precio_base,
        subtotal: it.subtotal,
        unidad: it.servicio.unidad || 'unidad',
        imagen_url: it.servicio.imagen_url || '',
      }))

      // 1. Upsert / Buscar cliente en la tabla clientes
      let clienteId: string | null = null
      const cleanDigits = checkoutForm.telefono.trim().replace(/\D/g, '')

      try {
        let cltQuery = supabase.from('clientes').select('id, nombre, telefono, direccion, email')
        if (cleanDigits.length >= 7) {
          cltQuery = cltQuery.or(`telefono.ilike.%${cleanDigits}%,telefono.ilike.%${checkoutForm.telefono.trim()}%`)
        } else if (checkoutForm.email.trim()) {
          cltQuery = cltQuery.eq('email', checkoutForm.email.trim().toLowerCase())
        } else {
          cltQuery = cltQuery.eq('nombre', checkoutForm.nombre.trim())
        }

        const { data: existingClts } = await cltQuery.limit(1)

        if (existingClts && existingClts.length > 0) {
          clienteId = existingClts[0].id
          // Update client details if they provided new address or email
          if (checkoutForm.direccion.trim() || checkoutForm.email.trim()) {
            await supabase
              .from('clientes')
              .update({
                direccion: checkoutForm.direccion.trim() || existingClts[0].direccion,
                email: checkoutForm.email.trim() || existingClts[0].email
              })
              .eq('id', existingClts[0].id)
          }
        } else {
          const { data: newClt } = await supabase
            .from('clientes')
            .insert([{
              nombre: checkoutForm.nombre.trim(),
              telefono: checkoutForm.telefono.trim(),
              direccion: checkoutForm.direccion.trim() || undefined,
              email: checkoutForm.email.trim() || undefined,
              tipo: 'web',
              notas: '[Origen: E-commerce Web] Registrado desde la Tienda Online',
            }])
            .select('id')
            .single()
          if (newClt) clienteId = newClt.id
        }
      } catch (cltErr) {
        console.warn('Customer upsert non-blocking error:', cltErr)
      }

      // 2. Formatear notas completas para el pedido (compatibles 100% con la base de datos)
      const formattedNotas = [
        `[TIENDA ONLINE]`,
        `Tel: ${checkoutForm.telefono.trim()}`,
        `Entrega: ${checkoutForm.metodoEntrega.toUpperCase()} (${checkoutForm.metodoEntrega === 'envio' ? (checkoutForm.direccion.trim() || 'Dirección no especificada') : 'Retiro en Local'})`,
        `Pago: ${checkoutForm.metodoPago.toUpperCase()}`,
        checkoutForm.email.trim() ? `Email: ${checkoutForm.email.trim()}` : null,
        shippingCost > 0 ? `Envío: $${shippingCost}` : null,
        checkoutForm.notas.trim() ? `Notas cliente: ${checkoutForm.notas.trim()}` : null
      ].filter(Boolean).join(' | ')

      // 3. Crear payload limpio para Supabase
      const newPedidoPayload: any = {
        numero: pedidoNumero,
        cliente_id: clienteId,
        cliente_nombre: checkoutForm.nombre.trim(),
        cliente_telefono: checkoutForm.telefono.trim(),
        cliente_direccion: checkoutForm.direccion.trim() || (checkoutForm.metodoEntrega === 'retiro' ? 'Retiro en Taller' : ''),
        items: itemsForOrder,
        subtotal: cartSubtotal,
        descuento: 0,
        total: cartTotal,
        metodo_pago: checkoutForm.metodoPago,
        estado: 'presupuesto',
        origen: 'ecommerce',
        notas: formattedNotas,
      }

      // 4. Inserción con reintento seguro: si la tabla no tiene alguna columna opcional
      // (cliente_telefono, cliente_direccion, origen...) se quita y se reintenta; el dato ya va en notas
      let pedidoError: { code?: string; message: string } | null = null
      for (let intento = 0; intento < 8; intento++) {
        const { error } = await supabase.from('pedidos').insert([newPedidoPayload])
        pedidoError = error
        if (!error) break

        const columnaFaltante = error.code === 'PGRST204' ? error.message.match(/'([^']+)' column/)?.[1] : undefined
        if (columnaFaltante && columnaFaltante in newPedidoPayload) {
          delete newPedidoPayload[columnaFaltante]
        } else if ('cliente_id' in newPedidoPayload) {
          console.warn('Insert attempt failed, trying fallback without cliente_id:', error)
          delete newPedidoPayload.cliente_id
        } else {
          break
        }
      }

      if (pedidoError) {
        console.error('Order insert failed:', pedidoError)
        throw new Error('No se pudo guardar el pedido en la base de datos: ' + pedidoError.message)
      }

      // El carrito pasó a ser un pedido: deja de figurar como abandonado
      pedidoEnCurso.current = false
      await sincronizarCarrito('convertido', pedidoNumero)
      localStorage.removeItem('guga_cart_id')

      // Save customer details in localStorage
      localStorage.setItem('guga_store_customer', JSON.stringify({
        nombre: checkoutForm.nombre,
        telefono: checkoutForm.telefono,
        direccion: checkoutForm.direccion,
        email: checkoutForm.email,
      }))

      // Save order in local history for "Mis Pedidos"
      const localHistory = JSON.parse(localStorage.getItem('guga_my_orders') || '[]')
      localHistory.unshift({
        numero: pedidoNumero,
        fecha: new Date().toISOString(),
        total: cartTotal,
        itemsCount: cartCount,
      })
      localStorage.setItem('guga_my_orders', JSON.stringify(localHistory))

      // Generate WhatsApp Link
      const waEncoded = formatWhatsAppMessage(
        pedidoNumero,
        checkoutForm.nombre,
        checkoutForm.telefono,
        itemsForOrder,
        cartTotal,
        checkoutForm.metodoEntrega,
        checkoutForm.direccion,
        checkoutForm.metodoPago,
        checkoutForm.notas
      )
      const whatsappUrl = `https://wa.me/${STORE_PHONE}?text=${waEncoded}`

      setOrderSuccess({
        pedidoNumero,
        whatsappUrl,
      })

      // Clear cart
      setCart([])
      setIsCheckoutOpen(false)
      setIsCartOpen(false)
      toast.success('¡Pedido realizado con éxito!')
    } catch (err: any) {
      toast.error('Ocurrió un error al procesar el pedido: ' + err.message)
    } finally {
      pedidoEnCurso.current = false
      setIsSubmittingOrder(false)
    }
  }

  // Track Orders
  const handleTrackOrders = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!trackQuery.trim()) {
      toast.error('Ingresá tu teléfono o número de pedido')
      return
    }

    setIsTrackingLoading(true)
    const q = trackQuery.trim()

    try {
      let query = supabase.from('pedidos').select('*')
      if (q.toUpperCase().startsWith('ECO-') || q.toUpperCase().startsWith('P-')) {
        query = query.eq('numero', q.toUpperCase())
      } else {
        // Los pedidos de la tienda llevan el teléfono dentro de notas
        query = query.ilike('notas', `%${q}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(10)
      if (error) throw error
      setTrackedOrders((data || []).map(completarPedidoTienda))
      if (!data || data.length === 0) {
        toast('No se encontraron pedidos con ese dato')
      }
    } catch (err: any) {
      toast.error('Error al buscar pedidos: ' + err.message)
    } finally {
      setIsTrackingLoading(false)
    }
  }

  const getProductImage = (srv: Servicio) => {
    if (srv.imagen_url && srv.imagen_url.startsWith('http')) return srv.imagen_url
    if (srv.imagen_url && srv.imagen_url.startsWith('data:image')) return srv.imagen_url
    return CATEGORY_IMAGES[srv.categoria] || CATEGORY_IMAGES['default']
  }

  const activeBannersList = banners.filter(b => b.activo !== false)
  const currentBanner = activeBannersList[currentBannerIndex] || activeBannersList[0] || DEFAULT_BANNERS[0]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* UNIFIED STORE HEADER */}
      <StoreHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenCart={() => setIsCartOpen(true)}
        activePage="tienda"
        cartCountOverride={cartCount}
        cartSubtotalOverride={cartSubtotal}
      />

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px 16px' }}>

        {/* HERO SECTION WITH TITLE & SEARCH */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)',
              fontWeight: 800,
              color: '#334155',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              Encuentra lo que necesitas
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0 0' }}>
              Catálogo oficial de productos, formatos y presupuestos de <strong>GUGA Imprenta</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Mobile Filter Button (Visible on screens <= 960px) */}
            <button
              type="button"
              className="tienda-mobile-filter-trigger"
              onClick={() => setIsMobileFiltersOpen(true)}
              style={{
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: (selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') ? '1.5px solid #149b8e' : '1px solid #cbd5e1',
                backgroundColor: (selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') ? 'rgba(20, 155, 142, 0.08)' : '#ffffff',
                color: (selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') ? '#149b8e' : '#334155',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <Filter size={15} color={(selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') ? '#149b8e' : '#64748b'} />
              <span>Filtros {(selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') ? '•' : ''}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="relevancia">Relevancia</option>
                <option value="precio_menor">Precio: Menor a Mayor</option>
                <option value="precio_mayor">Precio: Mayor a Menor</option>
                <option value="nombre">Nombre A - Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* LAYOUT GRID: SIDEBAR FILTERS (LEFT) + HERO BANNER & PRODUCTS (RIGHT) */}
        <div className="tienda-main-grid">

          {/* LEFT SIDEBAR FILTERS (DESKTOP) */}
          <aside className="tienda-sidebar-desktop" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            position: 'sticky',
            top: '90px'
          }}>

            {/* Filter Group 2: Categoría */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Categorías
                </h3>
                {selectedCategoria !== 'Todas' && (
                  <button
                    onClick={() => setSelectedCategoria('Todas')}
                    style={{ background: 'none', border: 'none', color: '#149b8e', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Borrar
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => setSelectedCategoria('Todas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedCategoria === 'Todas' ? 'rgba(20, 155, 142, 0.1)' : 'transparent',
                    color: selectedCategoria === 'Todas' ? '#149b8e' : '#334155',
                    fontSize: '13px',
                    fontWeight: selectedCategoria === 'Todas' ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <CategoryIcon
                      iconId={categoryVectorIcons['Todas'] || 'layout-grid'}
                      size={17}
                      color={selectedCategoria === 'Todas' ? '#149b8e' : '#64748b'}
                      strokeWidth={2}
                    />
                    <span>Todas</span>
                  </span>
                  <span style={{
                    backgroundColor: selectedCategoria === 'Todas' ? '#149b8e' : '#f1f5f9',
                    color: selectedCategoria === 'Todas' ? 'white' : '#64748b',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {servicios.length}
                  </span>
                </button>

                {Object.entries(categoryCounts).filter(([cat]) => cat !== 'Todas').map(([cat, count]) => {
                  const isSelected = selectedCategoria === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoria(isSelected ? 'Todas' : cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isSelected ? 'rgba(20, 155, 142, 0.1)' : 'transparent',
                        color: isSelected ? '#149b8e' : '#334155',
                        fontSize: '13px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '9px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        <CategoryIcon
                          iconId={categoryVectorIcons[cat] || cat}
                          size={17}
                          color={isSelected ? '#149b8e' : '#64748b'}
                          strokeWidth={1.9}
                        />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cat}</span>
                      </span>
                      <span style={{
                        backgroundColor: isSelected ? '#149b8e' : '#f1f5f9',
                        color: isSelected ? 'white' : '#64748b',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginLeft: '8px',
                        flexShrink: 0
                      }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Direct Contact Card */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                ¿Buscas un trabajo a medida?
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                Cotizá cantidades personalizadas, troqueles especiales o diseños únicos por WhatsApp.
              </p>
              <a
                href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent('Hola GUGA Imprenta, quiero consultar por un presupuesto a medida.')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <WhatsAppIcon size={16} color="white" />
                <span>Hablar con Asesor</span>
              </a>
            </div>

          </aside>

          {/* RIGHT COLUMN: SLEEK HERO BANNER CAROUSEL & PRODUCT GRID */}
          <div id="catalogo-section">

            {/* MOBILE HORIZONTAL CATEGORY SCROLL BAR (Visible on screens <= 960px) */}
            <div className="tienda-mobile-categories-bar">
              <button
                type="button"
                onClick={() => setSelectedCategoria('Todas')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: selectedCategoria === 'Todas' ? '1.5px solid #149b8e' : '1px solid #cbd5e1',
                  backgroundColor: selectedCategoria === 'Todas' ? '#149b8e' : '#ffffff',
                  color: selectedCategoria === 'Todas' ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: selectedCategoria === 'Todas' ? '0 2px 6px rgba(20,155,142,0.3)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <CategoryIcon
                  iconId={categoryVectorIcons['Todas'] || 'layout-grid'}
                  size={14}
                  color={selectedCategoria === 'Todas' ? '#ffffff' : '#64748b'}
                  strokeWidth={2}
                />
                <span>Todas</span>
                <span style={{
                  backgroundColor: selectedCategoria === 'Todas' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: selectedCategoria === 'Todas' ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 800
                }}>
                  {servicios.length}
                </span>
              </button>

              {Object.entries(categoryCounts).filter(([cat]) => cat !== 'Todas').map(([cat, count]) => {
                const isSelected = selectedCategoria === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoria(isSelected ? 'Todas' : cat)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '999px',
                      border: isSelected ? '1.5px solid #149b8e' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#149b8e' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 2px 6px rgba(20,155,142,0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <CategoryIcon
                      iconId={categoryVectorIcons[cat] || cat}
                      size={14}
                      color={isSelected ? '#ffffff' : '#64748b'}
                      strokeWidth={1.9}
                    />
                    <span>{cat}</span>
                    <span style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontSize: '10.5px',
                      fontWeight: 800
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* COMPACT & SLEEK IMAGE BANNER CAROUSEL (100% Solo Imágenes sin texto) */}
            {activeBannersList && activeBannersList.length > 0 && (
              <div style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                backgroundColor: '#f1f5f9',
                width: '100%',
                height: 'clamp(130px, 28vw, 210px)',
                lineHeight: 0
              }}>
                {/* Picture Banner with Desktop & Mobile sources */}
                <picture style={{ width: '100%', height: '100%', display: 'block' }}>
                  {currentBanner.mobileUrl && (
                    <source
                      media="(max-width: 767px)"
                      srcSet={currentBanner.mobileUrl}
                    />
                  )}
                  {currentBanner.desktopUrl && (
                    <source
                      media="(min-width: 768px)"
                      srcSet={currentBanner.desktopUrl}
                    />
                  )}
                  <img
                    src={currentBanner.desktopUrl || currentBanner.mobileUrl}
                    alt="Banner GUGA Imprenta"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </picture>

                {/* Prev / Next Arrows */}
                {activeBannersList.length > 1 && (
                  <>
                    <button
                      onClick={prevBanner}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#0f172a',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        zIndex: 3,
                        transition: 'background 0.2s, transform 0.15s'
                      }}
                      title="Banner anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={nextBanner}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#0f172a',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        zIndex: 3,
                        transition: 'background 0.2s, transform 0.15s'
                      }}
                      title="Siguiente banner"
                    >
                      <ChevronRight size={18} />
                    </button>

                    {/* Carousel Dots */}
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 3,
                      background: 'rgba(0,0,0,0.3)',
                      padding: '4px 8px',
                      borderRadius: '12px'
                    }}>
                      {activeBannersList.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentBannerIndex(idx)}
                          style={{
                            width: currentBannerIndex === idx ? '20px' : '6px',
                            height: '6px',
                            borderRadius: '3px',
                            backgroundColor: currentBannerIndex === idx ? '#ffffff' : 'rgba(255,255,255,0.5)',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 0.25s ease'
                          }}
                          aria-label={`Ir al banner ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ACTIVE FILTERS CHIPS */}
            {(selectedCategoria !== 'Todas' || selectedLinea !== 'Todas' || searchTerm) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '18px',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Filtros aplicados:</span>
                {selectedCategoria !== 'Todas' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(20, 155, 142, 0.1)',
                    color: '#149b8e',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <CategoryIcon iconId={categoryVectorIcons[selectedCategoria] || selectedCategoria} size={14} color="#149b8e" strokeWidth={2} />
                    <span>Categoría: {selectedCategoria}</span>
                    <X size={13} style={{ cursor: 'pointer', marginLeft: '2px' }} onClick={() => setSelectedCategoria('Todas')} />
                  </span>
                )}
                {selectedLinea !== 'Todas' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(20, 155, 142, 0.1)',
                    color: '#149b8e',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    Línea: {selectedLinea}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedLinea('Todas')} />
                  </span>
                )}
                {searchTerm && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    Búsqueda: &quot;{searchTerm}&quot;
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                  </span>
                )}
                <button
                  onClick={() => { setSelectedCategoria('Todas'); setSelectedLinea('Todas'); setSearchTerm(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  Limpiar todo
                </button>
              </div>
            )}

            {/* PRODUCT GRID CONTAINER */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#149b8e',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px auto'
                }} />
                <p style={{ fontSize: '15px', fontWeight: 600 }}>Cargando catálogo de GUGA Imprenta...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <Package size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  No se encontraron productos
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Prueba cambiando los filtros seleccionados o la palabra de búsqueda.
                </p>
                <button
                  onClick={() => { setSelectedCategoria('Todas'); setSelectedLinea('Todas'); setSearchTerm(''); }}
                  style={{
                    backgroundColor: '#149b8e',
                    color: 'white',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Ver todo el catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="tienda-products-grid">
                  {displayedProducts.map((srv) => {
                  const enCarrito = cart.some(it => it.servicio.id === srv.id)
                  const desde = precioDesde(srv)
                  const imgUrl = getProductImage(srv)

                  return (
                    <div
                      key={srv.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Product Image Container */}
                      <div
                        className="product-card-img-container"
                        onClick={() => setProductoAbierto(srv)}
                        style={{
                          cursor: 'pointer',
                          height: '180px',
                          backgroundColor: '#f1f5f9',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={srv.nombre}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease'
                          }}
                        />

                        {/* Category Badge with Vector Line Icon */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(15, 23, 42, 0.82)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CategoryIcon iconId={categoryVectorIcons[srv.categoria] || srv.categoria} size={12} color="#ffffff" strokeWidth={2} />
                          <span style={{ textTransform: 'uppercase' }}>{srv.categoria}</span>
                        </div>
                      </div>

                      {/* Product Body */}
                      <div className="product-card-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4
                            className="product-card-title"
                            style={{
                              fontSize: '14.5px',
                              fontWeight: 700,
                              color: '#0f172a',
                              margin: '0 0 2px 0',
                              lineHeight: '1.3',
                              minHeight: '38px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {srv.nombre}
                          </h4>

                          {srv.tiempo_estimado && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                              <Clock size={12} />
                              <span>Entrega: {srv.tiempo_estimado}</span>
                            </div>
                          )}
                        </div>

                        {/* Price & Add to Cart Controls */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div>
                              {desde && (
                                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>Desde</span>
                              )}
                              <span className="product-card-price" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                {formatCurrency(desde ? desde.precio : srv.precio_base)}
                              </span>
                              <span className="product-card-unit" style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                                /{desde ? `${desde.cantidad.toLocaleString('es-UY')} u` : formatProductUnit(srv)}
                              </span>
                            </div>
                          </div>

                          {/* Entrar al producto para elegir variable y cantidad */}
                          <button
                            onClick={() => setProductoAbierto(srv)}
                            className="product-card-btn"
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              backgroundColor: enCarrito ? '#0e746b' : '#149b8e',
                              color: '#ffffff',
                              border: 'none',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                              boxShadow: '0 2px 6px rgba(20, 155, 142, 0.2)'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                          >
                            {enCarrito ? <Check size={14} /> : <ArrowRight size={14} />}
                            <span>{enCarrito ? 'En el carrito · Ver' : 'Ver producto'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            {/* NUMBERED PAGINATION (PÁGINAS 1, 2, 3...) */}
            {totalPages > 1 && (
              <div style={{
                marginTop: '36px',
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {/* Summary Info */}
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textAlign: isMobile ? 'center' : 'left' }}>
                  Página <strong style={{ color: '#0f172a' }}>{currentPage}</strong> de <strong style={{ color: '#0f172a' }}>{totalPages}</strong> · Mostrando <strong style={{ color: '#0f172a' }}>{((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> de <strong style={{ color: '#0f172a' }}>{filteredProducts.length}</strong> productos
                </div>

                {/* Page Navigation Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Previous Page */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff',
                      color: currentPage === 1 ? '#cbd5e1' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    // Smart pagination window for long lists
                    if (
                      totalPages > 6 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      Math.abs(pageNum - currentPage) > 1
                    ) {
                      if (pageNum === 2 && currentPage > 3) {
                        return <span key={pageNum} style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
                      }
                      if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                        return <span key={pageNum} style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
                      }
                      return null
                    }

                    const isActive = currentPage === pageNum
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          minWidth: '38px',
                          height: '38px',
                          padding: '0 8px',
                          borderRadius: '8px',
                          border: isActive ? '1px solid #149b8e' : '1px solid #e2e8f0',
                          backgroundColor: isActive ? '#149b8e' : '#ffffff',
                          color: isActive ? '#ffffff' : '#334155',
                          fontSize: '13.5px',
                          fontWeight: isActive ? 800 : 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isActive ? '0 2px 6px rgba(20, 155, 142, 0.3)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  {/* Next Page */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                      color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
              </>
            )}

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer style={{
        marginTop: '60px',
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        padding: '40px 20px 20px 20px',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '30px',
          marginBottom: '30px'
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}>
              <img
                src={LOGO_URL}
                alt="GUGA Imprenta & Gráfica"
                style={{ height: '46px', maxWidth: '170px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1' }}>
              {storeConfig.textoPie}
            </p>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
              Atención al Cliente
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} color="#149b8e" />
                <span>{storeConfig.horarioRetiro}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={15} color="#149b8e" />
                <span>{storeConfig.textoEnvios}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={15} color="#149b8e" />
                <span>{storeConfig.textoConsultas}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
              Formas de Pago
            </h4>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1' }}>
              {storeConfig.formasPago}
            </p>
          </div>
        </div>

        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          paddingTop: '20px',
          borderTop: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b'
        }}>
          © {new Date().getFullYear()} {storeConfig.textoCopyright}
        </div>
      </footer>

      {/* INTERACTIVE WHATSAPP WIDGET (Expands with ¿Necesitas ayuda?) */}
      <WhatsAppWidget phone={STORE_PHONE} />

      {productoAbierto && (
        <ProductoModal
          servicio={productoAbierto}
          imagenUrl={getProductImage(productoAbierto)}
          onClose={() => setProductoAbierto(null)}
          onAdd={(seleccion) => addToCart(productoAbierto, seleccion)}
        />
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div
            className="tienda-cart-drawer"
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} color="#149b8e" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Tu Carrito ({cartCount})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>Tu carrito está vacío</p>
                  <p style={{ fontSize: '13px' }}>Agregá productos desde el catálogo para armar tu pedido.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {cart.map((it) => (
                    <div
                      key={claveItem(it)}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <img
                        src={getProductImage(it.servicio)}
                        alt={it.servicio.nombre}
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#149b8e', fontWeight: 700 }}>
                          {it.servicio.categoria}
                        </div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: '2px 0 6px 0', lineHeight: '1.2' }}>
                          {it.servicio.nombre}
                        </h4>
                        {(it.variante || it.escala) && (
                          <div style={{ fontSize: '12px', color: '#475569', margin: '-2px 0 6px 0' }}>
                            {[
                              it.variante,
                              it.escala ? `${it.cantidad.toLocaleString('es-UY')} u (${Math.round(it.cantidad / it.escala.cantidad)} × ${it.escala.cantidad.toLocaleString('es-UY')})` : null
                            ].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {formatCurrency(it.subtotal)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => updateCartQty(claveItem(it), -1)}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                            >
                              <Minus size={13} />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                              {it.escala ? Math.round(it.cantidad / it.escala.cantidad) : it.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(claveItem(it), 1)}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(claveItem(it))}
                              style={{ marginLeft: '6px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Eliminar del carrito"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div style={{
                padding: '20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Total Estimado:</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setCart([])}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Vaciar
                  </button>
                  <button
                    onClick={() => {
                      setIsCartOpen(false)
                      setIsCheckoutOpen(true)
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#149b8e',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(20, 155, 142, 0.3)'
                    }}
                  >
                    <span>Iniciar Pedido</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <div
            className="tienda-checkout-modal"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Confirmar Pedido Online
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Ingresá tus datos para registrar el pedido en el sistema de GUGA
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder}>
              {/* Delivery Method */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Tipo de Entrega
                </label>
                <div className="checkout-delivery-buttons" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCheckoutForm(prev => ({ ...prev, metodoEntrega: 'retiro' }))}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: checkoutForm.metodoEntrega === 'retiro' ? '2px solid #149b8e' : '1px solid #cbd5e1',
                      backgroundColor: checkoutForm.metodoEntrega === 'retiro' ? 'rgba(20, 155, 142, 0.08)' : '#f8fafc',
                      color: checkoutForm.metodoEntrega === 'retiro' ? '#149b8e' : '#334155',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Building2 size={16} />
                    <span>Retiro en Taller (Gratis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckoutForm(prev => ({ ...prev, metodoEntrega: 'envio' }))}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: checkoutForm.metodoEntrega === 'envio' ? '2px solid #149b8e' : '1px solid #cbd5e1',
                      backgroundColor: checkoutForm.metodoEntrega === 'envio' ? 'rgba(20, 155, 142, 0.08)' : '#f8fafc',
                      color: checkoutForm.metodoEntrega === 'envio' ? '#149b8e' : '#334155',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Truck size={16} />
                    <span>Envío {cartSubtotal >= 4000 ? '(¡Gratis!)' : '(+$250)'}</span>
                  </button>
                </div>
              </div>

              {/* Customer Info Form */}
              <div className="checkout-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.nombre}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={checkoutForm.telefono}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej. 099 123 456"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              </div>

              {checkoutForm.metodoEntrega === 'envio' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Dirección de Entrega y Localidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.direccion}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle, número, apto, esquina, ciudad"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}

              {/* Payment Method */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Forma de Pago
                </label>
                <select
                  value={checkoutForm.metodoPago}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, metodoPago: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="efectivo">Efectivo al recibir / retirar</option>
                  <option value="transferencia">Transferencia Bancaria (BROU / Itaú / Santander)</option>
                  <option value="mercadopago">Mercado Pago / Tarjeta de Débito/Crédito</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Aclaraciones o detalles para el diseño / producción (opcional)
                </label>
                <textarea
                  rows={2}
                  value={checkoutForm.notas}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Ej. Tengo el archivo en PDF listo / Necesito diseño nuevo / Entrega por la tarde"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Order Summary Box */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#f1f5f9',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Ítems ({cartCount}):</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {checkoutForm.metodoEntrega === 'envio' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>Costo de envío:</span>
                    <span>{shippingCost === 0 ? 'Gratis' : formatCurrency(shippingCost)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #cbd5e1' }}>
                  <span>Total Final:</span>
                  <span style={{ color: '#149b8e' }}>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Volver al carrito
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    cursor: isSubmittingOrder ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{isSubmittingOrder ? 'Procesando...' : 'Confirmar y Enviar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '500px',
            padding: '32px 28px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Check size={36} />
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              ¡Pedido Registrado con Éxito!
            </h3>

            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '18px' }}>
              Tu código de seguimiento es: <strong style={{ color: '#0f172a', fontSize: '16px' }}>{orderSuccess.pedidoNumero}</strong>
            </p>

            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '24px',
              fontSize: '13.5px',
              color: '#166534',
              lineHeight: '1.5'
            }}>
              El pedido ya ingresó a la cola del CRM de <strong>GUGA Imprenta</strong>. Para acelerar la producción o enviarnos tus archivos de diseño, enviá el resumen por WhatsApp.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={orderSuccess.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#25d366',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                }}
              >
                <WhatsAppIcon size={22} color="white" />
                <span>Enviar Resumen a WhatsApp</span>
              </a>

              <button
                onClick={() => setOrderSuccess(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '11px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Seguir Navegando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACK ORDERS MODAL */}
      {isTrackOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={22} color="#149b8e" />
                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Seguimiento de Pedidos
                </h3>
              </div>
              <button onClick={() => setIsTrackOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTrackOrders} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Ingresá tu teléfono o Nº de pedido (ECO-...)"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '13.5px'
                }}
              />
              <button
                type="submit"
                disabled={isTrackingLoading}
                style={{
                  backgroundColor: '#149b8e',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                {isTrackingLoading ? 'Buscando...' : 'Consultar'}
              </button>
            </form>

            {/* Results List */}
            {trackedOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trackedOrders.map((pd) => {
                  let statusBadge = { label: 'Recibido / En Espera', color: '#f59e0b', bg: '#fef3c7' }
                  if (pd.estado === 'aprobado' || pd.estado === 'en_produccion') {
                    statusBadge = { label: 'En Producción / Taller', color: '#0284c7', bg: '#e0f2fe' }
                  } else if (pd.estado === 'terminado') {
                    statusBadge = { label: 'Listo para Retirar / Despachado', color: '#16a34a', bg: '#dcfce7' }
                  } else if (pd.estado === 'entregado') {
                    statusBadge = { label: 'Entregado', color: '#475569', bg: '#f1f5f9' }
                  }

                  return (
                    <div
                      key={pd.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {pd.numero}
                        </span>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: statusBadge.color,
                          backgroundColor: statusBadge.bg,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '8px' }}>
                        Cliente: <strong>{pd.cliente_nombre}</strong> · Total: <strong>{formatCurrency(pd.total)}</strong>
                      </div>

                      {pd.items && pd.items.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {pd.items.map((it, idx) => (
                            <div key={idx}>• {it.nombre} x {it.cantidad}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '13px' }}>
                Ingresá tu número de teléfono o código de pedido para ver las actualizaciones en tiempo real.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE FILTERS SHEET / MODAL */}
      {isMobileFiltersOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'flex-end',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            width: '100%',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.15)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} color="#149b8e" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Filtrar Catálogo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Categorías */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Categorías
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoria('Todas')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: selectedCategoria === 'Todas' ? '1.5px solid #149b8e' : '1px solid #cbd5e1',
                      backgroundColor: selectedCategoria === 'Todas' ? 'rgba(20,155,142,0.1)' : '#f8fafc',
                      color: selectedCategoria === 'Todas' ? '#149b8e' : '#334155',
                      fontSize: '12px',
                      fontWeight: selectedCategoria === 'Todas' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Todas ({servicios.length})
                  </button>
                  {Object.entries(categoryCounts).filter(([k]) => k !== 'Todas').map(([cat, count]) => {
                    const isSelected = selectedCategoria === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoria(isSelected ? 'Todas' : cat)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #149b8e' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? 'rgba(20,155,142,0.1)' : '#f8fafc',
                          color: isSelected ? '#149b8e' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        <CategoryIcon iconId={categoryVectorIcons[cat] || cat} size={13} color={isSelected ? '#149b8e' : '#64748b'} strokeWidth={2} />
                        <span>{cat} ({count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '10px',
              backgroundColor: '#f8fafc'
            }}>
              {(selectedLinea !== 'Todas' || selectedCategoria !== 'Todas') && (
                <button
                  type="button"
                  onClick={() => { setSelectedLinea('Todas'); setSelectedCategoria('Todas'); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#149b8e',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Ver {filteredProducts.length} productos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL CUSTOMER AUTH MODAL */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(cust) => {
          setCustomerInfo(cust)
          setCheckoutForm(prev => ({
            ...prev,
            nombre: cust.nombre || '',
            telefono: cust.telefono || '',
            direccion: cust.direccion || '',
            email: cust.email || ''
          }))
        }}
      />

    </div>
  )
}
