import { useState } from 'react'
import { Link } from 'react-router-dom'
import '@fontsource-variable/inter'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import PanelGrafico from '../../components/indicadores/PanelGrafico.jsx'
import CifraCentral from '../../components/indicadores/CifraCentral.jsx'
import MedidorTasa from '../../components/indicadores/MedidorTasa.jsx'
import BarrasHorizontales from '../../components/indicadores/BarrasHorizontales.jsx'
import ColumnasHorario from '../../components/indicadores/ColumnasHorario.jsx'
import LineaMovimiento from '../../components/indicadores/LineaMovimiento.jsx'
import DonaEstados from '../../components/indicadores/DonaEstados.jsx'
import TablaEspacios from '../../components/indicadores/TablaEspacios.jsx'
import TablaMovimiento from '../../components/indicadores/TablaMovimiento.jsx'
import { formatearNumero, formatearPorcentaje } from '../../components/indicadores/escalas.js'
import { useApi } from '../../hooks/useApi.js'
import { useAhora } from '../../hooks/useAhora.js'
import { aFecha, fechaHoy, sumarDias } from '../../utils/fechas.js'
import './PanelPage.css'

const PERIODOS = [
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' },
  { dias: 90, texto: '90 días' },
]
const TOP = 10
const ULTIMOS = 5

// "2026-11-14" -> "14 nov 2026"
function fechaMedia(texto) {
  return aFecha(texto).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).replaceAll('.', '')
}

// Variación contra el período anterior de igual largo.
// enPuntos: la diferencia se expresa en puntos porcentuales (para indicadores que ya son %).
// subirEsBueno: define si un aumento se muestra como positivo o negativo.
function variacion(actual, anterior, { enPuntos = false, subirEsBueno = true } = {}) {
  if (anterior === undefined || anterior === null) return null
  let diferencia
  let texto
  if (enPuntos) {
    diferencia = Math.round((actual - anterior) * 10) / 10
    texto = `${diferencia > 0 ? '+' : ''}${formatearNumero(diferencia)} pp`
  } else {
    if (anterior === 0) return null // no hay base para un porcentaje
    diferencia = Math.round(((actual - anterior) / anterior) * 1000) / 10
    texto = `${diferencia > 0 ? '+' : ''}${formatearPorcentaje(diferencia)}`
  }
  if (diferencia === 0) return { texto: 'sin cambio', tono: 'neutro', simbolo: '=' }
  const bueno = diferencia > 0 === subirEsBueno
  return { texto, tono: bueno ? 'positivo' : 'negativo', simbolo: diferencia > 0 ? '▲' : '▼' }
}

// Completa el movimiento diario con los días sin eventos (valen 0), para que la línea tenga todo el período
function completarDias(periodo, movimiento) {
  const porDia = new Map(movimiento.map((fila) => [fila.dia, fila]))
  return Array.from({ length: periodo.dias }, (_, i) => {
    const dia = sumarDias(periodo.desde, i)
    return porDia.get(dia) ?? { dia, creadas: 0, aprobadas: 0, rechazadas: 0, canceladas: 0 }
  })
}

// Panel de indicadores de utilización (solo administración), organizado como un tablero institucional:
// dos grandes áreas lado a lado (utilización de espacios y gestión de reservas) con mosaicos de gráficos.
// Datos: GET /indicadores (consultas SQL agregadas; el movimiento diario viene de la bitácora de MongoDB).
// También se pide el período anterior de igual largo, solo para mostrar la variación de los indicadores clave.
function PanelPage() {
  const ahora = useAhora()
  const [dias, setDias] = useState(30)
  const hasta = fechaHoy(ahora)
  const desde = sumarDias(hasta, -(dias - 1))
  // Al cambiar de período se mantiene el panel anterior (atenuado) hasta que lleguen los datos nuevos
  const indicadores = useApi('/indicadores', { desde, hasta }, { mantenerAnteriores: true })
  const anterior = useApi('/indicadores', { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) })

  const datos = indicadores.datos
  const actualizando = indicadores.estado === 'cargando' && datos !== null
  // Solo se compara si el período anterior tuvo reservas: contra un período vacío, cualquier variación engaña
  const previo = anterior.datos?.periodo.dias === dias && anterior.datos.totales.reservas > 0 ? anterior.datos.totales : null

  if (!datos) return <EstadoCarga consulta={indicadores} texto="Calculando indicadores..." />

  const { totales, periodo } = datos
  const comparacion = previo ? `vs. ${dias} días anteriores` : null
  const ranking = datos.porEspacio.map((fila, i) => ({ ...fila, posicion: i + 1 }))
  const grupos = [
    { clave: 'mas', titulo: 'Más utilizados', filas: ranking.slice(0, TOP) },
    { clave: 'menos', titulo: 'Menos utilizados', filas: ranking.slice(Math.max(TOP, ranking.length - ULTIMOS)).reverse() },
  ].filter((grupo) => grupo.filas.length > 0)
  const maximoOcupacion = Math.max(0, ...ranking.map((f) => f.ocupacion))
  const movimiento = completarDias(periodo, datos.movimientoDiario)
  const reservasAprobadas = datos.porBloque.reduce((suma, b) => suma + b.reservas, 0)
  const ejePorcentaje = (v) => `${formatearNumero(v)}%`

  return (
    <div className={`indicadores ${actualizando ? 'actualizando' : ''}`} aria-busy={actualizando}>
      {/* Barra superior: título, período y el único filtro, que aplica a todo el tablero */}
      <div className="ind-barra">
        <div>
          <h2 className="ind-barra__titulo">Indicadores de utilización</h2>
          <p className="ind-barra__periodo">
            Sede Viña del Mar · {fechaMedia(periodo.desde)} al {fechaMedia(periodo.hasta)} · {totales.espaciosActivos} espacios activos
          </p>
        </div>
        <div className="ind-filtro">
          <span className="ind-filtro__etiqueta" id="etiqueta-periodo">
            Período
          </span>
          <div className="btn-group btn-group-sm" role="group" aria-labelledby="etiqueta-periodo">
            {PERIODOS.map((opcion) => (
              <button
                key={opcion.dias}
                type="button"
                className={`btn ${dias === opcion.dias ? 'btn-primary' : 'btn-outline-secondary'}`}
                aria-pressed={dias === opcion.dias}
                onClick={() => setDias(opcion.dias)}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
          {actualizando && <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-label="Actualizando"></span>}
        </div>
      </div>

      {indicadores.estado === 'error' && <EstadoCarga consulta={indicadores} />}

      <div className="ind-tablero">
        {/* ================= UTILIZACIÓN DE ESPACIOS ================= */}
        <div className="ind-area">
          <h3 className="ind-area__titulo">Utilización de espacios</h3>

          <div className="ind-mosaicos ind-mosaicos--horario">
            <PanelGrafico
              id="titulo-por-bloque"
              titulo="Demanda por horario"
              subtitulo={`Reservas aprobadas por hora de inicio · ${formatearNumero(reservasAprobadas)} en total`}
              fuente="PostgreSQL"
            >
              <ColumnasHorario datos={datos.porBloque} alto={250} />
            </PanelGrafico>
            <div className="ind-pila">
              <CifraCentral
                valor={formatearNumero(totales.reservas)}
                etiqueta="Reservas en el período"
                variacion={previo && variacion(totales.reservas, previo.reservas)}
                detalle={comparacion ?? 'en cualquier estado'}
              />
              <CifraCentral
                valor={formatearPorcentaje(totales.ocupacionGeneral)}
                etiqueta="Ocupación general"
                variacion={previo && variacion(totales.ocupacionGeneral, previo.ocupacionGeneral, { enPuntos: true })}
                detalle={comparacion ?? 'bloques aprobados / disponibles'}
              />
            </div>
          </div>

          <div className="ind-mosaicos ind-mosaicos--mitades">
            <PanelGrafico id="titulo-por-tipo" titulo="Ocupación por tipo de espacio" subtitulo="% de bloques con reserva aprobada" fuente="PostgreSQL">
              <BarrasHorizontales
                descripcion="Ocupación por tipo de espacio"
                formatoEje={ejePorcentaje}
                marcasEje={3}
                filas={datos.porTipo.map((f) => ({
                  clave: f.nombre,
                  nombre: f.nombre,
                  valor: f.ocupacion,
                  etiqueta: formatearPorcentaje(f.ocupacion),
                }))}
              />
            </PanelGrafico>
            <PanelGrafico id="titulo-por-edificio" titulo="Ocupación por edificio" subtitulo="% de bloques con reserva aprobada" fuente="PostgreSQL">
              <BarrasHorizontales
                descripcion="Ocupación por edificio"
                formatoEje={ejePorcentaje}
                marcasEje={3}
                filas={datos.porEdificio.map((f) => ({
                  clave: f.nombre,
                  nombre: `Edificio ${f.nombre}`,
                  valor: f.ocupacion,
                  etiqueta: formatearPorcentaje(f.ocupacion),
                  complemento: `${f.espacios} esp. · ${formatearNumero(f.reservas)} res.`,
                }))}
              />
            </PanelGrafico>
          </div>

          <PanelGrafico
            id="titulo-ranking"
            titulo="Ranking de espacios"
            subtitulo={`Los ${Math.min(TOP, ranking.length)} más utilizados y los ${grupos[1]?.filas.length ?? 0} menos utilizados de ${ranking.length} espacios activos · color según ocupación`}
            fuente="PostgreSQL · ocupación = bloques aprobados / bloques disponibles del espacio"
          >
            <TablaEspacios grupos={grupos} maximoOcupacion={maximoOcupacion} />
          </PanelGrafico>
        </div>

        {/* ================= GESTIÓN DE RESERVAS ================= */}
        <div className="ind-area">
          <h3 className="ind-area__titulo">Gestión de reservas</h3>

          <PanelGrafico
            id="titulo-tasas"
            titulo="Cancelaciones y rechazos"
            subtitulo="Tasas del período, escala de 0 a 100%"
            fuente="PostgreSQL"
            accion={
              <Link to="/admin/solicitudes" className="ind-pendientes" title="Ir a revisar las solicitudes">
                <span className="ind-pendientes__numero">{formatearNumero(totales.pendientesPorRevisar)}</span>
                <span className="ind-pendientes__texto">
                  solicitudes
                  <br />
                  por revisar <i className="bi bi-arrow-right" aria-hidden="true"></i>
                </span>
              </Link>
            }
          >
            <div className="ind-medidores">
              <MedidorTasa
                etiqueta="Tasa de cancelación"
                valor={totales.tasaCancelacion}
                variacion={previo && variacion(totales.tasaCancelacion, previo.tasaCancelacion, { enPuntos: true, subirEsBueno: false })}
                descripcion="sobre el total de reservas"
              />
              <MedidorTasa
                etiqueta="Tasa de rechazo"
                valor={totales.tasaRechazo}
                variacion={previo && variacion(totales.tasaRechazo, previo.tasaRechazo, { enPuntos: true, subirEsBueno: false })}
                descripcion="sobre las solicitudes revisadas"
              />
            </div>
          </PanelGrafico>

          <PanelGrafico id="titulo-estados" titulo="Reservas por estado" subtitulo="Distribución de las reservas del período" fuente="PostgreSQL · estado actual de cada reserva">
            <DonaEstados porEstado={totales.porEstado} total={totales.reservas} />
          </PanelGrafico>

          <PanelGrafico
            id="titulo-movimiento"
            titulo="Movimiento diario"
            subtitulo="Solicitudes creadas por día · detalle por evento en la tabla"
            fuente="MongoDB · colección eventos (bitácora del sistema)"
          >
            <LineaMovimiento dias={movimiento} alto={200} />
            <TablaMovimiento dias={movimiento} />
          </PanelGrafico>
        </div>
      </div>
    </div>
  )
}

export default PanelPage
