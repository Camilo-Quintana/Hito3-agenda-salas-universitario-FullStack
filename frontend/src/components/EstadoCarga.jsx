import Alerta from './Alerta.jsx'

// Muestra "cargando" o el error de una consulta a la API (con botón Reintentar).
// Uso: <EstadoCarga consulta={useApi(...)} texto="Cargando espacios..." titulo="No se pudieron cargar los espacios." />
// "titulo" (opcional) dice qué falló; debajo va el detalle que entrega la API.
function EstadoCarga({ consulta, texto = 'Cargando...', titulo }) {
  if (consulta.estado === 'cargando' && consulta.datos === null) {
    return (
      <p className="text-muted my-4" role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {texto}
      </p>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Alerta tipo="error">
        {titulo && <strong className="d-block">{titulo}</strong>}
        {consulta.error.message}
        <div className="mt-2">
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={consulta.recargar}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
            Reintentar
          </button>
        </div>
      </Alerta>
    )
  }
  return null
}

export default EstadoCarga
