import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import sede from '../data/sede.json'
import PanelClima from '../components/PanelClima.jsx'
import SelectorDia from '../components/SelectorDia.jsx'
import SelectorHorario from '../components/SelectorHorario.jsx'
import AtribucionClima from '../components/AtribucionClima.jsx'
import Alerta from '../components/Alerta.jsx'
import Ventana from '../components/Ventana.jsx'
import MensajeVacio from '../components/MensajeVacio.jsx'
import EstadoCarga from '../components/EstadoCarga.jsx'
import CampoTexto from '../components/CampoTexto.jsx'
import { useAhora } from '../hooks/useAhora.js'
import { useApi } from '../hooks/useApi.js'
import { useClima } from '../hooks/useClima.js'
import { useSesion } from '../context/sesion.js'
import { reservasApi } from '../services/reservaunabApi.js'
import { imagenDeEspacio } from '../utils/imagenes.js'
import { fechaHoy, fechasReservables, formatearBloque, formatearFechaLarga } from '../utils/fechas.js'
import { debeAvisarLluvia } from '../utils/reglasReserva.js'
import { describirUbicacion, textoCapacidad, textoEquipo } from '../utils/textos.js'
import { erroresDeApi } from '../utils/validaciones.js'
import './DetalleEspacioPage.css'

function validarSolicitud({ motivo, asistentes }, capacidad) {
  const errores = {}
  if (motivo.trim().length < 5) errores.motivo = 'Cuéntanos para qué es la reserva (al menos 5 caracteres).'
  const cantidad = Number(asistentes)
  if (!Number.isInteger(cantidad) || cantidad < 1) errores.asistentes = 'Debe asistir al menos 1 persona.'
  else if (cantidad > capacidad) errores.asistentes = `El espacio tiene capacidad para ${textoCapacidad(capacidad)}.`
  return errores
}

function DetalleEspacioPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const ahora = useAhora()
  const { usuario } = useSesion()

  const fechaUrl = params.get('fecha')
  const [fecha, setFecha] = useState(() => (fechasReservables(ahora).includes(fechaUrl) ? fechaUrl : fechaHoy(ahora)))
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null)
  const [solicitud, setSolicitud] = useState({ motivo: '', asistentes: '1' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [reservaConfirmada, setReservaConfirmada] = useState(null)

  const espacio = useApi(`/espacios/${id}`)
  const disponibilidad = useApi(`/espacios/${id}/disponibilidad`, { fecha })
  const clima = useClima(fecha)

  function volverAEspacios() {
    // si vino desde la app, volver atrás recupera los filtros del catálogo
    if (location.key !== 'default') navigate(-1)
    else navigate('/')
  }

  if (espacio.error?.status === 404) {
    return (
      <section aria-labelledby="titulo-no-encontrado">
        <h1 id="titulo-no-encontrado" className="visually-hidden">
          Espacio no encontrado
        </h1>
        <MensajeVacio
          icono="bi-door-open"
          titulo="Espacio no encontrado"
          mensaje="El espacio que buscas no existe o ya no está disponible."
          accion={{ texto: 'Ver todos los espacios', ruta: '/' }}
        />
      </section>
    )
  }
  if (!espacio.datos) return <EstadoCarga consulta={espacio} texto="Cargando el espacio..." />

  const datos = espacio.datos
  // cada bloque con su estado (que calcula la API) y su clima (de Open-Meteo)
  const bloquesDelDia = (disponibilidad.datos?.bloques ?? []).map(({ bloque, estado }) => ({
    bloque,
    estado,
    clima: clima.datos?.porHora[bloque.slice(0, 5)] ?? null,
  }))
  const climaElegido = bloquesDelDia.find((b) => b.bloque === bloqueSeleccionado)?.clima ?? null
  const avisarLluvia = bloqueSeleccionado !== null && debeAvisarLluvia(datos, climaElegido)

  function cambiarFecha(nuevaFecha) {
    setFecha(nuevaFecha)
    setBloqueSeleccionado(null) // el horario elegido era del otro día
    setError(null)
  }

  function elegirBloque(bloque) {
    setBloqueSeleccionado(bloque)
    setError(null)
  }

  function cambiarCampo(campo, valor) {
    setSolicitud((anterior) => ({ ...anterior, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: null }))
  }

  async function confirmar(evento) {
    evento.preventDefault()
    if (!bloqueSeleccionado) {
      setError('Elige un horario.')
      return
    }
    const encontrados = validarSolicitud(solicitud, datos.capacidad)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    setError(null)
    try {
      // La API vuelve a validar todo: conflicto de horario, una reserva por día, capacidad y anticipación
      const nueva = await reservasApi.crear({
        espacioId: datos.id,
        fecha,
        bloque: bloqueSeleccionado,
        motivo: solicitud.motivo.trim(),
        asistentes: Number(solicitud.asistentes),
      })
      setReservaConfirmada(nueva)
      setBloqueSeleccionado(null)
      setSolicitud({ motivo: '', asistentes: '1' })
    } catch (problema) {
      setError(problema.message)
      setErrores(erroresDeApi(problema))
      if (problema.status === 409) setBloqueSeleccionado(null) // alguien tomó el bloque: se muestra actualizado
    } finally {
      setEnviando(false)
      disponibilidad.recargar()
    }
  }

  return (
    <article aria-labelledby="titulo-espacio">
      <button type="button" className="btn btn-link px-0 mb-3" onClick={volverAEspacios}>
        <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
        Volver a espacios
      </button>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <img src={imagenDeEspacio(datos)} alt={datos.nombre} className="detalle__imagen" />
          <h1 id="titulo-espacio" className="titulo-pagina mt-3 mb-1">
            {datos.nombre}
          </h1>
          <p className="text-muted mb-2">
            {describirUbicacion(datos)} - Capacidad: {textoCapacidad(datos.capacidad)}
          </p>
          <ul className="lista-etiquetas" aria-label="Equipamiento">
            {datos.equipamiento.map((equipo) => (
              <li key={equipo.id}>{textoEquipo(equipo)}</li>
            ))}
          </ul>
          {datos.requiereAprobacion && (
            <Alerta tipo="info">
              Este espacio <strong>requiere aprobación</strong>: tu reserva quedará pendiente hasta que la sede la revise.
            </Alerta>
          )}
          <PanelClima clima={clima} fecha={fecha} sede={sede.nombre} onReintentar={clima.reintentar} />
        </div>

        <div className="col-12 col-lg-7">
          <form className="panel-blanco" aria-labelledby="titulo-reservar" noValidate onSubmit={confirmar}>
            <h2 id="titulo-reservar" className="h4 mb-3">
              Reservar
            </h2>

            <h3 className="detalle__paso">1. Elige el día</h3>
            <SelectorDia fecha={fecha} onCambiar={cambiarFecha} ahora={ahora} etiqueta="Día de la reserva" />

            <h3 className="detalle__paso">
              2. Elige el horario <span className="fw-normal text-muted small">(bloques de 1 hora)</span>
            </h3>
            <EstadoCarga consulta={disponibilidad} texto="Consultando horarios..." />
            {disponibilidad.datos && (
              <SelectorHorario bloques={bloquesDelDia} seleccionado={bloqueSeleccionado} onSeleccionar={elegirBloque} />
            )}
            {clima.estado === 'listo' && <AtribucionClima />}

            {avisarLluvia && (
              <Alerta tipo="aviso">
                <strong>Espacio exterior:</strong> hay {climaElegido.probLluvia}% de probabilidad de lluvia a las{' '}
                {bloqueSeleccionado.slice(0, 5)}. Considera otro horario, otro día o un espacio interior.
              </Alerta>
            )}

            <h3 className="detalle__paso">3. Cuéntanos los detalles y confirma</h3>
            {usuario ? (
              <div className="detalle__confirmar">
                <div className="row g-2">
                  <div className="col-12 col-md-8">
                    <CampoTexto
                      id="reserva-motivo"
                      etiqueta="Motivo"
                      valor={solicitud.motivo}
                      error={errores.motivo}
                      ayuda="Ejemplo: Estudio para la prueba de Cálculo"
                      onCambiar={(valor) => cambiarCampo('motivo', valor)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <CampoTexto
                      id="reserva-asistentes"
                      etiqueta="Asistentes"
                      tipo="number"
                      valor={solicitud.asistentes}
                      error={errores.asistentes}
                      ayuda={`Máximo ${datos.capacidad}`}
                      onCambiar={(valor) => cambiarCampo('asistentes', valor)}
                    />
                  </div>
                </div>
                <p className="mb-2">
                  Reservarás como <strong>{usuario.nombre}</strong> (RUT {usuario.rut})
                </p>
                {error && <Alerta tipo="error">{error}</Alerta>}
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                  {datos.requiereAprobacion ? 'Enviar solicitud' : 'Confirmar reserva'}
                </button>
              </div>
            ) : (
              <Alerta tipo="info">
                Para reservar necesitas iniciar sesión.{' '}
                <Link to="/ingresar" state={{ desde: location.pathname + location.search }} className="alert-link">
                  Ingresar o crear cuenta
                </Link>
              </Alerta>
            )}
          </form>
        </div>
      </div>

      <Ventana
        abierto={reservaConfirmada !== null}
        titulo={reservaConfirmada?.estado === 'pendiente' ? 'Solicitud enviada' : 'Reserva confirmada'}
        onCerrar={() => setReservaConfirmada(null)}
        pie={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={volverAEspacios}>
              Seguir explorando
            </button>
            <button type="button" className="btn btn-primary" autoFocus onClick={() => navigate('/mis-reservas')}>
              Ver mis reservas
            </button>
          </>
        }
      >
        {reservaConfirmada && (
          <>
            <p className="mb-2">
              {reservaConfirmada.estado === 'pendiente'
                ? 'Tu solicitud quedó registrada y está pendiente de aprobación:'
                : 'Tu reserva quedó registrada:'}
            </p>
            <ul className="mb-0">
              <li>
                <strong>{datos.nombre}</strong>
              </li>
              <li>{formatearFechaLarga(reservaConfirmada.fecha)}</li>
              <li>{formatearBloque(reservaConfirmada.bloque)}</li>
            </ul>
          </>
        )}
      </Ventana>
    </article>
  )
}

export default DetalleEspacioPage
