// Reglas de negocio de las reservas. Son funciones puras: reciben datos y devuelven un resultado,
// sin tocar la base de datos. Así se pueden probar solas (reglas-reserva.spec.ts) y el servicio las reutiliza.
// Vienen de src/utils/reglasReserva.js del Taller 2, ampliadas con aprobación y cancelación.
import { BLOQUES, DIAS_ANTICIPACION, aTextoFecha, esFechaValida, rangoDeBloque, sumarDias } from '../common/horario'
import { EstadoReserva, ESTADOS_ACTIVOS } from './reserva.entity'
import { Rol } from '../usuarios/usuario.entity'

export type EstadoBloque = 'libre' | 'ocupado' | 'pasado'
export type EstadoTemporal = 'proxima' | 'en-curso' | 'finalizada'

/** Un bloque ya pasó si su hora de inicio ya llegó */
export function bloqueYaPaso(fecha: string, bloque: string, ahora: Date): boolean {
  return rangoDeBloque(fecha, bloque).inicio <= ahora
}

export function estadoBloque(ocupados: ReadonlySet<string>, fecha: string, bloque: string, ahora: Date): EstadoBloque {
  if (bloqueYaPaso(fecha, bloque, ahora)) return 'pasado'
  if (ocupados.has(bloque)) return 'ocupado'
  return 'libre'
}

export function contarBloquesLibres(ocupados: ReadonlySet<string>, fecha: string, ahora: Date): number {
  return BLOQUES.filter((bloque) => estadoBloque(ocupados, fecha, bloque, ahora) === 'libre').length
}

/** Fechas en que se puede reservar: desde hoy hasta hoy + DIAS_ANTICIPACION */
export function rangoReservable(ahora: Date): { desde: string; hasta: string } {
  const hoy = aTextoFecha(ahora)
  return { desde: hoy, hasta: sumarDias(hoy, DIAS_ANTICIPACION) }
}

export interface DatosNuevaReserva {
  espacio: { activo: boolean; capacidad: number }
  fecha: string
  bloque: string
  asistentes: number
  ahora: Date
  /** El bloque ya tiene una reserva pendiente o aprobada */
  bloqueOcupado: boolean
  /** El estudiante ya tiene una reserva pendiente o aprobada ese día */
  yaTieneReservaEseDia: boolean
}

/** Devuelve null si se puede reservar, o el mensaje del primer problema encontrado */
export function validarNuevaReserva(datos: DatosNuevaReserva): string | null {
  const { espacio, fecha, bloque, asistentes, ahora } = datos
  if (!espacio.activo) return 'Este espacio no está disponible para reservas.'
  if (!esFechaValida(fecha)) return 'La fecha no es válida.'
  if (!(BLOQUES as readonly string[]).includes(bloque)) return 'El horario elegido no existe.'
  const { desde, hasta } = rangoReservable(ahora)
  if (fecha < desde) return 'No puedes reservar en una fecha pasada.'
  if (fecha > hasta) return `Solo puedes reservar con hasta ${DIAS_ANTICIPACION} días de anticipación.`
  if (bloqueYaPaso(fecha, bloque, ahora)) return 'Ese horario ya pasó. Elige uno más tarde.'
  if (asistentes > espacio.capacidad) {
    return `El espacio tiene capacidad para ${espacio.capacidad} ${espacio.capacidad === 1 ? 'persona' : 'personas'}.`
  }
  if (datos.bloqueOcupado) return 'Ese horario ya está ocupado. Elige otro.'
  if (datos.yaTieneReservaEseDia) return 'Ya tienes una reserva ese día. Solo se permite una por día.'
  return null
}

/** Los espacios que requieren aprobación dejan la reserva pendiente; los demás la aprueban al tiro */
export function estadoInicial(espacio: { requiereAprobacion: boolean }): EstadoReserva {
  return espacio.requiereAprobacion ? EstadoReserva.PENDIENTE : EstadoReserva.APROBADA
}

interface ReservaParaReglas {
  estado: EstadoReserva
  fecha: string
  bloque: string
  usuarioId: number
}

/** Un administrador solo puede aprobar o rechazar solicitudes pendientes que aún no empiezan */
export function validarRevision(reserva: ReservaParaReglas, ahora: Date): string | null {
  if (reserva.estado !== EstadoReserva.PENDIENTE) return `La reserva ya está ${reserva.estado}; solo se revisan las pendientes.`
  if (bloqueYaPaso(reserva.fecha, reserva.bloque, ahora)) return 'El horario de esta solicitud ya pasó.'
  return null
}

/** Cancela el dueño de la reserva o un administrador, mientras esté activa y no haya empezado */
export function validarCancelacion(reserva: ReservaParaReglas, usuario: { id: number; rol: Rol }, ahora: Date): string | null {
  if (usuario.rol !== Rol.ADMIN && reserva.usuarioId !== usuario.id) return 'Solo puedes cancelar tus propias reservas.'
  if (!ESTADOS_ACTIVOS.includes(reserva.estado)) return `La reserva ya está ${reserva.estado}.`
  if (bloqueYaPaso(reserva.fecha, reserva.bloque, ahora)) return 'La reserva ya comenzó o terminó; no se puede cancelar.'
  return null
}

/** Para mostrar: si la reserva es próxima, está en curso o ya terminó */
export function estadoTemporal(fecha: string, bloque: string, ahora: Date): EstadoTemporal {
  const { inicio, fin } = rangoDeBloque(fecha, bloque)
  if (ahora < inicio) return 'proxima'
  if (ahora < fin) return 'en-curso'
  return 'finalizada'
}
