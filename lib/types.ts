export type RolUsuario = 'owner' | 'employee'

export interface Usuario {
  id: string
  username: string
  role: RolUsuario
  name: string
}

// 1. Actualizamos la receta para usar "cantidadMl" 
export interface ItemReceta {
  productId: string; 
  cantidadMl: number; 
}

export interface Botella {
  id: string
  nombre: string
  
  categoria: 'whisky' | 'vodka' | 'ron' | 'tequila' | 'gin' | 'cerveza' | 'vino' | 'champagne' | 'Gaseosa' | 'Trago' | 'Combo' | 'otros'
  marca: string
  
  // 2. NUEVOS CAMPOS PARA VOLUMEN REAL
  tipo: 'botella' | 'receta' | 'combo' 
  mlPorUnidad: number    // Capacidad: 750, 1000, 1500, etc.
  stockMl: number        // El stock real en mililitros (ej: 7500 para 10 botellas)
  stockMinMl: number     // Alerta de stock bajo en mililitros
  
  // Mantenemos estos por compatibilidad visual (opcional)
  stock: number          // Calculado: stockMl / mlPorUnidad
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
  tipo: 'entrada' | 'venta' | 'ajuste' 
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