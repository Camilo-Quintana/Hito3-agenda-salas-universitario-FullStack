import { useState } from 'react'
import CampoTexto from './CampoTexto.jsx'
import Alerta from './Alerta.jsx'
import { TIPOS_ESPACIO } from '../utils/reglasReserva.js'
import { erroresDeApi } from '../utils/validaciones.js'

function valoresIniciales(espacio, edificios) {
  if (!espacio) {
    return { nombre: '', tipo: 'Clases', edificioId: String(edificios[0]?.id ?? ''), piso: '1', capacidad: '10', requiereAprobacion: false, activo: true, equipos: {} }
  }
  return {
    nombre: espacio.nombre,
    tipo: espacio.tipo,
    edificioId: String(espacio.edificio.id),
    piso: String(espacio.piso),
    capacidad: String(espacio.capacidad),
    requiereAprobacion: espacio.requiereAprobacion,
    activo: espacio.activo,
    equipos: Object.fromEntries(espacio.equipamiento.map((e) => [e.id, String(e.cantidad)])),
  }
}

function validar(valores, edificio) {
  const errores = {}
  if (valores.nombre.trim().length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.'
  const piso = Number(valores.piso)
  if (!Number.isInteger(piso) || piso < 1) errores.piso = 'El piso debe ser un número entero desde 1.'
  else if (edificio && piso > edificio.pisos) errores.piso = `El edificio ${edificio.codigo} tiene ${edificio.pisos} piso(s).`
  const capacidad = Number(valores.capacidad)
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 500) errores.capacidad = 'La capacidad debe ser un entero entre 1 y 500.'
  if (Object.values(valores.equipos).some((c) => !Number.isInteger(Number(c)) || Number(c) < 1)) {
    errores.equipos = 'Cada equipo marcado debe tener una cantidad de 1 o más.'
  }
  return errores
}

// Formulario para crear o editar un espacio. "alGuardar" recibe los datos listos para la API.
function FormularioEspacio({ espacio, edificios, equipamiento, alGuardar, alCancelar }) {
  const [valores, setValores] = useState(() => valoresIniciales(espacio, edificios))
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const edificio = edificios.find((e) => String(e.id) === valores.edificioId)

  function cambiar(campo, valor) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: null }))
  }

  function alternarEquipo(id, marcado) {
    setValores((anteriores) => {
      const equipos = { ...anteriores.equipos }
      if (marcado) equipos[id] = '1'
      else delete equipos[id]
      return { ...anteriores, equipos }
    })
  }

  async function enviar(evento) {
    evento.preventDefault()
    const encontrados = validar(valores, edificio)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setGuardando(true)
    setError(null)
    try {
      await alGuardar({
        nombre: valores.nombre.trim(),
        tipo: valores.tipo,
        edificioId: Number(valores.edificioId),
        piso: Number(valores.piso),
        capacidad: Number(valores.capacidad),
        requiereAprobacion: valores.requiereAprobacion,
        activo: valores.activo,
        equipamiento: Object.entries(valores.equipos).map(([id, cantidad]) => ({ equipamientoId: Number(id), cantidad: Number(cantidad) })),
      })
    } catch (problema) {
      setError(problema.message)
      setErrores(erroresDeApi(problema))
      setGuardando(false)
    }
  }

  return (
    <form noValidate onSubmit={enviar}>
      <CampoTexto id="espacio-nombre" etiqueta="Nombre" valor={valores.nombre} error={errores.nombre} onCambiar={(v) => cambiar('nombre', v)} />
      <div className="row g-2">
        <div className="col-6">
          <label htmlFor="espacio-tipo" className="form-label fw-semibold">
            Tipo
          </label>
          <select id="espacio-tipo" className="form-select mb-3" value={valores.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
            {TIPOS_ESPACIO.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
        <div className="col-6">
          <label htmlFor="espacio-edificio" className="form-label fw-semibold">
            Edificio
          </label>
          <select id="espacio-edificio" className="form-select mb-3" value={valores.edificioId} onChange={(e) => cambiar('edificioId', e.target.value)}>
            {edificios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} - {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6">
          <CampoTexto id="espacio-piso" etiqueta="Piso" tipo="number" valor={valores.piso} error={errores.piso} onCambiar={(v) => cambiar('piso', v)} />
        </div>
        <div className="col-6">
          <CampoTexto id="espacio-capacidad" etiqueta="Capacidad" tipo="number" valor={valores.capacidad} error={errores.capacidad} onCambiar={(v) => cambiar('capacidad', v)} />
        </div>
      </div>

      <div className="form-check form-switch">
        <input id="espacio-aprobacion" className="form-check-input" type="checkbox" checked={valores.requiereAprobacion} onChange={(e) => cambiar('requiereAprobacion', e.target.checked)} />
        <label htmlFor="espacio-aprobacion" className="form-check-label">
          Requiere aprobación (las reservas quedan pendientes)
        </label>
      </div>
      <div className="form-check form-switch mb-3">
        <input id="espacio-activo" className="form-check-input" type="checkbox" checked={valores.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
        <label htmlFor="espacio-activo" className="form-check-label">
          Activo (aparece en el catálogo y acepta reservas)
        </label>
      </div>

      <fieldset>
        <legend className="form-label fw-semibold fs-6">Equipamiento</legend>
        <div className="row g-1" style={{ maxHeight: 220, overflowY: 'auto' }}>
          {equipamiento.map((equipo) => {
            const marcado = valores.equipos[equipo.id] !== undefined
            return (
              <div key={equipo.id} className="col-12 col-sm-6 d-flex align-items-center gap-2">
                <input
                  id={`equipo-${equipo.id}`}
                  className="form-check-input mt-0"
                  type="checkbox"
                  checked={marcado}
                  onChange={(e) => alternarEquipo(equipo.id, e.target.checked)}
                />
                <label htmlFor={`equipo-${equipo.id}`} className="small flex-grow-1">
                  {equipo.nombre}
                </label>
                {marcado && (
                  <input
                    type="number"
                    min={1}
                    className="form-control form-control-sm"
                    style={{ width: 70 }}
                    aria-label={`Cantidad de ${equipo.nombre}`}
                    value={valores.equipos[equipo.id]}
                    onChange={(e) => setValores((a) => ({ ...a, equipos: { ...a.equipos, [equipo.id]: e.target.value } }))}
                  />
                )}
              </div>
            )
          })}
        </div>
        {errores.equipos && <div className="text-danger small mt-1">{errores.equipos}</div>}
      </fieldset>

      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
          {espacio ? 'Guardar cambios' : 'Crear espacio'}
        </button>
      </div>
    </form>
  )
}

export default FormularioEspacio
