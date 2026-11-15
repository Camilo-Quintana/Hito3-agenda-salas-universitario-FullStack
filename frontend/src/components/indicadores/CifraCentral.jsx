// Mosaico con una sola cifra grande y centrada (cuando el dato es un número, el número es el gráfico).
// "variacion" = { texto, tono: 'positivo' | 'negativo' | 'neutro', simbolo }
function CifraCentral({ valor, etiqueta, variacion, detalle }) {
  return (
    <div className="ind-cifra">
      <p className="ind-cifra__valor">{valor}</p>
      <p className="ind-cifra__etiqueta">{etiqueta}</p>
      {(variacion || detalle) && (
        <p className="ind-cifra__detalle">
          {variacion && (
            <span className={`ind-variacion ${variacion.tono}`}>
              <span aria-hidden="true">{variacion.simbolo}</span> {variacion.texto}
            </span>
          )}
          {variacion && detalle && ' '}
          {detalle}
        </p>
      )}
    </div>
  )
}

export default CifraCentral
