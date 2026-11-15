import { useState } from 'react'
import Alerta from '../../components/Alerta.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import FormularioEspacio from '../../components/FormularioEspacio.jsx'
import Ventana from '../../components/Ventana.jsx'
import { useApi } from '../../hooks/useApi.js'
import { espaciosApi } from '../../services/reservaunabApi.js'
import { textoEquipo } from '../../utils/textos.js'

// Administración de salas, laboratorios y espacios: crear, editar, activar/desactivar y eliminar
function EspaciosAdminPage() {
  const espacios = useApi('/espacios', { incluirInactivos: true })
  const edificios = useApi('/edificios')
  const equipamiento = useApi('/equipamiento')
  const [edicion, setEdicion] = useState(null) // null = cerrado, 'nuevo' o el espacio a editar
  const [aEliminar, setAEliminar] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [filtroEdificio, setFiltroEdificio] = useState('')

  async function guardar(datos) {
    if (edicion === 'nuevo') await espaciosApi.crear(datos)
    else await espaciosApi.actualizar(edicion.id, datos)
    setMensaje({ tipo: 'exito', texto: edicion === 'nuevo' ? `Espacio "${datos.nombre}" creado.` : 'Cambios guardados.' })
    setEdicion(null)
    espacios.recargar()
  }

  async function alternarActivo(espacio) {
    try {
      await espaciosApi.actualizar(espacio.id, { activo: !espacio.activo })
      setMensaje({ tipo: 'exito', texto: `${espacio.nombre} ${espacio.activo ? 'desactivado' : 'activado'}.` })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    }
    espacios.recargar()
  }

  async function eliminar() {
    try {
      await espaciosApi.eliminar(aEliminar.id)
      setMensaje({ tipo: 'exito', texto: `${aEliminar.nombre} eliminado.` })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    }
    setAEliminar(null)
    espacios.recargar()
  }

  const lista = (espacios.datos ?? []).filter((e) => !filtroEdificio || String(e.edificio.id) === filtroEdificio)
  const listoParaEditar = edificios.datos && equipamiento.datos

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <select className="form-select w-auto" aria-label="Filtrar por edificio" value={filtroEdificio} onChange={(e) => setFiltroEdificio(e.target.value)}>
          <option value="">Todos los edificios</option>
          {(edificios.datos ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              Edificio {e.codigo}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" disabled={!listoParaEditar} onClick={() => setEdicion('nuevo')}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Nuevo espacio
        </button>
      </div>

      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}

      <EstadoCarga consulta={espacios} texto="Cargando espacios..." />

      {espacios.datos && (
        <div className="table-responsive panel-blanco p-0">
          <table className="table tabla-admin align-middle">
            <thead>
              <tr>
                <th scope="col">Espacio</th>
                <th scope="col">Ubicación</th>
                <th scope="col" className="text-end">Capacidad</th>
                <th scope="col">Equipamiento</th>
                <th scope="col">Reglas</th>
                <th scope="col" className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((espacio) => (
                <tr key={espacio.id} className={espacio.activo ? '' : 'table-light text-muted'}>
                  <td>
                    <strong>{espacio.nombre}</strong>
                    <div className="small text-muted">{espacio.tipo}</div>
                  </td>
                  <td className="text-nowrap">
                    Edificio {espacio.edificio.codigo} · Piso {espacio.piso}
                  </td>
                  <td className="text-end">{espacio.capacidad}</td>
                  <td className="small">{espacio.equipamiento.map(textoEquipo).join(', ') || '—'}</td>
                  <td className="small">
                    {espacio.requiereAprobacion && <span className="badge estado-reserva pendiente me-1">Con aprobación</span>}
                    {!espacio.activo && <span className="badge estado-reserva cancelada">Inactivo</span>}
                  </td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-primary me-1" disabled={!listoParaEditar} onClick={() => setEdicion(espacio)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => alternarActivo(espacio)}>
                      {espacio.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Eliminar ${espacio.nombre}`} onClick={() => setAEliminar(espacio)}>
                      <i className="bi bi-trash" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ventana abierto={edicion !== null} titulo={edicion === 'nuevo' ? 'Nuevo espacio' : `Editar ${edicion?.nombre ?? ''}`} onCerrar={() => setEdicion(null)}>
        {edicion !== null && listoParaEditar && (
          <FormularioEspacio
            key={edicion === 'nuevo' ? 'nuevo' : edicion.id}
            espacio={edicion === 'nuevo' ? null : edicion}
            edificios={edificios.datos}
            equipamiento={equipamiento.datos}
            alGuardar={guardar}
            alCancelar={() => setEdicion(null)}
          />
        )}
      </Ventana>

      <Ventana
        abierto={aEliminar !== null}
        titulo="¿Eliminar espacio?"
        onCerrar={() => setAEliminar(null)}
        pie={
          <>
            <button type="button" className="btn btn-outline-secondary" autoFocus onClick={() => setAEliminar(null)}>
              Volver
            </button>
            <button type="button" className="btn btn-danger" onClick={eliminar}>
              Eliminar
            </button>
          </>
        }
      >
        <p className="mb-0">
          Se eliminará <strong>{aEliminar?.nombre}</strong>. Si tiene reservas en su historial no se podrá eliminar; en ese caso,
          desactívalo para que no reciba nuevas.
        </p>
      </Ventana>
    </>
  )
}

export default EspaciosAdminPage
