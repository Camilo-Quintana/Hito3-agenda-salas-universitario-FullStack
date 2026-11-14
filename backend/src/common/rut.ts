// Validación del RUT chileno (la misma del frontend del Taller 2).

export function normalizarRut(rut: string): string {
  return String(rut).replace(/[.\s-]/g, '').toUpperCase()
}

export function validarRut(rut: string): boolean {
  const limpio = normalizarRut(rut)
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false
  const cuerpo = limpio.slice(0, -1)
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return limpio.slice(-1) === esperado
}

/** "123456785" -> "12.345.678-5" */
export function formatearRut(rut: string): string {
  const limpio = normalizarRut(rut)
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${limpio.slice(-1)}`
}
