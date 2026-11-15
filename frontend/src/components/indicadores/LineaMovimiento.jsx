import { useState } from 'react'
import { useAnchoContenedor } from '../../hooks/useAnchoContenedor.js'
import { formatearFechaCorta } from '../../utils/fechas.js'
import { COLOR_ESTADO, NOMBRE_ESTADO, escalaAgradable, formatearNumero } from './escalas.js'

const MARGEN = { arriba: 26, derecha: 18, abajo: 28, izquierda: 40 }

// Línea: solicitudes creadas por día (eventos "reserva.creada" de MongoDB).
// Una sola serie, así que no lleva leyenda: el título dice qué se grafica.
// Al pasar el mouse, una guía vertical muestra el detalle completo de ese día.
// Los puntos rotulados: todos si son pocos días; si no, solo el máximo, el mínimo y el último.
// dias: [{ dia, creadas, aprobadas, rechazadas, canceladas }] con todos los días del período
// diaEnCurso: "AAAA-MM-DD" de hoy. Si es el último día, su tramo va punteado y se rotula "hoy":
// el día todavía no termina, así que su cifra no es comparable con la de los días completos.
function LineaMovimiento({ dias, alto = 210, diaEnCurso }) {
  const ALTO_GRAFICO = alto
  const [ref, ancho] = useAnchoContenedor()
  const [activo, setActivo] = useState(null)

  const { maximo, marcas } = escalaAgradable(Math.max(1, ...dias.map((d) => d.creadas)))
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoPlot = ALTO_GRAFICO - MARGEN.arriba - MARGEN.abajo
  const x = (i) => MARGEN.izquierda + (dias.length === 1 ? anchoPlot / 2 : (i / (dias.length - 1)) * anchoPlot)
  const y = (valor) => MARGEN.arriba + altoPlot - (valor / maximo) * altoPlot
  const puntos = dias.map((d, i) => `${x(i).toFixed(1)},${y(d.creadas).toFixed(1)}`)
  const hoyIncompleto = dias.length > 1 && dias[dias.length - 1].dia === diaEnCurso
  const linea = `M${(hoyIncompleto ? puntos.slice(0, -1) : puntos).join(' L')}`
  const tramoHoy = hoyIncompleto ? `M${puntos.at(-2)} L${puntos.at(-1)}` : null
  const area = `M${puntos.join(' L')} L${x(dias.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const etiquetaDia = (i) => (hoyIncompleto && i === dias.length - 1 ? 'hoy' : formatearFechaCorta(dias[i].dia).replace(/^\S+\s/, ''))

  // etiquetas del eje X: una cada ~80px como mínimo, para que no se monten en pantallas chicas
  const etiquetasQueCaben = Math.max(2, Math.floor(anchoPlot / 80))
  const salto = Math.max(1, Math.ceil(dias.length / etiquetasQueCaben))
  const ultimo = dias.length - 1

  function moverPuntero(evento) {
    const caja = evento.currentTarget.getBoundingClientRect()
    const posicion = evento.clientX - caja.left - MARGEN.izquierda
    const indice = Math.round((posicion / anchoPlot) * (dias.length - 1))
    setActivo(Math.min(ultimo, Math.max(0, indice)))
  }

  const dato = activo !== null ? dias[activo] : null

  const valores = dias.map((d) => d.creadas)
  const indiceMax = valores.indexOf(Math.max(...valores))
  const indiceMin = valores.lastIndexOf(Math.min(...valores))
  // el mínimo se rotula debajo del punto (si cabe sobre el eje), el resto encima
  const yRotulo = (i) => {
    const yPunto = y(dias[i].creadas)
    const abajo = i === indiceMin && dias.length > 14 && yPunto + 18 < y(0) - 4
    return abajo ? yPunto + 18 : yPunto - 10
  }
  const rotulados = new Set(dias.length <= 14 ? dias.map((_, i) => i) : [indiceMax, indiceMin, ultimo])

  return (
    <div ref={ref} className="ind-grafico">
      <svg
        width={ancho}
        height={ALTO_GRAFICO}
        role="img"
        aria-label={hoyIncompleto ? 'Solicitudes creadas por día; el último día es hoy y todavía no termina' : 'Solicitudes creadas por día'}
        onMouseMove={moverPuntero}
        onMouseLeave={() => setActivo(null)}
      >
        {marcas.map((marca) => (
          <g key={marca}>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(marca)} y2={y(marca)} className={marca === 0 ? 'ind-eje' : 'ind-guia'} />
            <text x={MARGEN.izquierda - 8} y={y(marca)} dy="0.32em" textAnchor="end" className="ind-texto-eje">
              {formatearNumero(marca)}
            </text>
          </g>
        ))}

        {dias.map((d, i) =>
          // la última fecha siempre va; una intermedia solo si queda lejos de ella (la última se alinea a la derecha)
          (i % salto === 0 && x(ultimo) - x(i) >= 72) || i === ultimo ? (
            <text key={d.dia} x={x(i)} y={ALTO_GRAFICO - 8} textAnchor={i === 0 ? 'start' : i === ultimo ? 'end' : 'middle'} className="ind-texto-eje">
              {etiquetaDia(i)}
            </text>
          ) : null,
        )}

        <path d={area} className="ind-area-linea" />
        <path d={linea} className="ind-linea" />
        {tramoHoy && <path d={tramoHoy} className="ind-linea ind-linea--en-curso" />}

        {dato && (
          <>
            <line x1={x(activo)} x2={x(activo)} y1={MARGEN.arriba} y2={y(0)} className="ind-cruce" />
            <circle cx={x(activo)} cy={y(dato.creadas)} r="5" className="ind-punto" />
          </>
        )}
        {[...rotulados].map((i) => (
          <g key={dias[i].dia} opacity={dato ? 0.35 : 1}>
            <circle cx={x(i)} cy={y(dias[i].creadas)} r="4" className="ind-punto" />
            <text
              x={x(i)}
              y={yRotulo(i)}
              textAnchor={i === 0 ? 'start' : i === ultimo ? 'end' : 'middle'}
              className="ind-texto-valor"
            >
              {formatearNumero(dias[i].creadas)}
            </text>
          </g>
        ))}
      </svg>

      {dato && (
        <div
          className="ind-tooltip"
          style={{ left: Math.min(ancho - 190, Math.max(0, x(activo) + (x(activo) > ancho / 2 ? -200 : 12))), top: 4 }}
          role="status"
        >
          <strong>
            {formatearFechaCorta(dato.dia)}
            {hoyIncompleto && activo === ultimo && ' · hoy, en curso'}
          </strong>
          <span>{formatearNumero(dato.creadas)} solicitudes creadas</span>
          {['aprobada', 'rechazada', 'cancelada'].map((estado) => (
            <span key={estado} className="ind-tooltip__fila">
              <span className="ind-muestra" style={{ background: COLOR_ESTADO[estado] }} aria-hidden="true"></span>
              {NOMBRE_ESTADO[estado]}: {formatearNumero(dato[`${estado}s`])}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default LineaMovimiento
