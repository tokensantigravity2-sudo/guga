export interface Cliente {
  id: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  rut?: string
  notas?: string
  tipo?: string // regular | frecuente | vip | empresa
  created_at?: string
}

export interface Servicio {
  id: string
  nombre: string
  descripcion?: string
  precio_base: number
  categoria: string
  unidad?: string
  tiempo_estimado?: string
  disponible?: boolean
  imagen_url?: string
  es_tercerizado?: boolean
  proveedor_tercerizado_id?: string
  costo_tercerizado?: number
  created_at?: string
}

export interface PedidoItem {
  producto_id?: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  medida?: string
  material?: string
  acabado?: string
  no_afectar_stock?: boolean
}

export interface Pedido {
  id: string
  numero: string
  cliente_id?: string
  cliente_nombre?: string
  items: PedidoItem[]
  subtotal: number
  descuento?: number
  descuento_porcentaje?: number
  total: number
  metodo_pago?: string
  estado?: 'presupuesto' | 'aprobado' | 'en_produccion' | 'terminado' | 'entregado' | 'cancelado'
  fecha_entrega?: string
  notas?: string
  archivo_url?: string
  created_at?: string
}

export interface ItemListaPrecio {
  id?: string
  producto: string
  precio: number
  unidad?: string
  notas?: string
}

export interface Gasto {
  id: string
  concepto: string
  monto: number
  categoria: string
  fecha?: string
  proveedor_id?: string
  notas?: string
  estado_pago?: 'pagado' | 'fiado'
  fecha_vencimiento?: string
  created_at?: string
}

export interface Proveedor {
  id: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  rubro?: string
  notas?: string
  es_tercerizado?: boolean
  lista_precios?: ItemListaPrecio[]
  created_at?: string
}

export interface Empleado {
  id: string
  nombre: string
  cargo?: string
  telefono?: string
  email?: string
  salario?: number
  fecha_ingreso?: string
  activo?: boolean
  notas?: string
  created_at?: string
}

export interface CajaMovimiento {
  id: string
  tipo: 'ingreso' | 'egreso'
  monto: number
  concepto?: string
  cliente_id?: string
  cliente_nombre?: string
  metodo_pago?: string
  facturado?: boolean
  referencia_id?: string
  fecha?: string
  created_at?: string
}

export interface StockItem {
  id: string
  nombre: string
  cantidad: number
  unidad?: string
  minimo?: number
  costo_unitario?: number
  proveedor_id?: string
  categoria?: string
  created_at?: string
}

export interface Tarea {
  id: string
  titulo: string
  descripcion?: string
  completada: boolean
  prioridad?: 'baja' | 'media' | 'alta'
  fecha_vencimiento?: string
  created_at?: string
}

export interface Nota {
  id: string
  titulo: string
  contenido: string
  color?: string
  categoria?: string
  created_at?: string
}
