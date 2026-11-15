import Variacion from './Variacion.jsx'
import { COLOR_ESTADO, NOMBRE_ESTADO, formatearNumero, formatearPorcentaje } from './escalas.js'

const ORDEN = ['aprobada', 'pendiente', 'rechazada', 'cancelada']

// Estado de las reservas del período: una barra apilada al 100%, la cantidad de cada estado
// y, debajo, las dos tasas que importan para la gestión (cancelación y rechazo).
// "tasas" = [{ clave, etiqueta, valor, descripcion, variacion }]
function EstadosReservas({ porEstado, total, tasas, dias, porRevisar }) {
  const partes = ORDEN.map((estado) => {
    const cantidad = porEstado[estado] ?? 0
    return { estado, cantidad, porcentaje: total ? (cantidad / total) * 100 : 0 }
  })
  const descripcion = partes.map((p) => `${NOMBRE_ESTADO[p.estado]}: ${formatearNumero(p.cantidad)}`).join(', ')

  return (
    <div className="ind-estados">
      <div className="ind-estados__barra" role="img" aria-label={`Reservas por estado. ${descripcion}`}>
        {total === 0 ? (
          <span className="ind-estados__vacia"></span>
        ) : (
          partes
            .filter((p) => p.cantidad > 0)
            .map((p) => (
              <span
                key={p.estado}
                className="ind-estados__segmento"
                style={{ flexGrow: p.cantidad, background: COLOR_ESTADO[p.estado] }}
                title={`${NOMBRE_ESTADO[p.estado]}: ${formatearNumero(p.cantidad)} (${formatearPorcentaje(p.porcentaje)})`}
              ></span>
            ))
        )}
      </div>

      <ul className="ind-estados__lista">
        {partes.map((p) => (
          <li key={p.estado}>
            <span className="ind-muestra" style={{ background: COLOR_ESTADO[p.estado] }} aria-hidden="true"></span>
            <span className="ind-estados__nombre">{NOMBRE_ESTADO[p.estado]}</span>
            <span className="ind-estados__cantidad">{formatearNumero(p.cantidad)}</span>
            <span className="ind-estados__porcentaje">{formatearPorcentaje(p.porcentaje)}</span>
          </li>
        ))}
      </ul>

      {porRevisar !== undefined && porRevisar !== (porEstado.pendiente ?? 0) && (
        // Las dos cifras de "pendientes" miden cosas distintas: aquí, las del período; arriba, todas desde hoy
        <p className="ind-estados__nota">
          Pendientes del período: {formatearNumero(porEstado.pendiente ?? 0)}. Las {formatearNumero(porRevisar)} solicitudes por
          revisar de arriba incluyen todas las fechas desde hoy en adelante.
        </p>
      )}

      <dl className="ind-tasas">
        {tasas.map((tasa) => (
          <div key={tasa.clave} className="ind-tasas__item">
            <dt>{tasa.etiqueta}</dt>
            <dd>
              <span className="ind-tasas__valor">{formatearPorcentaje(tasa.valor)}</span>
              <span className="ind-tasas__detalle">{tasa.descripcion}</span>
              {tasa.variacion && <Variacion cambio={tasa.variacion} dias={dias} className="ind-tasas__detalle" />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default EstadosReservas
