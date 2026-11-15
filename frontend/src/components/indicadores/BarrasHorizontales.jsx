import { escalaAgradable } from './escalas.js'

// Barras horizontales con eje graduado. Cada barra lleva su valor en la punta,
// y un texto opcional bajo el nombre ("complemento") muestra datos de contexto.
// filas: [{ clave, nombre, valor, etiqueta, complemento? }]
// marcasEje: cuántos tramos tiene el eje (menos tramos = etiquetas más separadas en mosaicos angostos)
// referencia: { valor, etiqueta } dibuja una línea vertical (por ejemplo, el límite de ocupación baja) y
// asegura que la escala pase un poco más allá de ella (para que no quede pegada al borde); así dos gráficos con la misma referencia comparten escala.
function BarrasHorizontales({ filas, formatoEje, encabezados, descripcion, marcasEje = 4, referencia }) {
  const { maximo, marcas } = escalaAgradable(Math.max(0, (referencia?.valor ?? 0) * 1.2, ...filas.map((f) => f.valor)), marcasEje)
  const posicionReferencia = referencia ? (referencia.valor / maximo) * 100 : null
  return (
    <>
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
              {referencia && (
                <span className="ind-barras__referencia" style={{ left: `${posicionReferencia}%` }} aria-hidden="true"></span>
              )}
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

      {referencia && (
        <p className="ind-barras__nota-referencia">
          <span className="ind-barras__muestra-referencia" aria-hidden="true"></span>
          {referencia.etiqueta}
        </p>
      )}
    </>
  )
}

export default BarrasHorizontales
