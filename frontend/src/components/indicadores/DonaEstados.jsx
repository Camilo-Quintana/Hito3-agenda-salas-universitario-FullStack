import { useState } from 'react'
import { COLOR_ESTADO, NOMBRE_ESTADO, formatearNumero, formatearPorcentaje } from './escalas.js'

const ORDEN = ['aprobada', 'pendiente', 'rechazada', 'cancelada']
const TAMANO = 210
const RADIO = 90
const GROSOR = 30
const SEPARACION = 0.012 // separación entre partes (en fracción de vuelta)

// Punto de la circunferencia para una fracción de vuelta (0 = arriba, sentido horario)
function punto(fraccion, radio) {
  const angulo = fraccion * 2 * Math.PI - Math.PI / 2
  return [TAMANO / 2 + radio * Math.cos(angulo), TAMANO / 2 + radio * Math.sin(angulo)]
}

// Sector de la dona entre dos fracciones de vuelta
function trazoSector(inicio, fin) {
  const exterior = RADIO
  const interior = RADIO - GROSOR
  const grande = fin - inicio > 0.5 ? 1 : 0
  const [x1, y1] = punto(inicio, exterior)
  const [x2, y2] = punto(fin, exterior)
  const [x3, y3] = punto(fin, interior)
  const [x4, y4] = punto(inicio, interior)
  return `M${x1},${y1} A${exterior},${exterior} 0 ${grande} 1 ${x2},${y2} L${x3},${y3} A${interior},${interior} 0 ${grande} 0 ${x4},${y4} Z`
}

// Reservas por estado: dona con el total al centro y leyenda con cantidad y proporción
function DonaEstados({ porEstado, total }) {
  const [activo, setActivo] = useState(null)
  const partes = ORDEN.map((estado) => ({
    estado,
    cantidad: porEstado[estado] ?? 0,
    fraccion: total ? (porEstado[estado] ?? 0) / total : 0,
  }))
  const conValor = partes.filter((p) => p.cantidad > 0)
  const separacion = conValor.length > 1 ? SEPARACION : 0

  let acumulado = 0
  const sectores = conValor.map((p) => {
    const inicio = acumulado
    acumulado += p.fraccion
    // las partes muy chicas igual se ven (mínimo una pequeña rebanada)
    const fin = Math.max(inicio + 0.004, acumulado - separacion)
    return { ...p, trazo: trazoSector(inicio, Math.min(fin, inicio + 0.9999)) }
  })

  const centro = activo ? partes.find((p) => p.estado === activo) : null

  return (
    <div className="ind-dona">
      <ul className="ind-dona__leyenda">
        {partes.map((p) => (
          <li
            key={p.estado}
            className={activo && activo !== p.estado ? 'atenuada' : ''}
            onMouseEnter={() => setActivo(p.estado)}
            onMouseLeave={() => setActivo(null)}
          >
            <span className="ind-muestra" style={{ background: COLOR_ESTADO[p.estado] }} aria-hidden="true"></span>
            <span className="ind-dona__nombre">{NOMBRE_ESTADO[p.estado]}</span>
            <span className="ind-dona__cantidad">{formatearNumero(p.cantidad)}</span>
            <span className="ind-dona__porcentaje">{formatearPorcentaje(p.fraccion * 100)}</span>
          </li>
        ))}
      </ul>

      <svg
        width={TAMANO}
        height={TAMANO}
        viewBox={`0 0 ${TAMANO} ${TAMANO}`}
        role="img"
        aria-label={partes.map((p) => `${NOMBRE_ESTADO[p.estado]}: ${p.cantidad}`).join(', ')}
        className="ind-dona__grafico"
      >
        {total === 0 ? (
          <circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO - GROSOR / 2} fill="none" stroke="#eceef1" strokeWidth={GROSOR} />
        ) : (
          sectores.map((s) => (
            <path
              key={s.estado}
              d={s.trazo}
              fill={COLOR_ESTADO[s.estado]}
              opacity={activo && activo !== s.estado ? 0.3 : 1}
              onMouseEnter={() => setActivo(s.estado)}
              onMouseLeave={() => setActivo(null)}
            >
              <title>{`${NOMBRE_ESTADO[s.estado]}: ${formatearNumero(s.cantidad)} (${formatearPorcentaje(s.fraccion * 100)})`}</title>
            </path>
          ))
        )}
        <text x={TAMANO / 2} y={TAMANO / 2 - 2} textAnchor="middle" className="ind-dona__total">
          {formatearNumero(centro ? centro.cantidad : total)}
        </text>
        <text x={TAMANO / 2} y={TAMANO / 2 + 20} textAnchor="middle" className="ind-dona__rotulo">
          {centro ? NOMBRE_ESTADO[centro.estado].toUpperCase() : 'TOTAL'}
        </text>
      </svg>
    </div>
  )
}

export default DonaEstados
