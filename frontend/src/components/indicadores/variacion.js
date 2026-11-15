// Comparación de un indicador con el período anterior (lógica sin interfaz).
import { formatearNumero, formatearPorcentaje } from './escalas.js'

// Bajo estos umbrales el cambio se considera ruido y se muestra en gris, sin alarma:
// menos de 3% de diferencia en un conteo, o menos de medio punto en un porcentaje.
const UMBRAL_RELATIVO = 3
const UMBRAL_PUNTOS = 0.5

// Compara un indicador con el período anterior de igual largo.
// enPuntos: el indicador ya es un %, así que la diferencia se expresa en puntos.
// subirEsBueno: define si un aumento es una mejora (reservas) o un empeoramiento (cancelaciones).
// Devuelve null si no hay con qué comparar.
export function calcularVariacion(actual, anterior, { enPuntos = false, subirEsBueno = true } = {}) {
  if (anterior === undefined || anterior === null) return null
  let diferencia
  let texto
  let relevante
  if (enPuntos) {
    diferencia = Math.round((actual - anterior) * 10) / 10
    texto = `${diferencia > 0 ? '+' : ''}${formatearNumero(diferencia)} ${Math.abs(diferencia) === 1 ? 'punto' : 'puntos'}`
    relevante = Math.abs(diferencia) >= UMBRAL_PUNTOS
  } else {
    if (anterior === 0) return null // no hay base para un porcentaje
    diferencia = Math.round(((actual - anterior) / anterior) * 1000) / 10
    texto = `${diferencia > 0 ? '+' : ''}${formatearPorcentaje(diferencia)}`
    relevante = Math.abs(diferencia) >= UMBRAL_RELATIVO
  }
  const direccion = diferencia > 0 ? 'sube' : diferencia < 0 ? 'baja' : 'igual'
  if (diferencia === 0) texto = 'sin cambio'
  const tono = !relevante ? 'neutro' : diferencia > 0 === subirEsBueno ? 'positivo' : 'negativo'
  return {
    texto,
    tono,
    direccion,
    anterior: enPuntos ? formatearPorcentaje(anterior) : formatearNumero(anterior),
  }
}
