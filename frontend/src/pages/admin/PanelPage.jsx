import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import PanelGrafico from '../../components/indicadores/PanelGrafico.jsx'
import BarrasHorizontales from '../../components/indicadores/BarrasHorizontales.jsx'
import ColumnasHorario from '../../components/indicadores/ColumnasHorario.jsx'
import LineaMovimiento from '../../components/indicadores/LineaMovimiento.jsx'
import EstadosReservas from '../../components/indicadores/EstadosReservas.jsx'
import TablaEspacios from '../../components/indicadores/TablaEspacios.jsx'
import TablaMovimiento from '../../components/indicadores/TablaMovimiento.jsx'
import Variacion from '../../components/indicadores/Variacion.jsx'
import { calcularVariacion } from '../../components/indicadores/variacion.js'
import { LIMITE_MEDIA, bandaDe } from '../../components/indicadores/bandas.js'
import { descargarRankingCsv } from '../../components/indicadores/exportar.js'
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
const PERIODO_INICIAL = 30
const TOP = 10
const ULTIMOS = 5
// Línea de referencia en los gráficos de ocupación: bajo ella, la ocupación es "baja" (ver bandas.js)
const REFERENCIA_BAJA = { valor: LIMITE_MEDIA, etiqueta: `Línea dorada: límite de ocupación baja (${LIMITE_MEDIA}%)` }

// "2026-11-14" -> "14 nov 2026"
function fechaMedia(texto) {
  return aFecha(texto).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).replaceAll('.', '')
}

// Un período más largo no aporta nada si uno más corto ya cubre todos los días con datos:
// mostraría exactamente las mismas cifras. Devuelve las opciones con { redundante } marcado.
function marcarRedundantes(opciones, hoy, primeraReserva) {
  if (!primeraReserva) return opciones.map((o) => ({ ...o, redundante: false }))
  const diasConDatos = Math.round((aFecha(hoy) - aFecha(primeraReserva)) / 86_400_000) + 1
  const primeraQueCubre = opciones.find((o) => o.dias >= diasConDatos)
  return opciones.map((o) => ({ ...o, redundante: Boolean(primeraQueCubre) && o.dias > primeraQueCubre.dias }))
}

// Completa el movimiento diario con los días sin eventos (valen 0), para que la línea tenga todo el período
function completarDias(periodo, movimiento) {
  const porDia = new Map(movimiento.map((fila) => [fila.dia, fila]))
  // Empieza en el primer día con datos: antes no existía el sistema, y una línea en cero aparentaría que no hubo uso
  const inicio = periodo.datosDesde ?? periodo.desde
  const largo = Math.max(1, Math.round((aFecha(periodo.hasta) - aFecha(inicio)) / 86_400_000) + 1)
  return Array.from({ length: largo }, (_, i) => {
    const dia = sumarDias(inicio, i)
    return porDia.get(dia) ?? { dia, creadas: 0, aprobadas: 0, rechazadas: 0, canceladas: 0 }
  })
}

// Panel de indicadores de utilización (solo administración), organizado como un tablero institucional:
// dos grandes áreas lado a lado (utilización de espacios y gestión de reservas) con mosaicos de gráficos.
// Datos: GET /indicadores (consultas SQL agregadas; el movimiento diario viene de la bitácora de MongoDB).
// También se pide el período anterior de igual largo, solo para mostrar la variación de los indicadores clave.
function PanelPage() {
  const ahora = useAhora()
  // El período va en la URL (?periodo=7): se mantiene al recargar y se puede compartir el enlace
  const [parametros, setParametros] = useSearchParams()
  const pedido = Number(parametros.get('periodo'))
  const dias = PERIODOS.some((p) => p.dias === pedido) ? pedido : PERIODO_INICIAL
  function setDias(nuevo) {
    setParametros(
      (anteriores) => {
        const siguientes = new URLSearchParams(anteriores)
        if (nuevo === PERIODO_INICIAL) siguientes.delete('periodo')
        else siguientes.set('periodo', String(nuevo))
        return siguientes
      },
      { replace: true },
    )
  }
  const [verTodosLosEspacios, setVerTodosLosEspacios] = useState(false)
  const [verDetalleDiario, setVerDetalleDiario] = useState(false)

  // Al abrir el detalle, la página baja hasta él y el foco pasa a su título: si no, aparecería fuera de la vista.
  // Se hace en un efecto (después de que React lo dibuja) y solo cuando lo abrió el usuario.
  const enfocarDetalle = useRef(false)
  function abrirDetalleDiario() {
    enfocarDetalle.current = true
    setVerDetalleDiario(true)
  }
  useEffect(() => {
    if (!verDetalleDiario || !enfocarDetalle.current) return
    enfocarDetalle.current = false
    const titulo = document.getElementById('titulo-detalle-diario')
    if (!titulo) return
    titulo.setAttribute('tabindex', '-1')
    titulo.focus({ preventScroll: true })
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    titulo.closest('section')?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
  }, [verDetalleDiario])
  const hasta = fechaHoy(ahora)
  const desde = sumarDias(hasta, -(dias - 1))
  // Al cambiar de período se mantiene el panel anterior (atenuado) hasta que lleguen los datos nuevos
  const indicadores = useApi('/indicadores', { desde, hasta }, { mantenerAnteriores: true })
  const anterior = useApi('/indicadores', { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) })

  const datos = indicadores.datos
  const actualizando = indicadores.estado === 'cargando' && datos !== null
  // Solo se compara si el período anterior tuvo reservas: contra un período vacío, cualquier variación engaña
  const previo = anterior.datos?.periodo.dias === dias && anterior.datos.totales.reservas > 0 ? anterior.datos.totales : null

  if (!datos) return <EstadoCarga consulta={indicadores} texto="Calculando indicadores…" titulo="No se pudieron calcular los indicadores." />

  const { totales, periodo } = datos
  const ranking = datos.porEspacio.map((fila, i) => ({ ...fila, posicion: i + 1 }))
  // Vista resumida: los más y los menos utilizados. Vista completa: todos los espacios en orden.
  const hayOcultos = ranking.length > TOP + ULTIMOS
  const grupos = verTodosLosEspacios
    ? [{ clave: 'todos', titulo: 'Todos los espacios', filas: ranking }]
    : [
        { clave: 'mas', titulo: 'Más utilizados', filas: ranking.slice(0, TOP) },
        { clave: 'menos', titulo: 'Menos utilizados', filas: ranking.slice(Math.max(TOP, ranking.length - ULTIMOS)).reverse() },
      ].filter((grupo) => grupo.filas.length > 0)
  const menos = grupos.find((g) => g.clave === 'menos')?.filas.length ?? 0
  const subtituloRanking = verTodosLosEspacios
    ? `Los ${ranking.length} espacios activos, ordenados por ocupación`
    : `${Math.min(TOP, ranking.length)} más utilizados` +
      (menos > 0 ? ` y ${menos} menos utilizados` : '') +
      ` de ${ranking.length} espacios activos, ordenados por ocupación`
  const movimiento = completarDias(periodo, datos.movimientoDiario)
  const reservasAprobadas = datos.porBloque.reduce((suma, b) => suma + b.reservas, 0)
  const ejePorcentaje = (v) => `${formatearNumero(v)}%`

  const pendientes = totales.pendientesPorRevisar
  // Por qué no hay comparación: no es lo mismo "no hay datos" que "falló la consulta"
  const sinComparacion =
    anterior.estado === 'error'
      ? { texto: 'No se pudo cargar el período anterior.', reintentar: anterior.recargar }
      : anterior.estado === 'cargando'
        ? { texto: 'Cargando comparación…' }
        : { texto: 'Sin datos previos para comparar' }
  const opcionesPeriodo = marcarRedundantes(PERIODOS, hasta, periodo.primeraReserva)
  const variacionReservas = previo && calcularVariacion(totales.reservas, previo.reservas)
  const variacionOcupacion = previo && calcularVariacion(totales.ocupacionGeneral, previo.ocupacionGeneral, { enPuntos: true })

  return (
    <div className={`indicadores ${actualizando ? 'actualizando' : ''}`} aria-busy={actualizando}>
      {/* Barra superior: qué hay que atender ahora y cómo va el período, con el único filtro del tablero */}
      <div className="ind-barra">
        <div className="ind-barra__encabezado">
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
            {opcionesPeriodo.map((opcion) => (
              <button
                key={opcion.dias}
                type="button"
                className={`btn ${dias === opcion.dias ? 'btn-primary' : 'btn-outline-secondary'}`}
                aria-pressed={dias === opcion.dias}
                // un período que repetiría las mismas cifras se deshabilita (salvo que ya esté elegido)
                disabled={opcion.redundante && dias !== opcion.dias}
                aria-describedby={opcion.redundante ? 'aviso-datos-desde' : undefined}
                onClick={() => setDias(opcion.dias)}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
          {actualizando && <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-label="Actualizando"></span>}
          {periodo.primeraReserva && periodo.primeraReserva > sumarDias(hasta, -(Math.max(...PERIODOS.map((p) => p.dias)) - 1)) && (
            <p className="ind-filtro__aviso" id="aviso-datos-desde">
              <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
              Hay datos desde el {fechaMedia(periodo.primeraReserva)}
              {opcionesPeriodo.some((o) => o.redundante) && ': los períodos más largos mostrarían lo mismo.'}
            </p>
          )}
        </div>

        <div className="ind-resumen">
          {/* La única acción del tablero va primero. No depende del período: son las pendientes desde hoy. */}
          <Link
            to="/admin/solicitudes"
            className={`ind-accion ${pendientes === 0 ? 'ind-accion--al-dia' : ''}`}
          >
            <span className="ind-accion__numero">{formatearNumero(pendientes)}</span>
            <span className="ind-accion__texto">
              <span className="ind-accion__titulo">
                {pendientes === 1 ? 'solicitud por revisar' : 'solicitudes por revisar'}
              </span>
              <span className="ind-accion__nota">
                {pendientes === 0 ? 'Todo al día' : 'Desde hoy en adelante, sin importar el período'}
              </span>
            </span>
            {pendientes > 0 && <i className="bi bi-arrow-right ind-accion__flecha" aria-hidden="true"></i>}
          </Link>

          <dl className="ind-cifras">
            <div className="ind-cifras__item">
              <dt>Reservas en el período</dt>
              <dd>
                <span className="ind-cifras__valor">{formatearNumero(totales.reservas)}</span>
                <Variacion cambio={variacionReservas} dias={dias} sinComparacion={sinComparacion} className="ind-cifras__detalle" />
              </dd>
            </div>
            <div className="ind-cifras__item">
              <dt>Ocupación en días hábiles</dt>
              <dd>
                <span className="ind-cifras__valor">
                  {formatearPorcentaje(totales.ocupacionGeneral)}
                  <span className={`ind-chip-banda ind-banda--${bandaDe(totales.ocupacionGeneral).clave}`}>
                    {bandaDe(totales.ocupacionGeneral).nombre}
                  </span>
                </span>
                <Variacion cambio={variacionOcupacion} dias={dias} sinComparacion={sinComparacion} className="ind-cifras__detalle" />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="ind-tablero">
        {/* ================= UTILIZACIÓN DE ESPACIOS ================= */}
        <div className="ind-area">
          <div>
            <h3 className="ind-area__titulo">Utilización de espacios</h3>
            {/* Una sola definición para toda el área, en vez de repetirla en cada tarjeta */}
            <p className="ind-area__nota">
              Todo en esta sección cuenta reservas aprobadas de lunes a viernes. Ocupación = % de las horas disponibles
              (13 bloques por día y espacio) que tuvieron reserva.
            </p>
          </div>

          <PanelGrafico
            id="titulo-por-bloque"
            titulo="Demanda por horario"
            subtitulo={`Reservas por hora de inicio · ${formatearNumero(reservasAprobadas)} en el período`}
          >
            <ColumnasHorario datos={datos.porBloque} alto={250} />
          </PanelGrafico>

          <div className="ind-mosaicos ind-mosaicos--mitades">
            <PanelGrafico id="titulo-por-tipo" titulo="Ocupación por tipo de espacio">
              <BarrasHorizontales
                descripcion="Ocupación por tipo de espacio"
                formatoEje={ejePorcentaje}
                marcasEje={3}
                referencia={REFERENCIA_BAJA}
                filas={datos.porTipo.map((f) => ({
                  clave: f.nombre,
                  nombre: f.nombre,
                  valor: f.ocupacion,
                  etiqueta: formatearPorcentaje(f.ocupacion),
                }))}
              />
            </PanelGrafico>
            <PanelGrafico id="titulo-por-edificio" titulo="Ocupación por edificio">
              <BarrasHorizontales
                descripcion="Ocupación por edificio"
                formatoEje={ejePorcentaje}
                marcasEje={3}
                referencia={REFERENCIA_BAJA}
                filas={datos.porEdificio.map((f) => ({
                  clave: f.nombre,
                  nombre: `Edificio ${f.nombre}`,
                  valor: f.ocupacion,
                  etiqueta: formatearPorcentaje(f.ocupacion),
                  complemento: `${f.espacios} espacios · ${formatearNumero(f.reservasHabiles)} reservas`,
                }))}
              />
            </PanelGrafico>
          </div>
        </div>

        {/* ================= GESTIÓN DE RESERVAS ================= */}
        <div className="ind-area">
          <h3 className="ind-area__titulo">Gestión de reservas</h3>

          <PanelGrafico
            id="titulo-estados"
            titulo="Estado de las reservas"
            subtitulo={`${formatearNumero(totales.reservas)} reservas con fecha en el período (incluye fines de semana), según su estado actual`}
          >
            <EstadosReservas
              porEstado={totales.porEstado}
              porRevisar={pendientes}
              dias={dias}
              total={totales.reservas}
              tasas={[
                {
                  clave: 'cancelacion',
                  etiqueta: 'Tasa de cancelación',
                  valor: totales.tasaCancelacion,
                  descripcion: 'sobre el total de reservas',
                  variacion: previo && calcularVariacion(totales.tasaCancelacion, previo.tasaCancelacion, { enPuntos: true, subirEsBueno: false }),
                },
                {
                  clave: 'rechazo',
                  etiqueta: 'Tasa de rechazo',
                  valor: totales.tasaRechazo,
                  descripcion: 'sobre las solicitudes revisadas',
                  variacion: previo && calcularVariacion(totales.tasaRechazo, previo.tasaRechazo, { enPuntos: true, subirEsBueno: false }),
                },
              ]}
            />
          </PanelGrafico>

          <PanelGrafico id="titulo-movimiento" titulo="Movimiento diario" subtitulo="Solicitudes creadas por día">
            <LineaMovimiento dias={movimiento} alto={200} diaEnCurso={hasta} />
            <button
              type="button"
              className="ind-detalle"
              aria-expanded={verDetalleDiario}
              aria-controls="detalle-diario"
              onClick={() => (verDetalleDiario ? setVerDetalleDiario(false) : abrirDetalleDiario())}
            >
              <i className={`bi ${verDetalleDiario ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
              {verDetalleDiario ? 'Ocultar detalle por día' : 'Ver detalle por día'}
            </button>
          </PanelGrafico>
        </div>

        {/* ================= DETALLE POR DÍA =================
            Se abre a todo el ancho, bajo el tablero: es largo (una fila por día) y dentro de una columna
            dejaba un hueco grande en la otra */}
        {verDetalleDiario && (
          <div className="ind-area ind-area--ancha" id="detalle-diario">
            <PanelGrafico
              id="titulo-detalle-diario"
              nivel={3}
              titulo="Detalle por día"
              subtitulo="Movimiento diario de la bitácora, del día más reciente al más antiguo"
              accion={
                <button type="button" className="ind-detalle ind-detalle--cerrar" onClick={() => setVerDetalleDiario(false)}>
                  <i className="bi bi-x-lg" aria-hidden="true"></i>
                  Cerrar
                </button>
              }
            >
              <TablaMovimiento dias={movimiento} />
            </PanelGrafico>
          </div>
        )}

        {/* ================= DETALLE POR ESPACIO =================
            A todo el ancho y al final: es la pieza más larga, y dentro de una columna desbalanceaba el tablero */}
        <div className="ind-area ind-area--ancha">
          <PanelGrafico
            id="titulo-ranking"
            nivel={3}
            titulo="Ranking de espacios"
            subtitulo={subtituloRanking}
            accion={
              <div className="ind-acciones-ranking">
                {(hayOcultos || verTodosLosEspacios) && (
                  <button type="button" className="ind-detalle" aria-pressed={verTodosLosEspacios} onClick={() => setVerTodosLosEspacios((v) => !v)}>
                    <i className={`bi ${verTodosLosEspacios ? 'bi-list-ol' : 'bi-list-ul'}`} aria-hidden="true"></i>
                    {verTodosLosEspacios ? 'Ver resumen' : `Ver los ${ranking.length} espacios`}
                  </button>
                )}
                <button type="button" className="ind-detalle" onClick={() => descargarRankingCsv(ranking, periodo)}>
                  <i className="bi bi-download" aria-hidden="true"></i>
                  Exportar CSV
                </button>
              </div>
            }
          >
            <TablaEspacios grupos={grupos} />
          </PanelGrafico>
        </div>
      </div>
    </div>
  )
}

export default PanelPage
