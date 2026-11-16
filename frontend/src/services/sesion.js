// Guarda la sesión (token + datos básicos del usuario) en el navegador.
// Es lo único que queda en localStorage: los datos del sistema viven en la API.
const CLAVE = 'sesion_unab'
export const EVENTO_SESION = 'sesion-unab-cambio'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? null
  } catch {
    return null
  }
}

export function leerToken() {
  return leerSesion()?.token ?? null
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE, JSON.stringify(sesion))
  window.dispatchEvent(new Event(EVENTO_SESION))
}

export function cerrarSesionLocal() {
  localStorage.removeItem(CLAVE)
  window.dispatchEvent(new Event(EVENTO_SESION))
}
