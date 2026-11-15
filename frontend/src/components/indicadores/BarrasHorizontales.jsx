import { escalaAgradable } from './escalas.js'

// Barras horizontales con eje graduado. Cada barra lleva su valor en la punta,
// y un texto opcional bajo el nombre ("complemento") muestra datos de contexto.
// filas: [{ clave, nombre, valor, etiqueta, complemento? }]
// marcasEje: cuántos tramos tiene el eje (menos tramos = etiquetas más separadas en mosaicos angostos)
function BarrasHorizontales({ filas, formatoEje, encabezados, descripcion, marcasEje = 4 }) {
  const { maximo, marcas } = escalaAgradable(Math.max(0, ...filas.map((f) => f.valor)), marcasEje)
  return (
    <div className="ind-barras" role="table" aria-label={descripcion}>
      {encabezados && (
        <div className="ind-barras__fila ind-barras__fila--encabezado" role="row">
          <span role="columnheader">{encabezados.nombre}</span>
          <span role="columnheader">{encabezados.valor}</span>
        </div>
      )}

      {filas.map((fila) => (
        <div key={fila.clave} className="ind-barras__fila" role="row">
          <span className="ind-barras__nombre" role="rowheader" title={fila.nombre}>
            {fila.nombre}
            {fila.complemento && <span className="ind-barras__complemento">{fila.complemento}</span>}
          </span>
          <span className="ind-barras__pista" role="cell">
            {marcas.map((marca) => (
              <span key={marca} className="ind-barras__guia" style={{ left: `${(marca / maximo) * 100}%` }} aria-hidden="true"></span>
            ))}
            <span className="ind-barras__barra" style={{ width: `${(fila.valor / maximo) * 100}%` }}></span>
            <span className="ind-barras__valor" style={{ left: `${(fila.valor / maximo) * 100}%` }}>
              {fila.etiqueta}
            </span>
          </span>
        </div>
      ))}

      {/* eje inferior con las marcas de la escala */}
      <div className="ind-barras__fila ind-barras__fila--eje" aria-hidden="true">
        <span></span>
        <span className="ind-barras__eje">
          {marcas.map((marca) => (
            <span key={marca} style={{ left: `${(marca / maximo) * 100}%` }}>
              {formatoEje(marca)}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

export default BarrasHorizontales
