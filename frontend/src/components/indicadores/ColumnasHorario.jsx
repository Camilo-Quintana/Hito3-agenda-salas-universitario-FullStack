import { useState } from 'react'
import { useAnchoContenedor } from '../../hooks/useAnchoContenedor.js'
import { escalaAgradable, formatearNumero, formatearPorcentaje } from './escalas.js'

const MARGEN = { arriba: 22, derecha: 8, abajo: 30, izquierda: 40 }

// Columnas: reservas aprobadas por bloque horario. Eje Y con escala redonda, eje X con la hora de inicio.
// Cada columna lleva su valor encima (son 13 y caben); el más alto va destacado.
function ColumnasHorario({ datos, alto = 240 }) {
  const ALTO_GRAFICO = alto
  const [ref, ancho] = useAnchoContenedor()
  const [activo, setActivo] = useState(null)

  const total = datos.reduce((suma, d) => suma + d.reservas, 0)
  const { maximo, marcas } = escalaAgradable(Math.max(0, ...datos.map((d) => d.reservas)))
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoPlot = ALTO_GRAFICO - MARGEN.arriba - MARGEN.abajo
  const banda = anchoPlot / datos.length
  const anchoColumna = Math.min(24, banda * 0.62)
  const y = (valor) => MARGEN.arriba + altoPlot - (valor / maximo) * altoPlot
  const indiceMaximo = datos.reduce((mejor, d, i) => (d.reservas > datos[mejor].reservas ? i : mejor), 0)

  // columna con el extremo superior redondeado (4px) y base recta
  function trazoColumna(x, valor) {
    const alto = (valor / maximo) * altoPlot
    if (alto <= 0) return ''
    const r = Math.min(4, alto, anchoColumna / 2)
    const base = MARGEN.arriba + altoPlot
    const tope = base - alto
    return `M${x},${base} V${tope + r} Q${x},${tope} ${x + r},${tope} H${x + anchoColumna - r} Q${x + anchoColumna},${tope} ${x + anchoColumna},${tope + r} V${base} Z`
  }

  const dato = activo !== null ? datos[activo] : null

  return (
    <div ref={ref} className="ind-grafico">
      <svg width={ancho} height={ALTO_GRAFICO} role="img" aria-label="Reservas aprobadas por bloque horario" onMouseLeave={() => setActivo(null)}>
        {marcas.map((marca) => (
          <g key={marca}>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(marca)} y2={y(marca)} className={marca === 0 ? 'ind-eje' : 'ind-guia'} />
            <text x={MARGEN.izquierda - 8} y={y(marca)} dy="0.32em" textAnchor="end" className="ind-texto-eje">
              {formatearNumero(marca)}
            </text>
          </g>
        ))}

        {datos.map((d, i) => {
          const x = MARGEN.izquierda + i * banda + (banda - anchoColumna) / 2
          return (
            <g key={d.bloque}>
              {/* zona activa: toda la banda, más grande que la columna */}
              <rect
                x={MARGEN.izquierda + i * banda}
                y={MARGEN.arriba}
                width={banda}
                height={altoPlot}
                className={`ind-zona ${activo === i ? 'activa' : ''}`}
                onMouseEnter={() => setActivo(i)}
              />
              <path d={trazoColumna(x, d.reservas)} className={`ind-columna ${activo !== null && activo !== i ? 'atenuada' : ''}`} pointerEvents="none" />
              {d.reservas > 0 && (
                <text
                  x={x + anchoColumna / 2}
                  y={y(d.reservas) - 6}
                  textAnchor="middle"
                  className={i === indiceMaximo ? 'ind-texto-valor' : 'ind-texto-valor ind-texto-valor--suave'}
                >
                  {formatearNumero(d.reservas)}
                </text>
              )}
              <text x={x + anchoColumna / 2} y={ALTO_GRAFICO - MARGEN.abajo + 16} textAnchor="middle" className="ind-texto-eje">
                {d.bloque.slice(0, 2)}
              </text>
            </g>
          )
        })}
        <text x={ancho - MARGEN.derecha} y={ALTO_GRAFICO - 2} textAnchor="end" className="ind-texto-eje ind-texto-eje--titulo">
          Hora de inicio
        </text>
      </svg>

      {dato && (
        <div
          className="ind-tooltip"
          style={{ left: Math.min(ancho - 170, Math.max(0, MARGEN.izquierda + activo * banda + banda / 2 - 85)), top: Math.max(0, y(dato.reservas) - 64) }}
          role="status"
        >
          <strong>{dato.bloque.replace('-', ' – ')}</strong>
          <span>
            {formatearNumero(dato.reservas)} reservas · {formatearPorcentaje(total ? (dato.reservas / total) * 100 : 0)} del total
          </span>
        </div>
      )}

      <table className="visually-hidden">
        <caption>Reservas aprobadas por bloque horario</caption>
        <thead>
          <tr>
            <th scope="col">Bloque</th>
            <th scope="col">Reservas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.bloque}>
              <th scope="row">{d.bloque}</th>
              <td>{d.reservas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ColumnasHorario
