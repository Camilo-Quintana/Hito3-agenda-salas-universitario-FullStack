import { ESTADOS_RESERVA } from '../utils/reglasReserva.js'

// Etiqueta de color con el estado de una reserva (pendiente, aprobada, rechazada o cancelada)
function EstadoReserva({ estado }) {
  const { texto, icono } = ESTADOS_RESERVA[estado]
  return (
    <span className={`badge estado-reserva ${estado}`}>
      <i className={`bi ${icono} me-1`} aria-hidden="true"></i>
      {texto}
    </span>
  )
}

export default EstadoReserva
