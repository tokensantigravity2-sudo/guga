'use client'

import React from 'react'
import {
  CreditCard, FileText, Receipt, Tag, Flag,
  BookOpen, Printer, Mail, Key, Package,
  Calendar, Folder, Image, Sparkles, Layers,
  ShoppingBag, Gift, Bookmark, Scissors, Box,
  FileCheck, Newspaper, Frame, PenTool, LayoutGrid,
  Percent, FileSpreadsheet, ShieldCheck, LucideProps
} from 'lucide-react'

// Available Vector Line Icons for Categories
export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
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
}

// Pre-defined list of available vector line icons for Admin Picker
export const AVAILABLE_VECTOR_ICONS = [
  { id: 'credit-card', label: 'Tarjetas', component: CreditCard },
  { id: 'file-text', label: 'Folletos / Hojas', component: FileText },
  { id: 'receipt', label: 'Facturas / Talonarios', component: Receipt },
  { id: 'tag', label: 'Stickers / Etiquetas', component: Tag },
  { id: 'bookmark', label: 'Grifas / Marcadores', component: Bookmark },
  { id: 'image', label: 'Afiches / Pósters', component: Image },
  { id: 'flag', label: 'Banderas / WindFlags', component: Flag },
  { id: 'book-open', label: 'Block de Notas / Cuadernos', component: BookOpen },
  { id: 'mail', label: 'Sobres / Correspondencia', component: Mail },
  { id: 'file-check', label: 'Documentos / Impresora', component: FileCheck },
  { id: 'key', label: 'Llaveros', component: Key },
  { id: 'box', label: 'Packaging / Cajas', component: Box },
  { id: 'package', label: 'Paquetes / Envíos', component: Package },
  { id: 'calendar', label: 'Almanaques / Calendarios', component: Calendar },
  { id: 'folder', label: 'Carpetas / Archivadores', component: Folder },
  { id: 'gift', label: 'Merchandising / Regalos', component: Gift },
  { id: 'pen-tool', label: 'Diseño Gráfico', component: PenTool },
  { id: 'scissors', label: 'Troquelados', component: Scissors },
  { id: 'layers', label: 'Laminados / Acabados', component: Layers },
  { id: 'printer', label: 'Impresión General', component: Printer },
  { id: 'layout-grid', label: 'Todas las Categorías', component: LayoutGrid },
  { id: 'sparkles', label: 'Destacados / Premium', component: Sparkles },
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
  // 1. Check if direct iconId is given
  if (iconId && CATEGORY_ICON_MAP[iconId.toLowerCase()]) {
    const IconComp = CATEGORY_ICON_MAP[iconId.toLowerCase()]
    return <IconComp size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
  }

  // 2. Check by name
  const cleanName = name.trim().toLowerCase()
  if (CATEGORY_ICON_MAP[cleanName]) {
    const IconComp = CATEGORY_ICON_MAP[cleanName]
    return <IconComp size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
  }

  // 3. Fallback to Printer / Package
  const Fallback = CATEGORY_ICON_MAP['printer'] || Printer
  return <Fallback size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} />
}
