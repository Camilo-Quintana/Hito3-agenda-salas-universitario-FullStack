// Bandas de referencia para la ocupación (supuesto del equipo, documentado en el README):
// sirven para leer si un % es bajo o alto, ya que la sede no tiene una meta oficial.
// Ocupación = % de las horas disponibles de lunes a viernes que tuvieron reserva.
export const LIMITE_MEDIA = 10 // desde aquí la ocupación deja de ser baja
export const LIMITE_ALTA = 25 // desde aquí es alta

export const BANDAS = [
  { clave: 'baja', nombre: 'Baja', rango: `menos de ${LIMITE_MEDIA}%` },
  { clave: 'media', nombre: 'Media', rango: `${LIMITE_MEDIA}% a ${LIMITE_ALTA}%` },
  { clave: 'alta', nombre: 'Alta', rango: `${LIMITE_ALTA}% o más` },
]

export function bandaDe(ocupacion) {
  if (ocupacion >= LIMITE_ALTA) return BANDAS[2]
  if (ocupacion >= LIMITE_MEDIA) return BANDAS[1]
  return BANDAS[0]
}
