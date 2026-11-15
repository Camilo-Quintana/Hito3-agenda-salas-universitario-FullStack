import { formatearPorcentaje } from './escalas.js'

// Medidor de una tasa sobre una escala fija de 0 a 100% (como el "gauge" de un tablero institucional).
// La pista es un tono claro del mismo color; el valor va escrito sobre el extremo de la barra.
function MedidorTasa({ etiqueta, valor, descripcion, variacion }) {
  const ancho = Math.min(100, Math.max(0, valor))
  return (
    <div className="ind-medidor">
      <div className="ind-medidor__cabecera">
        <span className="ind-medidor__etiqueta">{etiqueta}</span>
        <span className="ind-medidor__valor">{formatearPorcentaje(valor)}</span>
      </div>
      <div
        className="ind-medidor__pista"
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(valor.toFixed(1))}
      >
        <span className="ind-medidor__relleno" style={{ width: `${ancho}%` }}></span>
      </div>
      <div className="ind-medidor__escala" aria-hidden="true">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <p className="ind-medidor__descripcion">
        {variacion && (
          <span className={`ind-variacion ${variacion.tono}`}>
            <span aria-hidden="true">{variacion.simbolo}</span> {variacion.texto}
          </span>
        )}
        {variacion && ' · '}
        {descripcion}
      </p>
    </div>
  )
}

export default MedidorTasa
