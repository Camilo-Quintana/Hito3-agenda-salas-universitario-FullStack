import { EstadoReserva } from './reserva.entity'
import { Rol } from '../usuarios/usuario.entity'
import {
  contarBloquesLibres,
  estadoBloque,
  estadoInicial,
  estadoTemporal,
  validarCancelacion,
  validarNuevaReserva,
  validarRevision,
} from './reglas-reserva'

// "Ahora" fijo para que las pruebas no dependan de la hora real: miércoles 11-11-2026 a las 10:30
const AHORA = new Date(2026, 10, 11, 10, 30)
const HOY = '2026-11-11'
const MANANA = '2026-11-12'

const base = {
  espacio: { activo: true, capacidad: 10 },
  fecha: MANANA,
  bloque: '09:00-10:00',
  asistentes: 4,
  ahora: AHORA,
  bloqueOcupado: false,
  yaTieneReservaEseDia: false,
}

describe('validarNuevaReserva', () => {
  it('acepta una reserva válida', () => {
    expect(validarNuevaReserva(base)).toBeNull()
  })

  it('rechaza un bloque ocupado (conflicto de horario)', () => {
    expect(validarNuevaReserva({ ...base, bloqueOcupado: true })).toBe('Ese horario ya está ocupado. Elige otro.')
  })

  it('rechaza una segunda reserva el mismo día', () => {
    expect(validarNuevaReserva({ ...base, yaTieneReservaEseDia: true })).toMatch(/una por día/)
  })

  it('rechaza un horario que ya pasó hoy', () => {
    expect(validarNuevaReserva({ ...base, fecha: HOY, bloque: '10:00-11:00' })).toMatch(/ya pasó/)
  })

  it('acepta un horario más tarde hoy', () => {
    expect(validarNuevaReserva({ ...base, fecha: HOY, bloque: '11:00-12:00' })).toBeNull()
  })

  it('rechaza fechas pasadas y fuera del rango de anticipación', () => {
    expect(validarNuevaReserva({ ...base, fecha: '2026-11-10' })).toMatch(/fecha pasada/)
    expect(validarNuevaReserva({ ...base, fecha: '2026-11-18' })).toBeNull() // hoy + 7
    expect(validarNuevaReserva({ ...base, fecha: '2026-11-19' })).toMatch(/anticipación/)
  })

  it('rechaza más asistentes que la capacidad', () => {
    expect(validarNuevaReserva({ ...base, asistentes: 11 })).toMatch(/capacidad para 10 personas/)
  })

  it('rechaza bloques inexistentes, fechas imposibles y espacios inactivos', () => {
    expect(validarNuevaReserva({ ...base, bloque: '07:00-08:00' })).toMatch(/no existe/)
    expect(validarNuevaReserva({ ...base, fecha: '2026-02-31' })).toMatch(/no es válida/)
    expect(validarNuevaReserva({ ...base, espacio: { activo: false, capacidad: 10 } })).toMatch(/no está disponible/)
  })
})

describe('estadoBloque y contarBloquesLibres', () => {
  const ocupados = new Set(['11:00-12:00'])

  it('distingue pasado, ocupado y libre', () => {
    expect(estadoBloque(ocupados, HOY, '10:00-11:00', AHORA)).toBe('pasado')
    expect(estadoBloque(ocupados, HOY, '11:00-12:00', AHORA)).toBe('ocupado')
    expect(estadoBloque(ocupados, HOY, '12:00-13:00', AHORA)).toBe('libre')
  })

  it('cuenta solo los bloques libres que no han pasado', () => {
    // hoy quedan 11:00 a 20:00 (10 bloques) y uno está ocupado
    expect(contarBloquesLibres(ocupados, HOY, AHORA)).toBe(9)
    expect(contarBloquesLibres(new Set(), MANANA, AHORA)).toBe(13)
  })
})

describe('aprobación y cancelación', () => {
  const pendiente = { estado: EstadoReserva.PENDIENTE, fecha: MANANA, bloque: '09:00-10:00', usuarioId: 7 }

  it('el estado inicial depende de si el espacio requiere aprobación', () => {
    expect(estadoInicial({ requiereAprobacion: true })).toBe(EstadoReserva.PENDIENTE)
    expect(estadoInicial({ requiereAprobacion: false })).toBe(EstadoReserva.APROBADA)
  })

  it('solo se revisan solicitudes pendientes y futuras', () => {
    expect(validarRevision(pendiente, AHORA)).toBeNull()
    expect(validarRevision({ ...pendiente, estado: EstadoReserva.APROBADA }, AHORA)).toMatch(/solo se revisan las pendientes/)
    expect(validarRevision({ ...pendiente, fecha: HOY, bloque: '08:00-09:00' }, AHORA)).toMatch(/ya pasó/)
  })

  it('cancela el dueño o un administrador, nunca otro estudiante', () => {
    expect(validarCancelacion(pendiente, { id: 7, rol: Rol.ESTUDIANTE }, AHORA)).toBeNull()
    expect(validarCancelacion(pendiente, { id: 1, rol: Rol.ADMIN }, AHORA)).toBeNull()
    expect(validarCancelacion(pendiente, { id: 8, rol: Rol.ESTUDIANTE }, AHORA)).toMatch(/propias reservas/)
  })

  it('no se cancela una reserva rechazada ni una que ya comenzó', () => {
    expect(validarCancelacion({ ...pendiente, estado: EstadoReserva.RECHAZADA }, { id: 7, rol: Rol.ESTUDIANTE }, AHORA)).toMatch(/rechazada/)
    expect(validarCancelacion({ ...pendiente, fecha: HOY, bloque: '10:00-11:00' }, { id: 7, rol: Rol.ESTUDIANTE }, AHORA)).toMatch(/ya comenzó/)
  })
})

describe('estadoTemporal', () => {
  it('clasifica la reserva según la hora', () => {
    expect(estadoTemporal(HOY, '10:00-11:00', AHORA)).toBe('en-curso')
    expect(estadoTemporal(HOY, '09:00-10:00', AHORA)).toBe('finalizada')
    expect(estadoTemporal(MANANA, '09:00-10:00', AHORA)).toBe('proxima')
  })
})
