// Marco común de cada gráfico: título y subtítulo.
// nivel: 4 dentro de un área (que ya tiene su h3); 3 para las filas a todo el ancho, que no están dentro de un área.
// (La fuente de los datos, PostgreSQL o MongoDB, se explica en el README y en docs/diseno.md, no en pantalla.)
function PanelGrafico({ id, titulo, subtitulo, accion, children, className = '', nivel = 4 }) {
  const Titulo = `h${nivel}`
  return (
    <section className={`ind-panel ${className}`} aria-labelledby={id}>
      <header className="ind-panel__cabecera">
        <div>
          <Titulo id={id} className="ind-panel__titulo">
            {titulo}
          </Titulo>
          {subtitulo && <p className="ind-panel__subtitulo">{subtitulo}</p>}
        </div>
        {accion}
      </header>
      <div className="ind-panel__cuerpo">{children}</div>
    </section>
  )
}

export default PanelGrafico
