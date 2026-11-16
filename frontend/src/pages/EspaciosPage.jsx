import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Filtros from '../components/Filtros.jsx'
import SelectorDia from '../components/SelectorDia.jsx'
import EspacioCard from '../components/EspacioCard.jsx'
import Paginacion from '../components/Paginacion.jsx'
import MensajeVacio from '../components/MensajeVacio.jsx'
import EstadoCarga from '../components/EstadoCarga.jsx'
import { useAhora } from '../hooks/useAhora.js'
import { useApi } from '../hooks/useApi.js'
import { fechaHoy, fechasReservables } from '../utils/fechas.js'
import { TIPOS_ESPACIO } from '../utils/reglasReserva.js'

const POR_PAGINA = 6

// Nombre de cada filtro en la URL (?q=...&tipo=...)
const PARAMETRO = { busqueda: 'q', tipo: 'tipo', edificioId: 'edificio', capacidadMin: 'capacidad', fecha: 'fecha' }

function leerFiltrosDeUrl(params, ahora) {
  const fecha = params.get('fecha')
  return {
    tipo: params.get('tipo') ?? '',
    edificioId: params.get('edificio') ?? '',
    capacidadMin: Number(params.get('capacidad')) || 0,
    // si la fecha de la URL ya no se puede reservar (por ejemplo, un enlace antiguo), se usa hoy
    fecha: fechasReservables(ahora).includes(fecha) ? fecha : fechaHoy(ahora),
  }
}

function EspaciosPage() {
  // Los filtros, la fecha y la página van en la URL para no perderlos al volver del detalle
  const [params, setParams] = useSearchParams()
  // La búsqueda tiene su propio estado para que el campo responda al instante;
  // a la URL (y a la API) llega 300 ms después de dejar de escribir
  const [busqueda, setBusqueda] = useState(() => params.get('q') ?? '')
  const ahora = useAhora()

  const filtros = { ...leerFiltrosDeUrl(params, ahora), busqueda }
  const espacios = useApi('/espacios', {
    fecha: filtros.fecha,
    tipo: filtros.tipo,
    edificioId: filtros.edificioId,
    capacidadMin: filtros.capacidadMin || undefined,
    q: params.get('q') ?? undefined,
  })
  const edificios = useApi('/edificios')

  useEffect(() => {
    const espera = setTimeout(() => {
      setParams(
        (anteriores) => {
          const actual = anteriores.get('q') ?? ''
          if (actual === busqueda.trim()) return anteriores
          const nuevos = new URLSearchParams(anteriores)
          if (busqueda.trim()) nuevos.set('q', busqueda.trim())
          else nuevos.delete('q')
          nuevos.delete('pagina')
          return nuevos
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(espera)
  }, [busqueda, setParams])

  const resultados = espacios.datos ?? []
  const totalPaginas = Math.max(1, Math.ceil(resultados.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(params.get('pagina')) || 1), totalPaginas)
  const espaciosDePagina = resultados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const opciones = { tipos: TIPOS_ESPACIO, edificios: edificios.datos ?? [] }

  function cambiarFiltro(campo, valor) {
    if (campo === 'busqueda') {
      setBusqueda(valor)
      return
    }
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores)
        const sinValor = valor === '' || valor === 0 || (campo === 'fecha' && valor === fechaHoy(ahora))
        if (sinValor) nuevos.delete(PARAMETRO[campo])
        else nuevos.set(PARAMETRO[campo], String(valor))
        if (campo !== 'fecha') nuevos.delete('pagina') // al filtrar volvemos a la página 1
        return nuevos
      },
      { replace: true },
    )
  }

  function limpiarFiltros() {
    setBusqueda('')
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams()
        if (anteriores.get('fecha')) nuevos.set('fecha', anteriores.get('fecha')) // la fecha elegida se mantiene
        return nuevos
      },
      { replace: true },
    )
  }

  function cambiarPagina(numero) {
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (numero === 1) nuevos.delete('pagina')
      else nuevos.set('pagina', String(numero))
      return nuevos
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="titulo-espacios">
      <h1 id="titulo-espacios" className="titulo-pagina">
        Espacios disponibles
      </h1>
      <p className="text-muted">
        Salas de clases, laboratorios, salas de estudio, salas de reunión y espacios exteriores de la Sede Viña del
        Mar.
      </p>

      <Filtros filtros={filtros} opciones={opciones} onCambiar={cambiarFiltro} onLimpiar={limpiarFiltros} />

      <div className="my-3">
        <span className="fw-semibold d-block mb-2">Disponibilidad para:</span>
        <SelectorDia
          fecha={filtros.fecha}
          onCambiar={(fecha) => cambiarFiltro('fecha', fecha)}
          ahora={ahora}
          etiqueta="Día para ver la disponibilidad"
        />
      </div>

      <EstadoCarga consulta={espacios} texto="Cargando espacios..." />

      {espacios.datos && (
        <>
          <p className="text-muted mb-3" aria-live="polite">
            {resultados.length} {resultados.length === 1 ? 'espacio' : 'espacios'}
            {espacios.estado === 'cargando' && (
              <span className="spinner-border spinner-border-sm ms-2" role="status" aria-label="Actualizando"></span>
            )}
          </p>
          {resultados.length === 0 ? (
            <MensajeVacio
              icono="bi-search"
              titulo="No hay espacios con esos filtros"
              mensaje="Prueba con otra búsqueda o quita algunos filtros."
              accion={{ texto: 'Limpiar filtros', onClick: limpiarFiltros }}
            />
          ) : (
            <>
              <div className="row g-4">
                {espaciosDePagina.map((espacio) => (
                  <div key={espacio.id} className="col-12 col-sm-6 col-lg-4">
                    <EspacioCard espacio={espacio} fecha={filtros.fecha} />
                  </div>
                ))}
              </div>
              <Paginacion pagina={pagina} totalPaginas={totalPaginas} onCambiar={cambiarPagina} />
            </>
          )}
        </>
      )}
    </section>
  )
}

export default EspaciosPage
