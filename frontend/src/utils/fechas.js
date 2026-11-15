// Funciones de fechas. Las fechas se manejan como texto "AAAA-MM-DD" (hora de Chile), igual que en la API.

// Date -> "AAAA-MM-DD"
export function aTextoFecha(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function fechaHoy(ahora) {
  return aTextoFecha(ahora)
}

// "AAAA-MM-DD" + n días -> "AAAA-MM-DD" (new Date pasa solo al mes siguiente)
export function sumarDias(textoFecha, dias) {
  const base = aFecha(textoFecha)
  return aTextoFecha(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias))
}

// Fechas en que se puede reservar: hoy y los "dias" siguientes (la API usa 7)
export function fechasReservables(ahora, dias = 7) {
  const hoy = fechaHoy(ahora)
  return Array.from({ length: dias + 1 }, (_, i) => sumarDias(hoy, i))
}

// "AAAA-MM-DD" -> Date a medianoche
// (ojo: new Date("AAAA-MM-DD") lo toma en UTC y en Chile puede quedar en el día anterior)
export function aFecha(textoFecha) {
  const [anio, mes, dia] = textoFecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

// "2026-10-02" -> "viernes, 2 de octubre"
export function formatearFechaLarga(textoFecha) {
  return aFecha(textoFecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}

// "2026-10-03" -> "sáb 3 oct"
export function formatearFechaCorta(textoFecha) {
  return aFecha(textoFecha)
    .toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
    .replaceAll('.', '')
    .replace(',', '')
}

// Fecha y hora de un evento: "11-11-2026 21:35"
export function formatearFechaHora(valor) {
  return new Date(valor).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

// "08:00-09:00" -> "08:00 - 09:00"
export function formatearBloque(bloque) {
  return bloque.replace('-', ' - ')
}
