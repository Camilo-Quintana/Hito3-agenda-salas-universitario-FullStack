import { BANDAS } from './bandas.js'

// Leyenda de las bandas de ocupación: muestra de color + nombre + rango, en el mismo orden de la escala.
function LeyendaBandas({ texto }) {
  return (
    <div className="ind-leyenda-bandas">
      {texto && <span>{texto}</span>}
      <ul aria-label="Bandas de ocupación">
        {BANDAS.map((banda) => (
          <li key={banda.clave}>
            <span className={`ind-leyenda-bandas__muestra ind-banda--${banda.clave}`} aria-hidden="true"></span>
            <strong>{banda.nombre}</strong> {banda.rango}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LeyendaBandas
