import EstadoReserva from './EstadoReserva.jsx'
import { formatearBloque, formatearFechaLarga } from '../utils/fechas.js'
import { describirUbicacion } from '../utils/textos.js'
import { sePuedeCancelar } from '../utils/reglasReserva.js'
import './ReservaCard.css'

const TEXTO_TEMPORAL = { 'en-curso': 'En curso', finalizada: 'Finalizada' }

// Tarjeta de una reserva con su estado. Solo las pendientes o aprobadas que no empiezan se pueden cancelar.
function ReservaCard({ reserva, onCancelar, onVerHistorial }) {
  const { espacio, estadoTemporal } = reserva
  const activa = ['pendiente', 'aprobada'].includes(reserva.estado)

  return (
    <article className={`card reserva-card h-100 ${estadoTemporal}`}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h2 className="h6 reserva-card__titulo mb-1">{espacio.nombre}</h2>
          <div className="d-flex flex-column align-items-end gap-1">
            <EstadoReserva estado={reserva.estado} />
            {activa && estadoTemporal !== 'proxima' && (
              <span className={`badge reserva-card__estado ${estadoTemporal}`}>{TEXTO_TEMPORAL[estadoTemporal]}</span>
            )}
          </div>
        </div>
        <p className="small text-muted mb-2">{describirUbicacion(espacio)}</p>
        <p className="mb-1">
          <i className="bi bi-calendar-event me-1" aria-hidden="true"></i>
          {formatearFechaLarga(reserva.fecha)}
        </p>
        <p className="mb-1">
          <i className="bi bi-clock me-1" aria-hidden="true"></i>
          {formatearBloque(reserva.bloque)}
        </p>
        <p className="small mb-2">
          <i className="bi bi-chat-left-text me-1" aria-hidden="true"></i>
          {reserva.motivo} · {reserva.asistentes} {reserva.asistentes === 1 ? 'persona' : 'personas'}
        </p>
        {reserva.estado === 'pendiente' && (
          <p className="small text-muted mb-2">Esperando la aprobación de la sede.</p>
        )}
        {reserva.observacion && (
          <p className="small mb-2">
            <strong>{reserva.estado === 'rechazada' ? 'Motivo del rechazo:' : 'Observación:'}</strong> {reserva.observacion}
          </p>
        )}
        <div className="mt-auto d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onVerHistorial(reserva)}>
            <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
            Historial
          </button>
          {sePuedeCancelar(reserva) && (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onCancelar(reserva)}>
              Cancelar reserva
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default ReservaCard
