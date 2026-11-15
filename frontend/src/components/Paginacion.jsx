// Botones de páginas (paginación de Bootstrap). Con muchas páginas muestra solo las cercanas a la actual
function Paginacion({ pagina, totalPaginas, onCambiar, etiqueta = 'Páginas del catálogo' }) {
  if (totalPaginas <= 1) return null
  // con muchas páginas (administración) mostramos la primera, la última y las 2 vecinas de la actual
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1).filter(
    (n) => totalPaginas <= 9 || n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2,
  )

  return (
    <nav aria-label={etiqueta} className="mt-4">
      <ul className="pagination justify-content-center flex-wrap">
        <li className={`page-item ${pagina === 1 ? 'disabled' : ''}`}>
          <button type="button" className="page-link" disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
            Anterior
          </button>
        </li>
        {numeros.map((numero) => (
          <li key={numero} className={`page-item ${numero === pagina ? 'active' : ''}`}>
            <button
              type="button"
              className="page-link"
              aria-current={numero === pagina ? 'page' : undefined}
              onClick={() => onCambiar(numero)}
            >
              {numero}
            </button>
          </li>
        ))}
        <li className={`page-item ${pagina === totalPaginas ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            disabled={pagina === totalPaginas}
            onClick={() => onCambiar(pagina + 1)}
          >
            Siguiente
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Paginacion
