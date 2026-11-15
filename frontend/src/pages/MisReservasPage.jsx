import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReservaCard from '../components/ReservaCard.jsx'
import HistorialReserva from '../components/HistorialReserva.jsx'
import Ventana from '../components/Ventana.jsx'
import Alerta from '../components/Alerta.jsx'
import MensajeVacio from '../components/MensajeVacio.jsx'
import EstadoCarga from '../components/EstadoCarga.jsx'
import { useApi } from '../hooks/useApi.js'
import { reservasApi } from '../services/reservaunabApi.js'
import { formatearBloque, formatearFechaLarga } from '../utils/fechas.js'

const VISTAS = [
  { valor: 'activas', texto: 'Próximas', icono: 'bi-calendar-check' },
  { valor: 'historial', texto: 'Historial', icono: 'bi-clock-history' },
]

function MisReservasPage() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'historial' ? 'historial' : 'activas'
  const reservas = useApi('/reservas/mias', { vista })

  const [reservaACancelar, setReservaACancelar] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [reservaHistorial, setReservaHistorial] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  function cambiarVista(valor) {
    setParams(valor === 'activas' ? {} : { vista: valor }, { replace: true })
    setMensaje(null)
  }

  async function confirmarCancelacion() {
    setCancelando(true)
    try {
      await reservasApi.cancelar(reservaACancelar.id, motivoCancelacion.trim())
      setMensaje({ tipo: 'exito', texto: 'Reserva cancelada. El horario quedó libre otra vez.' })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCancelando(false)
      setReservaACancelar(null)
      setMotivoCancelacion('')
      reservas.recargar()
    }
  }

  const lista = reservas.datos ?? []

  return (
    <section aria-labelledby="titulo-mis-reservas">
      <h1 id="titulo-mis-reservas" className="titulo-pagina">
        Mis reservas
      </h1>

      <ul className="nav nav-pills my-3">
        {VISTAS.map((opcion) => (
          <li key={opcion.valor} className="nav-item">
            <button
              type="button"
              className={`nav-link ${vista === opcion.valor ? 'active' : ''}`}
              aria-pressed={vista === opcion.valor}
              onClick={() => cambiarVista(opcion.valor)}
            >
              <i className={`bi ${opcion.icono} me-1`} aria-hidden="true"></i>
              {opcion.texto}
            </button>
          </li>
        ))}
      </ul>

      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}

      <EstadoCarga consulta={reservas} texto="Cargando tus reservas..." />

      {reservas.datos && lista.length === 0 && (
        <MensajeVacio
          icono={vista === 'activas' ? 'bi-calendar-event' : 'bi-archive'}
          titulo={vista === 'activas' ? 'No tienes reservas próximas' : 'Tu historial está vacío'}
          mensaje={
            vista === 'activas'
              ? 'Explora los espacios y reserva un horario.'
              : 'Aquí verás tus reservas finalizadas, canceladas y rechazadas.'
          }
          accion={vista === 'activas' ? { texto: 'Explorar espacios', ruta: '/' } : undefined}
        />
      )}

      {lista.length > 0 && (
        <>
          <p className="text-muted">
            {lista.length} {lista.length === 1 ? 'reserva' : 'reservas'}
            {vista === 'historial' ? ' en tu historial' : ' próximas o en curso'}
          </p>
          <div className="row g-3">
            {lista.map((reserva) => (
              <div key={reserva.id} className="col-12 col-md-6 col-lg-4">
                <ReservaCard reserva={reserva} onCancelar={setReservaACancelar} onVerHistorial={setReservaHistorial} />
              </div>
            ))}
          </div>
        </>
      )}

      <Ventana
        abierto={reservaACancelar !== null}
        titulo="¿Cancelar reserva?"
        onCerrar={() => setReservaACancelar(null)}
        pie={
          <>
            <button type="button" className="btn btn-outline-secondary" autoFocus onClick={() => setReservaACancelar(null)}>
              No, volver
            </button>
            <button type="button" className="btn btn-danger" disabled={cancelando} onClick={confirmarCancelacion}>
              {cancelando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
              Sí, cancelar
            </button>
          </>
        }
      >
        {reservaACancelar && (
          <>
            <p>
              Se cancelará tu reserva de <strong>{reservaACancelar.espacio.nombre}</strong> el{' '}
              {formatearFechaLarga(reservaACancelar.fecha)}, {formatearBloque(reservaACancelar.bloque)}. Esta acción no se
              puede deshacer.
            </p>
            <label htmlFor="motivo-cancelacion" className="form-label small fw-semibold">
              Motivo (opcional)
            </label>
            <input
              id="motivo-cancelacion"
              className="form-control"
              maxLength={300}
              value={motivoCancelacion}
              onChange={(evento) => setMotivoCancelacion(evento.target.value)}
            />
          </>
        )}
      </Ventana>

      <HistorialReserva reserva={reservaHistorial} onCerrar={() => setReservaHistorial(null)} />
    </section>
  )
}

export default MisReservasPage
