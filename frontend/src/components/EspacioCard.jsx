import { Link } from 'react-router-dom'
import { imagenDeEspacio } from '../utils/imagenes.js'
import { describirUbicacion, textoCapacidad, textoEquipo } from '../utils/textos.js'
import './EspacioCard.css'

// Tarjeta de un espacio. "bloquesLibres" viene calculado por la API para la fecha elegida
function EspacioCard({ espacio, fecha }) {
  const libres = espacio.bloquesLibres ?? 0
  const hayLibres = libres > 0
  const textoLibres = libres === 1 ? '1 horario libre' : `${libres} horarios libres`

  return (
    <article className="card espacio-card h-100">
      <img src={imagenDeEspacio(espacio)} className="card-img-top espacio-card__imagen" alt={espacio.nombre} loading="lazy" />
      <div className="card-body d-flex flex-column">
        <h2 className="h5 espacio-card__titulo">{espacio.nombre}</h2>
        <p className="espacio-card__ubicacion mb-1">{describirUbicacion(espacio)}</p>
        <p className="espacio-card__capacidad mb-2">
          <i className="bi bi-people me-1" aria-hidden="true"></i>
          Capacidad: {textoCapacidad(espacio.capacidad)}
        </p>
        <ul className="lista-etiquetas" aria-label="Equipamiento">
          {espacio.equipamiento.map((equipo) => (
            <li key={equipo.id}>{textoEquipo(equipo)}</li>
          ))}
        </ul>
        <div className="mt-auto">
          <div className="d-flex flex-wrap gap-1">
            <span className={`badge espacio-card__disponibilidad ${hayLibres ? 'libre' : 'sin-libres'}`}>
              {hayLibres ? textoLibres : 'Sin horarios libres'}
            </span>
            {espacio.requiereAprobacion && (
              <span className="badge espacio-card__aprobacion" title="Las reservas quedan pendientes hasta que la sede las apruebe">
                <i className="bi bi-shield-check me-1" aria-hidden="true"></i>
                Requiere aprobación
              </span>
            )}
          </div>
          <Link to={`/espacios/${espacio.id}?fecha=${fecha}`} className="btn btn-primary w-100 mt-2">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}

export default EspacioCard
