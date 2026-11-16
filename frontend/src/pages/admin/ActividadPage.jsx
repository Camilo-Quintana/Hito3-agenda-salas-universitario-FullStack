import { useSearchParams } from 'react-router-dom'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import MensajeVacio from '../../components/MensajeVacio.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import { useApi } from '../../hooks/useApi.js'
import { formatearFechaHora } from '../../utils/fechas.js'
import { TEXTO_EVENTO } from '../../utils/textos.js'

const ENTIDADES = [
  { valor: '', texto: 'Todo' },
  { valor: 'reserva', texto: 'Reservas' },
  { valor: 'espacio', texto: 'Espacios' },
  { valor: 'edificio', texto: 'Edificios' },
  { valor: 'equipamiento', texto: 'Equipamiento' },
  { valor: 'usuario', texto: 'Usuarios' },
]

// Resume los datos propios de cada tipo de evento (el documento de MongoDB cambia según el tipo)
function detalleEvento(evento) {
  const datos = evento.datos ?? {}
  if (evento.tipo === 'reserva.creada') {
    return `${datos.espacio?.nombre ?? 'Espacio'} · ${datos.fecha} ${datos.bloque} · ${datos.motivo} (${datos.estado})`
  }
  if (evento.tipo.startsWith('reserva.')) return datos.observacion ? `“${datos.observacion}”` : ''
  if (datos.cambios) {
    return Object.entries(datos.cambios)
      .map(([campo, { antes, despues }]) => `${campo}: ${formatear(antes)} → ${formatear(despues)}`)
      .join(' · ')
  }
  if (datos.nombre) return datos.nombre
  if (datos.espacio?.nombre) return datos.espacio.nombre
  if (datos.edificio?.nombre) return datos.edificio.nombre
  return ''
}

function formatear(valor) {
  if (Array.isArray(valor)) return valor.map((v) => v.nombre ?? v).join(', ') || '—'
  if (valor && typeof valor === 'object') return valor.codigo ?? valor.nombre ?? JSON.stringify(valor)
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no'
  return String(valor ?? '—')
}

// Bitácora del sistema: documentos de la colección "eventos" de MongoDB (GET /actividad)
function ActividadPage() {
  const [params, setParams] = useSearchParams()
  const entidad = params.get('entidad') ?? ''
  const pagina = Number(params.get('pagina')) || 1
  const actividad = useApi('/actividad', { entidad, pagina, limite: 20 })

  function cambiar(clave, valor) {
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores)
        if (valor) nuevos.set(clave, String(valor))
        else nuevos.delete(clave)
        if (clave !== 'pagina') nuevos.delete('pagina')
        return nuevos
      },
      { replace: true },
    )
  }

  const datos = actividad.datos

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        {ENTIDADES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`btn btn-sm ${entidad === opcion.valor ? 'btn-primary' : 'btn-outline-primary'}`}
            aria-pressed={entidad === opcion.valor}
            onClick={() => cambiar('entidad', opcion.valor)}
          >
            {opcion.texto}
          </button>
        ))}
        {datos && <span className="text-muted small ms-auto">{datos.total} eventos</span>}
      </div>

      <EstadoCarga consulta={actividad} texto="Cargando actividad..." />
      {datos && datos.items.length === 0 && <MensajeVacio icono="bi-activity" titulo="Sin actividad registrada" />}

      {datos && datos.items.length > 0 && (
        <>
          <div className="table-responsive panel-blanco p-0">
            <table className="table tabla-admin align-middle">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Evento</th>
                  <th scope="col">Quién</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((evento) => (
                  <tr key={evento._id}>
                    <td className="text-nowrap small">{formatearFechaHora(evento.fecha)}</td>
                    <td className="text-nowrap">
                      {TEXTO_EVENTO[evento.tipo] ?? evento.tipo}
                      <div className="small text-muted">
                        {evento.entidad.tipo} #{evento.entidad.id}
                      </div>
                    </td>
                    <td className="small">
                      {evento.actor.nombre}
                      {evento.actor.rol === 'admin' && <span className="badge estado-reserva pendiente ms-1">admin</span>}
                    </td>
                    <td className="small">{detalleEvento(evento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} onCambiar={(n) => cambiar('pagina', n)} etiqueta="Páginas de actividad" />
        </>
      )}
    </>
  )
}

export default ActividadPage
