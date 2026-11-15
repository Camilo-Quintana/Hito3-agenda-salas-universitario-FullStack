import { Fragment, useState } from 'react'
import { formatearNumero, formatearPorcentaje } from './escalas.js'

const COLUMNAS = 6

// Ranking de espacios en una sola tabla con dos grupos plegables: más utilizados y menos utilizados.
// Cada grupo empieza con una fila de título (con botón para plegarlo) que ocupa todo el ancho.
// La celda de ocupación se colorea con un tono burdeo más intenso cuanto mayor es el valor
// (escala de un solo color, de claro a oscuro). El número siempre va escrito.
function TablaEspacios({ grupos, maximoOcupacion }) {
  const [plegados, setPlegados] = useState({})

  function tono(ocupacion) {
    const intensidad = maximoOcupacion > 0 ? ocupacion / maximoOcupacion : 0
    return {
      background: `rgba(122, 17, 40, ${(0.06 + intensidad * 0.74).toFixed(3)})`,
      color: intensidad > 0.55 ? '#fff' : 'var(--ind-tinta)',
    }
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm ind-tabla ind-tabla-espacios mb-0">
        <caption className="visually-hidden">Ranking de espacios por reservas aprobadas</caption>
        <thead>
          <tr>
            <th scope="col" className="text-end">
              N.º
            </th>
            <th scope="col">Espacio</th>
            <th scope="col" className="ind-col-tipo">
              Tipo
            </th>
            <th scope="col" className="text-center ind-col-edif">
              Edif.
            </th>
            <th scope="col" className="text-end">
              Reservas
            </th>
            <th scope="col" className="text-end">
              Ocupación
            </th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => {
            const plegado = plegados[grupo.clave]
            return (
              <Fragment key={grupo.clave}>
                <tr className="ind-tabla-espacios__grupo">
                  <th scope="colgroup" colSpan={COLUMNAS}>
                    <button
                      type="button"
                      className="ind-plegar"
                      aria-expanded={!plegado}
                      aria-label={`${plegado ? 'Mostrar' : 'Ocultar'} ${grupo.titulo}`}
                      onClick={() => setPlegados((p) => ({ ...p, [grupo.clave]: !p[grupo.clave] }))}
                    >
                      {plegado ? '+' : '−'}
                    </button>
                    {grupo.titulo}
                    <span className="ind-tabla-espacios__cantidad">{grupo.filas.length} espacios</span>
                  </th>
                </tr>
                {!plegado &&
                  grupo.filas.map((fila) => (
                    <tr key={fila.id}>
                      <td className="text-end ind-tabla-espacios__posicion">{fila.posicion}</td>
                      <td className="ind-tabla-espacios__nombre">{fila.nombre}</td>
                      <td className="ind-col-tipo">{fila.tipo}</td>
                      <td className="text-center ind-col-edif">{fila.edificio}</td>
                      <td className="text-end">{formatearNumero(fila.reservas)}</td>
                      <td className="text-end ind-celda-tono" style={tono(fila.ocupacion)}>
                        {formatearPorcentaje(fila.ocupacion)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TablaEspacios
