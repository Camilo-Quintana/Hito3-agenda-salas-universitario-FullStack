import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import LeyendaBandas from './LeyendaBandas.jsx'
import { bandaDe } from './bandas.js'
import { formatearNumero, formatearPorcentaje } from './escalas.js'

const COLUMNAS = 6

// Ranking de espacios en una sola tabla con dos grupos plegables: más utilizados y menos utilizados.
// Cada grupo empieza con una fila de título (con botón para plegarlo) que ocupa todo el ancho.
// La celda de ocupación se colorea según su banda (baja, media o alta, ver bandas.js) y
// siempre lleva escrito el valor y el nombre de la banda: el color nunca es la única señal.
function TablaEspacios({ grupos }) {
  const [plegados, setPlegados] = useState({})

  return (
    <div className="table-responsive">
      {/* la leyenda va antes de la tabla: explica las filas, no las resume */}
      <LeyendaBandas texto="Reservas y ocupación de lunes a viernes." />
      <table className="table table-sm ind-tabla ind-tabla-espacios mb-0">
        <caption className="visually-hidden">Ranking de espacios por ocupación de lunes a viernes</caption>
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
            <th scope="col" className="text-end ind-col-reservas">
              <span className="ind-solo-amplio">Reservas</span>
              <abbr className="ind-solo-movil ind-abreviatura" title="Reservas">
                Res.
              </abbr>
            </th>
            <th scope="col" className="text-end">
              <span className="ind-solo-amplio">Ocupación</span>
              <abbr className="ind-solo-movil ind-abreviatura" title="Ocupación">
                Ocup.
              </abbr>
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
                      <i className={`bi ${plegado ? 'bi-plus' : 'bi-dash'}`} aria-hidden="true"></i>
                    </button>
                    {grupo.titulo}
                    <span className="ind-tabla-espacios__cantidad">{grupo.filas.length} espacios</span>
                  </th>
                </tr>
                {!plegado &&
                  grupo.filas.map((fila) => (
                    <tr key={fila.id}>
                      <td className="text-end ind-tabla-espacios__posicion">{fila.posicion}</td>
                      <td className="ind-tabla-espacios__nombre">
                        {/* lleva a la ficha del espacio (disponibilidad y datos), para actuar sobre lo que se ve */}
                        <Link to={`/espacios/${fila.id}`} className="ind-enlace-espacio">
                          {fila.nombre}
                        </Link>
                        {/* en celular las columnas Tipo y Edif. no caben: van bajo el nombre */}
                        <span className="ind-solo-movil ind-tabla-espacios__datos">
                          {fila.tipo} · Edificio {fila.edificio}
                        </span>
                      </td>
                      <td className="ind-col-tipo">{fila.tipo}</td>
                      <td className="text-center ind-col-edif">{fila.edificio}</td>
                      <td className="text-end ind-col-reservas">{formatearNumero(fila.reservasHabiles)}</td>
                      <td className={`text-end ind-celda-tono ind-banda--${bandaDe(fila.ocupacion).clave}`}>
                        {formatearPorcentaje(fila.ocupacion)}
                        <span className="ind-celda-tono__banda">{bandaDe(fila.ocupacion).nombre}</span>
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
