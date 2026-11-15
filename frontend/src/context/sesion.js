import { createContext, useContext } from 'react'

// Contexto con el usuario que inició sesión y las acciones ingresar/registrar/salir.
// El proveedor está en components/ProveedorSesion.jsx.
export const ContextoSesion = createContext(null)

export function useSesion() {
  const contexto = useContext(ContextoSesion)
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return contexto
}
