// Marco común de cada gráfico: título, subtítulo y, al pie, de dónde salen los datos.
function PanelGrafico({ id, titulo, subtitulo, fuente, accion, children, className = '' }) {
  return (
    <section className={`ind-panel ${className}`} aria-labelledby={id}>
      <header className="ind-panel__cabecera">
        <div>
          <h3 id={id} className="ind-panel__titulo">
            {titulo}
          </h3>
          {subtitulo && <p className="ind-panel__subtitulo">{subtitulo}</p>}
        </div>
        {accion}
      </header>
      <div className="ind-panel__cuerpo">{children}</div>
      {fuente && <p className="ind-panel__fuente">Fuente: {fuente}</p>}
    </section>
  )
}

export default PanelGrafico
