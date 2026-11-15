import { useMemo, useState, useSyncExternalStore } from 'react'
import { ContextoSesion } from '../context/sesion.js'
import { authApi } from '../services/reservaunabApi.js'
import { EVENTO_SESION, cerrarSesionLocal, guardarSesion, leerSesion } from '../services/sesion.js'

// La sesión vive en localStorage (services/sesion.js). useSyncExternalStore mantiene a React al día
// cuando cambia: al ingresar, al salir, cuando la API responde 401 o cuando se cierra en otra pestaña.
function suscribirse(avisar) {
  window.addEventListener(EVENTO_SESION, avisar)
  window.addEventListener('storage', avisar)
  return () => {
    window.removeEventListener(EVENTO_SESION, avisar)
    window.removeEventListener('storage', avisar)
  }
}
const leerTexto = () => localStorage.getItem('sesion_unab')

function ProveedorSesion({ children }) {
  const texto = useSyncExternalStore(suscribirse, leerTexto)
  // true si la persona cerró la sesión (false si expiró): RutaProtegida decide a dónde mandarla
  const [salioVoluntariamente, setSalioVoluntariamente] = useState(false)
  const sesion = useMemo(() => {
    try {
      return JSON.parse(texto)
    } catch {
      return null
    }
  }, [texto])

  const valor = useMemo(
    () => ({
      usuario: sesion?.usuario ?? null,
      esAdmin: sesion?.usuario?.rol === 'admin',
      salioVoluntariamente,
      async ingresar(datos) {
        guardarSesion(await authApi.ingresar(datos))
        setSalioVoluntariamente(false)
      },
      async registrar(datos) {
        guardarSesion(await authApi.registrar(datos))
        setSalioVoluntariamente(false)
      },
      async actualizarPerfil(datos) {
        const usuario = await authApi.actualizarPerfil(datos)
        guardarSesion({ ...leerSesion(), usuario })
        return usuario
      },
      salir() {
        setSalioVoluntariamente(true)
        cerrarSesionLocal()
      },
    }),
    [sesion, salioVoluntariamente],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

export default ProveedorSesion
