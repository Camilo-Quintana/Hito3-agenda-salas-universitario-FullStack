// Cliente HTTP de la API propia (backend NestJS). Todas las peticiones pasan por aquí:
// agrega el token de sesión, arma la URL y convierte los errores en un ErrorApi con un mensaje para mostrar.
import { leerToken, cerrarSesionLocal } from './sesion.js'

// En desarrollo Vite redirige /api al backend (vite.config.js); en Docker lo hace nginx
const URL_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ErrorApi extends Error {
  constructor(status, mensaje, detalles = null) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status // 0 = no hubo respuesta del servidor
    this.detalles = detalles // errores por campo: { correo: ['...'] }
  }
}

function armarUrl(ruta, consulta) {
  const parametros = new URLSearchParams()
  Object.entries(consulta ?? {}).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor))
  })
  const texto = parametros.toString()
  return `${URL_BASE}${ruta}${texto ? `?${texto}` : ''}`
}

export async function pedir(ruta, { metodo = 'GET', cuerpo, consulta, signal } = {}) {
  const cabeceras = { Accept: 'application/json' }
  const token = leerToken()
  if (token) cabeceras.Authorization = `Bearer ${token}`
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  let respuesta
  try {
    respuesta = await fetch(armarUrl(ruta, consulta), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error // se canceló a propósito
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión o que la API esté encendida.')
  }

  if (respuesta.status === 204) return null
  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    // token vencido o inválido: cerramos la sesión local para que la app pida ingresar de nuevo
    if (respuesta.status === 401 && token) cerrarSesionLocal()
    throw new ErrorApi(respuesta.status, datos?.mensaje ?? `El servidor respondió ${respuesta.status}.`, datos?.detalles ?? null)
  }
  return datos
}

export const api = {
  obtener: (ruta, consulta, signal) => pedir(ruta, { consulta, signal }),
  crear: (ruta, cuerpo) => pedir(ruta, { metodo: 'POST', cuerpo }),
  actualizar: (ruta, cuerpo) => pedir(ruta, { metodo: 'PATCH', cuerpo }),
  eliminar: (ruta) => pedir(ruta, { metodo: 'DELETE' }),
}
