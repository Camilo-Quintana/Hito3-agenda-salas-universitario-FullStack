// Textos que se repiten en varias vistas

// { tipo: 'Clases', edificio: { codigo: 'A' }, piso: 1 } -> "Clases - Edificio A - Piso 1"
export function describirUbicacion(espacio) {
  return `${espacio.tipo} - Edificio ${espacio.edificio.codigo} - Piso ${espacio.piso}`
}

// 1 -> "1 persona", 40 -> "40 personas"
export function textoCapacidad(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'persona' : 'personas'}`
}

// { nombre: 'Computadoras', cantidad: 40 } -> "Computadoras (40)"
export function textoEquipo(equipo) {
  return equipo.cantidad > 1 ? `${equipo.nombre} (${equipo.cantidad})` : equipo.nombre
}

// Nombre legible de cada evento de la bitácora (MongoDB)
export const TEXTO_EVENTO = {
  'reserva.creada': 'Reserva solicitada',
  'reserva.aprobada': 'Reserva aprobada',
  'reserva.rechazada': 'Reserva rechazada',
  'reserva.cancelada': 'Reserva cancelada',
  'espacio.creado': 'Espacio creado',
  'espacio.actualizado': 'Espacio modificado',
  'espacio.eliminado': 'Espacio eliminado',
  'edificio.creado': 'Edificio creado',
  'edificio.actualizado': 'Edificio modificado',
  'edificio.eliminado': 'Edificio eliminado',
  'equipamiento.creado': 'Equipo agregado',
  'equipamiento.actualizado': 'Equipo renombrado',
  'equipamiento.eliminado': 'Equipo eliminado',
  'usuario.registrado': 'Cuenta creada',
  'usuario.sesion_iniciada': 'Inicio de sesión',
}
