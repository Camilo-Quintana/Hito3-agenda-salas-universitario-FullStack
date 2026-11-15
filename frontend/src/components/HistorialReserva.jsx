import { useApi } from '../hooks/useApi.js'
import EstadoCarga from './EstadoCarga.jsx'
import Ventana from './Ventana.jsx'
import { formatearFechaHora } from '../utils/fechas.js'
import { TEXTO_EVENTO } from '../utils/textos.js'

// Ventana con la línea de tiempo de una reserva. Los eventos vienen de MongoDB (GET /reservas/:id/historial).
function HistorialReserva({ reserva, onCerrar }) {
  const historial = useApi(reserva ? `/reservas/${reserva.id}/historial` : null)

  return (
    <Ventana abierto={reserva !== null} titulo="Historial de la reserva" onCerrar={onCerrar}>
      {reserva && (
        <>
          <p className="small text-muted">
            {reserva.espacio.nombre} · {reserva.fecha} · {reserva.bloque}
          </p>
          <EstadoCarga consulta={historial} texto="Cargando historial..." />
          {historial.datos?.length === 0 && <p className="mb-0">Esta reserva no tiene eventos registrados.</p>}
          {historial.datos?.length > 0 && (
            <ol className="linea-tiempo">
              {historial.datos.map((evento) => (
                <li key={evento._id} className="linea-tiempo__item">
                  <strong>{TEXTO_EVENTO[evento.tipo] ?? evento.tipo}</strong>
                  <div className="small text-muted">
                    {formatearFechaHora(evento.fecha)} · {evento.actor.nombre}
                    {evento.actor.rol === 'admin' ? ' (administración)' : ''}
                  </div>
                  {evento.tipo === 'reserva.creada' && (
                    <div className="small">
                      {evento.datos?.estado === 'pendiente' ? 'Quedó pendiente de aprobación.' : 'Quedó aprobada automáticamente.'}
                    </div>
                  )}
                  {evento.datos?.observacion && <div className="small">“{evento.datos.observacion}”</div>}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Ventana>
  )
}

export default HistorialReserva
