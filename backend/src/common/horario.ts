// Reglas de horario de la sede. Son las mismas del Taller 2 (bloques de 1 hora entre 08:00 y 21:00).
// Las fechas viajan como texto "AAAA-MM-DD" y se interpretan en la zona horaria del proceso (TZ=America/Santiago).

export const BLOQUES = [
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
] as const

export type Bloque = (typeof BLOQUES)[number]

/** Cuántos días hacia adelante se puede reservar (0 = solo hoy). */
export const DIAS_ANTICIPACION = 7

export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Date -> "AAAA-MM-DD" con la hora local del proceso */
export function aTextoFecha(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** "AAAA-MM-DD" -> Date a medianoche local */
export function aFecha(texto: string): Date {
  const [anio, mes, dia] = texto.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function sumarDias(texto: string, dias: number): string {
  const base = aFecha(texto)
  return aTextoFecha(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias))
}

/** ("2026-11-12", "15:00-16:00") -> { inicio, fin } */
export function rangoDeBloque(fecha: string, bloque: string): { inicio: Date; fin: Date } {
  const [horaInicio, horaFin] = bloque.split('-').map((hora) => Number(hora.slice(0, 2)))
  const base = aFecha(fecha)
  return {
    inicio: new Date(base.getFullYear(), base.getMonth(), base.getDate(), horaInicio),
    fin: new Date(base.getFullYear(), base.getMonth(), base.getDate(), horaFin),
  }
}

export function esFechaValida(texto: string): boolean {
  if (!FORMATO_FECHA.test(texto)) return false
  return aTextoFecha(aFecha(texto)) === texto // descarta "2026-02-31"
}
