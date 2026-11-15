import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alerta from '../../components/Alerta.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import EstadoReserva from '../../components/EstadoReserva.jsx'
import HistorialReserva from '../../components/HistorialReserva.jsx'
import MensajeVacio from '../../components/MensajeVacio.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Ventana from '../../components/Ventana.jsx'
import { useApi } from '../../hooks/useApi.js'
import { reservasApi } from '../../services/reservaunabApi.js'
import { formatearFechaCorta } from '../../utils/fechas.js'
import { ESTADOS_RESERVA, sePuedeCancelar } from '../../utils/reglasReserva.js'

// Revisión de solicitudes y listado de todas las reservas (GET /reservas con filtros)
function SolicitudesPage() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? 'pendiente'
  const pagina = Number(params.get('pagina')) || 1
  const q = params.get('q') ?? ''
  const reservas = useApi('/reservas', { estado: estado === 'todas' ? undefined : estado, q, pagina, limite: 15 })

  const [accion, setAccion] = useState(null) // { tipo: 'rechazar' | 'cancelar', reserva }
  const [observacion, setObservacion] = useState('')
  const [errorAccion, setErrorAccion] = useState(null)
  const [procesando, setProcesando] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [reservaHistorial, setReservaHistorial] = useState(null)

  function cambiarParametro(clave, valor) {
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores)
        if (valor === '' || valor === null) nuevos.delete(clave)
        else nuevos.set(clave, String(valor))
        if (clave !== 'pagina') nuevos.delete('pagina')
        return nuevos
      },
      { replace: true },
    )
  }

  async function aprobar(reserva) {
    setProcesando(reserva.id)
    try {
      await reservasApi.aprobar(reserva.id)
      setMensaje({ tipo: 'exito', texto: `Reserva de ${reserva.solicitante.nombre} aprobada.` })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setProcesando(null)
      reservas.recargar()
    }
  }

  async function confirmarAccion() {
    if (accion.tipo === 'rechazar' && observacion.trim().length < 5) {
      setErrorAccion('Indica el motivo del rechazo (al menos 5 caracteres).')
      return
    }
    setProcesando(accion.reserva.id)
    try {
      if (accion.tipo === 'rechazar') await reservasApi.rechazar(accion.reserva.id, observacion.trim())
      else await reservasApi.cancelar(accion.reserva.id, observacion.trim())
      setMensaje({ tipo: 'exito', texto: accion.tipo === 'rechazar' ? 'Solicitud rechazada.' : 'Reserva cancelada.' })
      cerrarAccion()
    } catch (error) {
      setErrorAccion(error.message)
    } finally {
      setProcesando(null)
      reservas.recargar()
    }
  }

  function abrirAccion(tipo, reserva) {
    setAccion({ tipo, reserva })
    setObservacion('')
    setErrorAccion(null)
  }

  function cerrarAccion() {
    setAccion(null)
  }

  const datos = reservas.datos

  return (
    <>
      <form className="panel-blanco mb-3" role="search" onSubmit={(evento) => evento.preventDefault()}>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-4">
            <label htmlFor="filtro-estado" className="form-label small fw-semibold">
              Estado
            </label>
            <select id="filtro-estado" className="form-select" value={estado} onChange={(e) => cambiarParametro('estado', e.target.value)}>
              <option value="todas">Todas</option>
              {Object.entries(ESTADOS_RESERVA).map(([valor, { texto }]) => (
                <option key={valor} value={valor}>
                  {texto === 'Pendiente' ? 'Pendientes de revisión' : `${texto}s`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-8">
            <label htmlFor="filtro-texto" className="form-label small fw-semibold">
              Buscar
            </label>
            <input
              id="filtro-texto"
              type="search"
              className="form-control"
              placeholder="Nombre o RUT del solicitante, o nombre del espacio"
              defaultValue={q}
              onKeyDown={(e) => e.key === 'Enter' && cambiarParametro('q', e.currentTarget.value.trim())}
              onBlur={(e) => cambiarParametro('q', e.currentTarget.value.trim())}
            />
          </div>
        </div>
      </form>

      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}

      <EstadoCarga consulta={reservas} texto="Cargando reservas..." />

      {datos && datos.items.length === 0 && (
        <MensajeVacio
          icono={estado === 'pendiente' ? 'bi-check2-all' : 'bi-inbox'}
          titulo={estado === 'pendiente' ? 'No hay solicitudes por revisar' : 'No hay reservas con esos filtros'}
        />
      )}

      {datos && datos.items.length > 0 && (
        <>
          <p className="text-muted small">{datos.total} resultado(s)</p>
          <div className="table-responsive panel-blanco p-0">
            <table className="table tabla-admin align-middle">
              <thead>
                <tr>
                  <th scope="col">Fecha y horario</th>
                  <th scope="col">Espacio</th>
                  <th scope="col">Solicitante</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((reserva) => (
                  <tr key={reserva.id}>
                    <td className="text-nowrap">
                      {formatearFechaCorta(reserva.fecha)}
                      <div className="small text-muted">{reserva.bloque}</div>
                    </td>
                    <td>
                      {reserva.espacio.nombre}
                      <div className="small text-muted">
                        Edificio {reserva.espacio.edificio.codigo} · cap. {reserva.espacio.capacidad}
                      </div>
                    </td>
                    <td>
                      {reserva.solicitante.nombre}
                      <div className="small text-muted">{reserva.solicitante.rut}</div>
                    </td>
                    <td className="small">
                      {reserva.motivo}
                      <div className="text-muted">{reserva.asistentes} asistente(s)</div>
                    </td>
                    <td>
                      <EstadoReserva estado={reserva.estado} />
                      {reserva.observacion && <div className="small text-muted mt-1">{reserva.observacion}</div>}
                    </td>
                    <td className="text-end text-nowrap">
                      {reserva.estado === 'pendiente' && reserva.estadoTemporal === 'proxima' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-success me-1"
                            disabled={procesando === reserva.id}
                            onClick={() => aprobar(reserva)}
                          >
                            Aprobar
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger me-1" onClick={() => abrirAccion('rechazar', reserva)}>
                            Rechazar
                          </button>
                        </>
                      )}
                      {reserva.estado === 'aprobada' && sePuedeCancelar(reserva) && (
                        <button type="button" className="btn btn-sm btn-outline-danger me-1" onClick={() => abrirAccion('cancelar', reserva)}>
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        aria-label={`Historial de la reserva ${reserva.id}`}
                        onClick={() => setReservaHistorial(reserva)}
                      >
                        <i className="bi bi-clock-history" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} onCambiar={(n) => cambiarParametro('pagina', n)} etiqueta="Páginas de reservas" />
        </>
      )}

      <Ventana
        abierto={accion !== null}
        titulo={accion?.tipo === 'rechazar' ? 'Rechazar solicitud' : 'Cancelar reserva'}
        onCerrar={cerrarAccion}
        pie={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={cerrarAccion}>
              Volver
            </button>
            <button type="button" className="btn btn-danger" disabled={procesando !== null} onClick={confirmarAccion}>
              {accion?.tipo === 'rechazar' ? 'Rechazar' : 'Cancelar reserva'}
            </button>
          </>
        }
      >
        {accion && (
          <>
            <p>
              {accion.reserva.espacio.nombre} · {formatearFechaCorta(accion.reserva.fecha)} {accion.reserva.bloque} ·{' '}
              {accion.reserva.solicitante.nombre}
            </p>
            <label htmlFor="observacion-accion" className="form-label small fw-semibold">
              {accion.tipo === 'rechazar' ? 'Motivo del rechazo (lo verá el estudiante)' : 'Motivo (opcional)'}
            </label>
            <textarea
              id="observacion-accion"
              className="form-control"
              rows={3}
              maxLength={300}
              autoFocus
              value={observacion}
              onChange={(e) => {
                setObservacion(e.target.value)
                setErrorAccion(null)
              }}
            />
            {errorAccion && <Alerta tipo="error">{errorAccion}</Alerta>}
          </>
        )}
      </Ventana>

      <HistorialReserva reserva={reservaHistorial} onCerrar={() => setReservaHistorial(null)} />
    </>
  )
}

export default SolicitudesPage
