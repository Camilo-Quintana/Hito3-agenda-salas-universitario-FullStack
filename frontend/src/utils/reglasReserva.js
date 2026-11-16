// Reglas de presentación de las reservas.
// Las reglas de negocio (conflictos, una por día, capacidad, aprobación) ahora las aplica la API:
// ver backend/src/reservas/reglas-reserva.ts.

// Desde este % de lluvia avisamos en los espacios exteriores
export const UMBRAL_LLUVIA = 50

// Solo avisamos en espacios exteriores y si la probabilidad llega al umbral
export function debeAvisarLluvia(espacio, climaDelBloque) {
  return espacio.tipo === 'Exterior' && (climaDelBloque?.probLluvia ?? 0) >= UMBRAL_LLUVIA
}

// Una reserva se puede cancelar si está pendiente o aprobada y todavía no empieza
export function sePuedeCancelar(reserva) {
  return ['pendiente', 'aprobada'].includes(reserva.estado) && reserva.estadoTemporal === 'proxima'
}

export const ESTADOS_RESERVA = {
  pendiente: { texto: 'Pendiente', icono: 'bi-hourglass-split' },
  aprobada: { texto: 'Aprobada', icono: 'bi-check-circle' },
  rechazada: { texto: 'Rechazada', icono: 'bi-x-circle' },
  cancelada: { texto: 'Cancelada', icono: 'bi-slash-circle' },
}

export const TIPOS_ESPACIO = ['Clases', 'Laboratorio', 'Reunión', 'Estudio', 'Exterior']
