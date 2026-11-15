import { formatearFechaCorta } from '../../utils/fechas.js'
import { COLOR_ESTADO, formatearNumero } from './escalas.js'

const COLUMNAS = [
  { clave: 'creadas', titulo: 'Creadas', corto: 'Creadas', color: null },
  { clave: 'aprobadas', titulo: 'Aprobadas', corto: 'Aprob.', color: COLOR_ESTADO.aprobada },
  { clave: 'rechazadas', titulo: 'Rechazadas', corto: 'Rechaz.', color: COLOR_ESTADO.rechazada },
  { clave: 'canceladas', titulo: 'Canceladas', corto: 'Cancel.', color: COLOR_ESTADO.cancelada },
]

// Tabla del movimiento diario (MongoDB): día más reciente primero, totales del período al pie.
// Solo muestra los días que tuvieron movimiento; los ceros se atenúan para que destaque la actividad.
function TablaMovimiento({ dias }) {
  const conMovimiento = dias.filter((d) => COLUMNAS.some((c) => d[c.clave] > 0)).reverse()
  const totales = Object.fromEntries(COLUMNAS.map((c) => [c.clave, dias.reduce((suma, d) => suma + d[c.clave], 0)]))

  if (conMovimiento.length === 0) return <p className="ind-vacio">No hubo movimiento en el período.</p>

  return (
    <div className="ind-tabla-desplazable">
      {/* Son eventos de la bitácora, no estados: una reserva creada el lunes y cancelada el martes cuenta en ambos días */}
      <p className="ind-tabla-nota">Acciones registradas cada día: reservas creadas, aprobadas, rechazadas y canceladas ese día.</p>
      <table className="table table-sm ind-tabla mb-0">
        <caption className="visually-hidden">Movimiento diario de reservas</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            {COLUMNAS.map((c) => (
              <th key={c.clave} scope="col" className="text-end">
                {c.color && <span className="ind-muestra" style={{ background: c.color }} aria-hidden="true"></span>}
                <abbr title={c.titulo} className="ind-abreviatura">
                  {c.corto}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {conMovimiento.map((d) => (
            <tr key={d.dia}>
              <th scope="row" className="fw-normal text-nowrap">
                {formatearFechaCorta(d.dia)}
              </th>
              {COLUMNAS.map((c) => (
                <td key={c.clave} className={`text-end ${d[c.clave] === 0 ? 'ind-cero' : ''}`}>
                  {formatearNumero(d[c.clave])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total del período</th>
            {COLUMNAS.map((c) => (
              <td key={c.clave} className="text-end">
                {formatearNumero(totales[c.clave])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default TablaMovimiento
