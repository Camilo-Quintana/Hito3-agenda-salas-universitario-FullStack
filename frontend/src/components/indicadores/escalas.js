// Utilidades de los gráficos de indicadores: escalas con números redondos y formatos chilenos.

const numero = new Intl.NumberFormat('es-CL')
// Los porcentajes siempre con un decimal ("9,0%" junto a "7,7%"), para que la columna se lea pareja
const decimal = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// 1234 -> "1.234"
export function formatearNumero(valor) {
  return numero.format(valor)
}

// 6.25 -> "6,3%" · 9 -> "9,0%"
export function formatearPorcentaje(valor) {
  return `${decimal.format(valor)}%`
}

// Escala "agradable" para un eje: máximo y marcas redondas (0, 5, 10, 15...).
// Ejemplo: escalaAgradable(37) -> { maximo: 40, marcas: [0, 10, 20, 30, 40] }
export function escalaAgradable(valorMaximo, cantidadMarcas = 4) {
  if (!valorMaximo || valorMaximo <= 0) return { maximo: 1, marcas: [0, 1] }
  const pasoBruto = valorMaximo / cantidadMarcas
  const magnitud = 10 ** Math.floor(Math.log10(pasoBruto))
  const fraccion = pasoBruto / magnitud
  const paso = (fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 2.5 ? 2.5 : fraccion <= 5 ? 5 : 10) * magnitud
  const maximo = Math.ceil(valorMaximo / paso) * paso
  const marcas = []
  for (let marca = 0; marca <= maximo + paso / 2; marca += paso) marcas.push(Number(marca.toFixed(6)))
  return { maximo, marcas }
}

// Colores de los estados de reserva: los mismos significados que las etiquetas de estado de la app.
// Paleta validada para daltonismo (ver README); cada valor también va escrito, nunca solo el color.
export const COLOR_ESTADO = {
  aprobada: '#1e8e5a',
  pendiente: '#c8962a',
  rechazada: '#b42318',
  cancelada: '#4f78b8',
}

export const NOMBRE_ESTADO = {
  aprobada: 'Aprobadas',
  pendiente: 'Pendientes',
  rechazada: 'Rechazadas',
  cancelada: 'Canceladas',
}
