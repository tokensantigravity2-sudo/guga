'use client'

import React from 'react'
import {
  CreditCard, FileText, Receipt, Tag, Flag,
  BookOpen, Printer, Mail, Key, Package,
  Calendar, Folder, Image, Sparkles, Layers,
  ShoppingBag, Gift, Bookmark, Scissors, Box,
  FileCheck, Newspaper, Frame, PenTool, LayoutGrid,
  Percent, FileSpreadsheet, ShieldCheck, Shirt,
  Coffee, QrCode, Stamp, BadgePercent, Palette,
  Ban, LucideProps
} from 'lucide-react'

// Available Vector Line Icons for Categories
export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  // Special: No Icon
  'none': Ban,
  'sin-icono': Ban,

  // Common printing category names
  'todas': LayoutGrid,
  'tarjetas': CreditCard,
  'folletos': FileText,
  'facturas': Receipt,
  'stickers': Tag,
  'imanes': Sparkles,
  'afiches': Image,
  'banderas': Flag,
  'block de notas': BookOpen,
  'documentos para impresora': FileCheck,
  'sobres': Mail,
  'hojas membretadas': FileText,
  'llaveros': Key,
  'packaging': Box,
  'grifas etiquetas': Bookmark,
  'almanaques': Calendar,
  'carpetas': Folder,
  'merchandising': Gift,
  'troquelados': Scissors,
  'diseño': PenTool,
  'remeras': Shirt,
  'indumentaria': Shirt,
  'tazas': Coffee,
  'sellos': Stamp,
  'promociones': BadgePercent,
  'cuadros': Frame,
  'revistas': Newspaper,
  'bolsas': ShoppingBag,

  // Icon ID names (for selector in admin panel)
  'credit-card': CreditCard,
  'file-text': FileText,
  'receipt': Receipt,
  'tag': Tag,
  'flag': Flag,
  'book-open': BookOpen,
  'printer': Printer,
  'mail': Mail,
  'key': Key,
  'package': Package,
  'calendar': Calendar,
  'folder': Folder,
  'image': Image,
  'sparkles': Sparkles,
  'layers': Layers,
  'shopping-bag': ShoppingBag,
  'gift': Gift,
  'bookmark': Bookmark,
  'scissors': Scissors,
  'box': Box,
  'file-check': FileCheck,
  'newspaper': Newspaper,
  'frame': Frame,
  'pen-tool': PenTool,
  'layout-grid': LayoutGrid,
  'file-spreadsheet': FileSpreadsheet,
  'shield-check': ShieldCheck,
  'percent': Percent,
  'shirt': Shirt,
  'coffee': Coffee,
  'qr-code': QrCode,
  'stamp': Stamp,
  'badge-percent': BadgePercent,
  'palette': Palette,
}

// Pre-defined list of available vector line icons for Visual Icon Picker
export const AVAILABLE_VECTOR_ICONS = [
  { id: 'none', label: '🚫 Sin ícono (Solo texto)', component: Ban },
  { id: 'layout-grid', label: 'Todas las Categorías', component: LayoutGrid },
  { id: 'credit-card', label: 'Tarjetas de Presentación / PVC', component: CreditCard },
  { id: 'file-text', label: 'Folletos / Volantes / Hojas', component: FileText },
  { id: 'receipt', label: 'Facturas / Talonarios / Recibos', component: Receipt },
  { id: 'tag', label: 'Stickers / Etiquetas Adhesivas', component: Tag },
  { id: 'bookmark', label: 'Grifas / Marcadores de Libros', component: Bookmark },
  { id: 'image', label: 'Afiches / Pósters / Cuadros', component: Image },
  { id: 'flag', label: 'Banderas / Windflags / Banners', component: Flag },
  { id: 'book-open', label: 'Cuadernos / Agendas / Blocks', component: BookOpen },
  { id: 'mail', label: 'Sobres / Papelería / Cartas', component: Mail },
  { id: 'file-check', label: 'Diplomas / Certificados / Hojas', component: FileCheck },
  { id: 'key', label: 'Llaveros / Identificadores', component: Key },
  { id: 'box', label: 'Packaging / Cajas de Cartón', component: Box },
  { id: 'package', label: 'Envíos / Paquetes', component: Package },
  { id: 'calendar', label: 'Almanaques / Calendarios', component: Calendar },
  { id: 'folder', label: 'Carpetas Institucionales', component: Folder },
  { id: 'gift', label: 'Merchandising / Regalos', component: Gift },
  { id: 'shirt', label: 'Remeras / Indumentaria / Textil', component: Shirt },
  { id: 'coffee', label: 'Tazas / Mugs / Vasos', component: Coffee },
  { id: 'pen-tool', label: 'Diseño Gráfico / Vector', component: PenTool },
  { id: 'scissors', label: 'Troquelados / Corte Vinilo', component: Scissors },
  { id: 'layers', label: 'Laminados / Acabados', component: Layers },
  { id: 'printer', label: 'Impresión General / Offset', component: Printer },
  { id: 'sparkles', label: 'Destacados / Efectos Oro/Plata', component: Sparkles },
  { id: 'qr-code', label: 'Códigos QR / Menús Digitales', component: QrCode },
  { id: 'stamp', label: 'Sellos de Goma / Automáticos', component: Stamp },
  { id: 'badge-percent', label: 'Ofertas / Promociones', component: BadgePercent },
  { id: 'palette', label: 'Full Color / Colorimetría', component: Palette },
  { id: 'newspaper', label: 'Revistas / Catálogos / Diarios', component: Newspaper },
  { id: 'frame', label: 'Cuadros / Bastidores Canvas', component: Frame },
  { id: 'shopping-bag', label: 'Bolsas de Papel / Tela', component: ShoppingBag },
  { id: 'shield-check', label: 'Garantía / Seguridad', component: ShieldCheck }
]

// Default mappings from category name to icon ID
export const DEFAULT_CATEGORY_VECTOR_MAP: Record<string, string> = {
  'Todas': 'layout-grid',
  'Tarjetas': 'credit-card',
  'Folletos': 'file-text',
  'Facturas': 'receipt',
  'Stickers': 'tag',
  'Imanes': 'sparkles',
  'Afiches': 'image',
  'Banderas': 'flag',
  'Block de Notas': 'book-open',
  'Documentos para Impresora': 'file-check',
  'Sobres': 'mail',
  'Hojas Membretadas': 'file-text',
  'Llaveros': 'key',
  'Packaging': 'box',
  'Grifas Etiquetas': 'bookmark',
  'Almanaques': 'calendar',
  'Carpetas': 'folder',
  'default': 'printer'
}

interface CategoryIconProps {
  name?: string
  iconId?: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export default function CategoryIcon({
  name = '',
  iconId,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  className = '',
  style = {}
}: CategoryIconProps) {
  // If explicitly set to 'none' or 'sin-icono', do not render any icon
  if (iconId === 'none' || iconId === 'sin-icono' || name.toLowerCase() === 'none' || name.toLowerCase() === 'sin-icono') {
    return null
  }

  // 1. Check if direct iconId is given
  if (iconId && CATEGORY_ICON_MAP[iconId.toLowerCase()]) {
    const IconComp = CATEGORY_ICON_MAP[iconId.toLowerCase()]
    return <IconComp size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
  }

  // 2. Check by name
  const cleanName = name.trim().toLowerCase()
  if (cleanName === 'none' || cleanName === 'sin-icono') {
    return null
  }

  if (CATEGORY_ICON_MAP[cleanName]) {
    const IconComp = CATEGORY_ICON_MAP[cleanName]
    return <IconComp size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
  }

  // 3. Fallback to Printer / Package
  const Fallback = CATEGORY_ICON_MAP['printer'] || Printer
  return <Fallback size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
}
