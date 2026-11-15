// Texto de la variación de un indicador frente al período anterior. La lógica está en variacion.js.
const ICONO = { sube: 'bi-arrow-up-short', baja: 'bi-arrow-down-short', igual: 'bi-dash' }
const LECTURA = { positivo: 'mejora', negativo: 'empeora', neutro: 'sin cambio relevante' }

// "▲ +12% vs. 130 en los 7 días anteriores". El color y la flecha se acompañan de texto para lectores de pantalla.
// sinComparacion: { texto, reintentar? } explica por qué no hay comparación (sin datos, cargando o error)
function Variacion({ cambio, dias, sinComparacion, className = '' }) {
  if (!cambio) {
    return (
      <span className={className}>
        {sinComparacion?.texto ?? 'Sin datos previos para comparar'}
        {sinComparacion?.reintentar && (
          <button type="button" className="ind-reintentar" onClick={sinComparacion.reintentar}>
            Reintentar
          </button>
        )}
      </span>
    )
  }
  return (
    <span className={className}>
      <span className={`ind-variacion ${cambio.tono}`}>
        <i className={`bi ${ICONO[cambio.direccion]}`} aria-hidden="true"></i>
        {cambio.texto}
        {cambio.direccion !== 'igual' && <span className="visually-hidden"> ({LECTURA[cambio.tono]})</span>}
      </span>{' '}
      vs. {cambio.anterior} en los {dias} días anteriores
    </span>
  )
}

export default Variacion
