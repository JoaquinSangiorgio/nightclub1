export type RolUsuario = 'owner' | 'employee'

export interface Usuario {
  id: string
  username: string
  role: RolUsuario
  name: string
}

export interface ItemReceta {
  productId: string; 
  cantidad: number;
}

export interface Botella {
  id: string
  nombre: string
  categoria: 'whisky' | 'vodka' | 'ron' | 'tequila' | 'gin' | 'cerveza' | 'vino' | 'champagne' | 'otros'
  marca: string
  stock: number
  stockMin: number
  precio: number
  precioCosto: number
  isCombo?: boolean;
  receta?: ItemReceta[];
  createdAt: string
  updatedAt: string
}

export interface MovimientoStock {
  id: string
  botellaId: string
  nombreBotella: string
  tipo: 'entrada' | 'venta'
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  usuarioId: string
  nombreUsuario: string
  notas?: string
  createdAt: string
}

export interface Alerta {
  id: string
  botellaId: string
  nombreBotella: string
  stockActual: number
  stockMinimo: number
  tipo: 'low_stock' | 'out_of_stock'
  leida: boolean
  createdAt: string
}

export interface EstadisticasDashboard {
  totalBotellas: number
  valorTotal: number
  conteoStockBajo: number
  conteoSinStock: number
  ventasHoy: number
  entradasHoy: number
  ventasSemana: number
  ventasMes: number
}