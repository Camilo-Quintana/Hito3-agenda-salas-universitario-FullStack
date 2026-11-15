// Funciones para cada operación de la API, agrupadas por recurso.
// Las páginas usan estas funciones (o el hook useApi para las consultas) y nunca llaman a fetch directamente.
import { api } from './api.js'

export const authApi = {
  ingresar: (datos) => api.crear('/auth/login', datos),
  registrar: (datos) => api.crear('/auth/registro', datos),
  actualizarPerfil: (datos) => api.actualizar('/auth/yo', datos),
}

export const espaciosApi = {
  crear: (datos) => api.crear('/espacios', datos),
  actualizar: (id, datos) => api.actualizar(`/espacios/${id}`, datos),
  eliminar: (id) => api.eliminar(`/espacios/${id}`),
}

export const edificiosApi = {
  crear: (datos) => api.crear('/edificios', datos),
  actualizar: (id, datos) => api.actualizar(`/edificios/${id}`, datos),
  eliminar: (id) => api.eliminar(`/edificios/${id}`),
}

export const equipamientoApi = {
  crear: (datos) => api.crear('/equipamiento', datos),
  actualizar: (id, datos) => api.actualizar(`/equipamiento/${id}`, datos),
  eliminar: (id) => api.eliminar(`/equipamiento/${id}`),
}

export const reservasApi = {
  crear: (datos) => api.crear('/reservas', datos),
  cancelar: (id, observacion) => api.actualizar(`/reservas/${id}/cancelar`, observacion ? { observacion } : {}),
  aprobar: (id) => api.actualizar(`/reservas/${id}/aprobar`),
  rechazar: (id, observacion) => api.actualizar(`/reservas/${id}/rechazar`, { observacion }),
  historial: (id) => api.obtener(`/reservas/${id}/historial`),
}
