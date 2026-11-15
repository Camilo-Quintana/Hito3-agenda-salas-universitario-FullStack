import { useState } from 'react'
import Alerta from '../../components/Alerta.jsx'
import CampoTexto from '../../components/CampoTexto.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import Ventana from '../../components/Ventana.jsx'
import { useApi } from '../../hooks/useApi.js'
import { edificiosApi, equipamientoApi } from '../../services/reservaunabApi.js'
import { erroresDeApi } from '../../utils/validaciones.js'

const EDIFICIO_VACIO = { codigo: '', nombre: '', ubicacion: '', pisos: '1' }

function validarEdificio({ codigo, nombre, pisos }) {
  const errores = {}
  if (!/^[A-Za-z0-9-]{1,10}$/.test(codigo.trim())) errores.codigo = 'De 1 a 10 letras, números o guiones.'
  if (nombre.trim().length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.'
  const n = Number(pisos)
  if (!Number.isInteger(n) || n < 1 || n > 30) errores.pisos = 'Entre 1 y 30 pisos.'
  return errores
}

// Edificios (con sus pisos) y catálogo de equipamiento que se asigna a los espacios
function EdificiosAdminPage() {
  const edificios = useApi('/edificios')
  const equipamiento = useApi('/equipamiento')
  const [mensaje, setMensaje] = useState(null)

  // formulario de edificio: null = cerrado; { id?, valores }
  const [formEdificio, setFormEdificio] = useState(null)
  const [erroresEdificio, setErroresEdificio] = useState({})
  const [errorEdificio, setErrorEdificio] = useState(null)

  const [nuevoEquipo, setNuevoEquipo] = useState('')
  const [equipoEditado, setEquipoEditado] = useState(null) // { id, nombre }
  const [errorEquipo, setErrorEquipo] = useState(null)

  function abrirEdificio(edificio) {
    setFormEdificio(
      edificio
        ? { id: edificio.id, valores: { codigo: edificio.codigo, nombre: edificio.nombre, ubicacion: edificio.ubicacion ?? '', pisos: String(edificio.pisos) } }
        : { valores: EDIFICIO_VACIO },
    )
    setErroresEdificio({})
    setErrorEdificio(null)
  }

  function cambiarEdificio(campo, valor) {
    setFormEdificio((f) => ({ ...f, valores: { ...f.valores, [campo]: valor } }))
    setErroresEdificio((e) => ({ ...e, [campo]: null }))
  }

  async function guardarEdificio(evento) {
    evento.preventDefault()
    const { id, valores } = formEdificio
    const encontrados = validarEdificio(valores)
    setErroresEdificio(encontrados)
    if (Object.keys(encontrados).length > 0) return
    const datos = { codigo: valores.codigo.trim().toUpperCase(), nombre: valores.nombre.trim(), ubicacion: valores.ubicacion.trim(), pisos: Number(valores.pisos) }
    try {
      if (id) await edificiosApi.actualizar(id, datos)
      else await edificiosApi.crear(datos)
      setMensaje({ tipo: 'exito', texto: id ? 'Edificio actualizado.' : `Edificio ${datos.codigo} creado.` })
      setFormEdificio(null)
      edificios.recargar()
    } catch (error) {
      setErrorEdificio(error.message)
      setErroresEdificio(erroresDeApi(error))
    }
  }

  async function eliminarEdificio(edificio) {
    try {
      await edificiosApi.eliminar(edificio.id)
      setMensaje({ tipo: 'exito', texto: `Edificio ${edificio.codigo} eliminado.` })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    }
    edificios.recargar()
  }

  async function agregarEquipo(evento) {
    evento.preventDefault()
    if (nuevoEquipo.trim().length < 2) {
      setErrorEquipo('Escribe el nombre del equipo (al menos 2 caracteres).')
      return
    }
    try {
      await equipamientoApi.crear({ nombre: nuevoEquipo.trim() })
      setNuevoEquipo('')
      setErrorEquipo(null)
      equipamiento.recargar()
    } catch (error) {
      setErrorEquipo(error.message)
    }
  }

  async function renombrarEquipo(evento) {
    evento.preventDefault()
    try {
      await equipamientoApi.actualizar(equipoEditado.id, { nombre: equipoEditado.nombre.trim() })
      setEquipoEditado(null)
      equipamiento.recargar()
    } catch (error) {
      setErrorEquipo(error.message)
    }
  }

  async function eliminarEquipo(equipo) {
    try {
      await equipamientoApi.eliminar(equipo.id)
      setMensaje({ tipo: 'exito', texto: `"${equipo.nombre}" eliminado del catálogo.` })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    }
    equipamiento.recargar()
  }

  return (
    <>
      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <section className="panel-blanco" aria-labelledby="titulo-edificios">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="titulo-edificios" className="h6 mb-0">
                Edificios
              </h2>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => abrirEdificio(null)}>
                <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                Nuevo edificio
              </button>
            </div>
            <EstadoCarga consulta={edificios} />
            {edificios.datos && (
              <div className="table-responsive">
                <table className="table tabla-admin align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Nombre</th>
                      <th scope="col" className="text-end">Pisos</th>
                      <th scope="col" className="text-end">Espacios</th>
                      <th scope="col" className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edificios.datos.map((edificio) => (
                      <tr key={edificio.id}>
                        <td>
                          <strong>{edificio.codigo}</strong>
                        </td>
                        <td>
                          {edificio.nombre}
                          {edificio.ubicacion && <div className="small text-muted">{edificio.ubicacion}</div>}
                        </td>
                        <td className="text-end">{edificio.pisos}</td>
                        <td className="text-end">{edificio.totalEspacios}</td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirEdificio(edificio)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            aria-label={`Eliminar edificio ${edificio.codigo}`}
                            title={edificio.totalEspacios > 0 ? 'Tiene espacios: no se puede eliminar' : 'Eliminar'}
                            onClick={() => eliminarEdificio(edificio)}
                          >
                            <i className="bi bi-trash" aria-hidden="true"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="col-12 col-lg-5">
          <section className="panel-blanco" aria-labelledby="titulo-equipamiento">
            <h2 id="titulo-equipamiento" className="h6">
              Catálogo de equipamiento
            </h2>
            <form className="input-group mb-2" onSubmit={agregarEquipo}>
              <input
                className="form-control"
                placeholder="Nuevo equipo (ej. Pizarra digital)"
                aria-label="Nombre del nuevo equipo"
                value={nuevoEquipo}
                onChange={(e) => {
                  setNuevoEquipo(e.target.value)
                  setErrorEquipo(null)
                }}
              />
              <button type="submit" className="btn btn-outline-primary">
                Agregar
              </button>
            </form>
            {errorEquipo && <Alerta tipo="error">{errorEquipo}</Alerta>}
            <EstadoCarga consulta={equipamiento} />
            <ul className="list-group list-group-flush" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {(equipamiento.datos ?? []).map((equipo) => (
                <li key={equipo.id} className="list-group-item d-flex align-items-center gap-2 px-0">
                  {equipoEditado?.id === equipo.id ? (
                    <form className="input-group input-group-sm" onSubmit={renombrarEquipo}>
                      <input
                        className="form-control"
                        aria-label="Nuevo nombre"
                        autoFocus
                        value={equipoEditado.nombre}
                        onChange={(e) => setEquipoEditado({ ...equipoEditado, nombre: e.target.value })}
                      />
                      <button type="submit" className="btn btn-primary">
                        Guardar
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setEquipoEditado(null)}>
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-grow-1">{equipo.nombre}</span>
                      <span className="small text-muted">{equipo.totalEspacios} esp.</span>
                      <button type="button" className="btn btn-sm btn-link p-0" aria-label={`Renombrar ${equipo.nombre}`} onClick={() => setEquipoEditado({ id: equipo.id, nombre: equipo.nombre })}>
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0"
                        aria-label={`Eliminar ${equipo.nombre}`}
                        disabled={equipo.totalEspacios > 0}
                        title={equipo.totalEspacios > 0 ? 'Está asignado a espacios' : 'Eliminar'}
                        onClick={() => eliminarEquipo(equipo)}
                      >
                        <i className="bi bi-trash" aria-hidden="true"></i>
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Ventana abierto={formEdificio !== null} titulo={formEdificio?.id ? 'Editar edificio' : 'Nuevo edificio'} onCerrar={() => setFormEdificio(null)}>
        {formEdificio && (
          <form noValidate onSubmit={guardarEdificio}>
            <div className="row g-2">
              <div className="col-4">
                <CampoTexto id="edificio-codigo" etiqueta="Código" valor={formEdificio.valores.codigo} error={erroresEdificio.codigo} onCambiar={(v) => cambiarEdificio('codigo', v)} />
              </div>
              <div className="col-8">
                <CampoTexto id="edificio-pisos" etiqueta="Pisos" tipo="number" valor={formEdificio.valores.pisos} error={erroresEdificio.pisos} onCambiar={(v) => cambiarEdificio('pisos', v)} />
              </div>
            </div>
            <CampoTexto id="edificio-nombre" etiqueta="Nombre" valor={formEdificio.valores.nombre} error={erroresEdificio.nombre} onCambiar={(v) => cambiarEdificio('nombre', v)} />
            <CampoTexto id="edificio-ubicacion" etiqueta="Ubicación (opcional)" valor={formEdificio.valores.ubicacion} error={erroresEdificio.ubicacion} onCambiar={(v) => cambiarEdificio('ubicacion', v)} />
            {errorEdificio && <Alerta tipo="error">{errorEdificio}</Alerta>}
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setFormEdificio(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </form>
        )}
      </Ventana>
    </>
  )
}

export default EdificiosAdminPage
