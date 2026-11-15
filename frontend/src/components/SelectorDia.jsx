import { fechasReservables, formatearFechaCorta } from '../utils/fechas.js'

// Botones con los días en que se puede reservar: hoy y los 7 siguientes (regla de la API)
function SelectorDia({ fecha, onCambiar, ahora, etiqueta = 'Día' }) {
  const fechas = fechasReservables(ahora)

  return (
    <div className="selector-dia" role="group" aria-label={etiqueta}>
      {fechas.map((opcion, indice) => {
        const elegida = opcion === fecha
        let texto = formatearFechaCorta(opcion)
        if (indice === 0) texto = `Hoy (${texto})`
        if (indice === 1) texto = `Mañana (${texto})`
        return (
          <button
            key={opcion}
            type="button"
            className={`btn btn-sm ${elegida ? 'btn-primary' : 'btn-outline-primary'}`}
            aria-pressed={elegida}
            onClick={() => onCambiar(opcion)}
          >
            {texto}
          </button>
        )
      })}
    </div>
  )
}

export default SelectorDia
