import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../context/sesion.js'
import MensajeVacio from './MensajeVacio.jsx'

// Envuelve las páginas que necesitan sesión. Si no hay sesión, manda a /ingresar y después vuelve.
// Si la persona acaba de cerrar sesión, la manda al inicio. Con soloAdmin, además exige el rol de administrador.
function RutaProtegida({ soloAdmin = false, children }) {
  const { usuario, esAdmin, salioVoluntariamente } = useSesion()
  const location = useLocation()

  if (!usuario) {
    if (salioVoluntariamente) return <Navigate to="/" replace />
    return <Navigate to="/ingresar" replace state={{ desde: location.pathname + location.search }} />
  }
  if (soloAdmin && !esAdmin) {
    return (
      <MensajeVacio
        icono="bi-shield-lock"
        titulo="Solo para administradores"
        mensaje="Tu cuenta no tiene permiso para ver esta sección."
        accion={{ texto: 'Ir a espacios', ruta: '/' }}
      />
    )
  }
  return children
}

export default RutaProtegida
